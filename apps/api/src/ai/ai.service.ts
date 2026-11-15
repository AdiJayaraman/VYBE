import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

const MODEL_ID = 'gemini-2.0-flash';
const PropArraySchema = z.array(ScenePropSchema).min(1).max(64);

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
      const client = new GoogleGenerativeAI(apiKey);
      const model = client.getGenerativeModel({
        model: MODEL_ID,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.9,
        },
      });

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

      const result = await model.generateContent(prompt);
      const raw = result.response.text();
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
