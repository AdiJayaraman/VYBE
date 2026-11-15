import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  cloneTemplateScene,
  generateDeterministicLayout,
  getRoomTemplate,
  sanitizeGeneratedProps,
} from '@vybe/3d-core';
import {
  ScenePropSchema,
  type GenerateRoomLayoutDto,
  type RoomLayoutSuggestion,
  type SceneProp,
} from '@vybe/shared-types';
import { z } from 'zod';

/**
 * Gemini 2.x is retired for new API keys, and the 3.8 thinking models take 60s+
 * for structured output. 3.1 Flash Lite with thinking disabled answers in ~1s.
 */
const MODEL_ID = 'gemini-3.1-flash-lite';
const GEMINI_TIMEOUT_MS = 25_000;
const PropArraySchema = z.array(ScenePropSchema).min(1).max(64);

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | null {
    const key = this.config.get<string>('GEMINI_API_KEY');
    return key && key.trim().length > 0 ? key.trim() : null;
  }

  async generateRoomLayout(dto: GenerateRoomLayoutDto): Promise<RoomLayoutSuggestion> {
    const fallback = generateDeterministicLayout(dto.prompt, dto.templateId);
    const apiKey = this.apiKey;

    if (!apiKey) {
      return {
        templateId: fallback.templateId,
        themeTag: fallback.themeTag,
        summary: `${fallback.summary} (deterministic fallback — set GEMINI_API_KEY for model-generated layouts)`,
        source: 'fallback',
        props: fallback.props,
      };
    }

    try {
      const template = getRoomTemplate(fallback.templateId);
      const prompt = [
        'You are VYBE\'s 3D room architect. Convert the user request into furniture props.',
        `Allowed modelType values: sofa, neon_sign, arcade, table, portal.`,
        `Room bounds: x ${template.bounds.minX}..${template.bounds.maxX}, z ${template.bounds.minZ}..${template.bounds.maxZ}. Keep props inside.`,
        'Return ONLY a JSON object with this exact shape:',
        '{"themeTag": "UPPERCASE THEME", "summary": "one sentence", "props": [{"id": "string", "modelType": "sofa", "position": [x, y, z], "rotation": [0, yaw, 0], "scale": [x, y, z], "color": "#RRGGBB"}]}',
        'Between 6 and 18 props. Group similar props into a coherent layout. No markdown, no explanation.',
        `User request: ${dto.prompt}`,
      ].join('\n');

      const result = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.9,
              // Structured output does not benefit from reasoning tokens here.
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      );

      if (!result.ok) {
        const failure = (await result.json().catch(() => null)) as GeminiResponse | null;
        throw new Error(`Gemini HTTP ${result.status}: ${failure?.error?.message ?? 'request failed'}`);
      }

      const payload = (await result.json()) as GeminiResponse;
      const raw = (payload.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('');
      const parsedJson: unknown = JSON.parse(raw);

      const envelope = z
        .object({
          themeTag: z.string().min(2).max(24).optional(),
          summary: z.string().min(1).max(240).optional(),
          props: PropArraySchema,
        })
        .safeParse(parsedJson);

      if (!envelope.success) {
        throw new Error('Model returned a payload outside the SceneProp contract');
      }

      const props: SceneProp[] = sanitizeGeneratedProps(envelope.data.props, fallback.templateId);

      return {
        templateId: fallback.templateId,
        themeTag: envelope.data.themeTag ?? fallback.themeTag,
        summary: envelope.data.summary ?? fallback.summary,
        source: 'gemini',
        props: props.length > 0 ? props : cloneTemplateScene(fallback.templateId),
      };
    } catch (error: unknown) {
      this.logger.warn(`Gemini layout generation failed, using fallback: ${String(error)}`);
      return {
        templateId: fallback.templateId,
        themeTag: fallback.themeTag,
        summary: `${fallback.summary} (Gemini unavailable — deterministic fallback)`,
        source: 'fallback',
        props: fallback.props,
      };
    }
  }
}
