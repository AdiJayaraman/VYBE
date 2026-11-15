import type { ModelType, SceneProp } from '@vybe/shared-types';
import { cloneTemplateScene, getRoomTemplate } from './room-templates';
import type { Vec3 } from './math';

export interface LayoutRecipe {
  templateId: string;
  themeTag: string;
  summary: string;
  props: SceneProp[];
}

interface KeywordRule {
  keywords: readonly string[];
  modelType: ModelType;
  color: string;
  /** `ring` places props around the centre, `wall` along the back wall, `cluster` near the middle. */
  placement: 'ring' | 'wall' | 'cluster';
  scale?: Vec3;
}

const KEYWORD_RULES: readonly KeywordRule[] = [
  { keywords: ['sofa', 'couch', 'lounge', 'chill', 'lofi', 'lo-fi'], modelType: 'sofa', color: '#7C3AED', placement: 'ring', scale: [2.2, 1, 1] },
  { keywords: ['arcade', 'gaming', 'game', 'retro', 'cabinet'], modelType: 'arcade', color: '#F472B6', placement: 'wall' },
  { keywords: ['neon', 'sign', 'cyberpunk', 'cyber', 'synth'], modelType: 'neon_sign', color: '#06B6D4', placement: 'wall', scale: [2, 1, 1] },
  { keywords: ['table', 'desk', 'coffee', 'work'], modelType: 'table', color: '#0F1629', placement: 'cluster', scale: [1.6, 1, 1.6] },
  { keywords: ['portal', 'teleport', 'spawn', 'gate'], modelType: 'portal', color: '#22D3EE', placement: 'ring', scale: [1.3, 1.3, 1.3] },
];

const THEME_TAG_RULES: readonly { keywords: readonly string[]; tag: string; templateId: string }[] = [
  { keywords: ['arcade', 'game', 'retro'], tag: 'ARCADE HUB', templateId: 'arcade_hub_v1' },
  { keywords: ['rooftop', 'sky', 'city', 'open air'], tag: 'NEON ROOFTOP', templateId: 'neon_rooftop_v1' },
  { keywords: ['lounge', 'chill', 'lofi', 'lo-fi', 'cafe'], tag: 'CYBER LOUNGE', templateId: 'cyber_lounge_v1' },
];

function detectTemplate(prompt: string, fallbackTemplateId: string): { templateId: string; themeTag: string } {
  const normalized = prompt.toLowerCase();
  for (const rule of THEME_TAG_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return { templateId: rule.templateId, themeTag: rule.tag };
    }
  }
  const template = getRoomTemplate(fallbackTemplateId);
  return { templateId: template.templateId, themeTag: template.themeTag };
}

/**
 * Deterministic NLP -> SceneProp[] fallback used when `GEMINI_API_KEY` is absent
 * (and as the safety net when the model returns malformed JSON).
 *
 * The result always respects the shared `SceneProp` contract, so it can be
 * persisted straight into `Room.sceneGraph`.
 */
export function generateDeterministicLayout(prompt: string, preferredTemplateId?: string): LayoutRecipe {
  const fallbackTemplateId = preferredTemplateId ?? 'cyber_lounge_v1';
  const { templateId, themeTag } = detectTemplate(prompt, fallbackTemplateId);
  const normalized = prompt.toLowerCase();
  const template = getRoomTemplate(templateId);

  const matched = KEYWORD_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );
  const activeRules = matched.length > 0 ? matched : KEYWORD_RULES.slice(0, 3);

  const props: SceneProp[] = cloneTemplateScene(templateId);
  const radius = 7;
  let ringIndex = 0;
  let wallIndex = 0;
  let clusterIndex = 0;

  for (const rule of activeRules) {
    const count = rule.placement === 'wall' ? 3 : rule.placement === 'ring' ? 2 : 1;
    for (let index = 0; index < count; index += 1) {
      let position: Vec3;
      if (rule.placement === 'ring') {
        const angle = (Math.PI * 2 * (ringIndex + 0.5)) / Math.max(activeRules.length * 2, 4);
        position = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
        ringIndex += 1;
      } else if (rule.placement === 'wall') {
        position = [-10 + wallIndex * 5, rule.modelType === 'neon_sign' ? 2.6 : 0, -13];
        wallIndex += 1;
      } else {
        position = [2 + clusterIndex * 3, 0, 3];
        clusterIndex += 1;
      }

      props.push({
        id: `${rule.modelType}-${templateId}-${index}-${props.length}`,
        modelType: rule.modelType,
        position: [
          Number(position[0].toFixed(2)),
          Number(position[1].toFixed(2)),
          Number(position[2].toFixed(2)),
        ],
        rotation: [0, Number((Math.atan2(position[0], position[2]) + Math.PI).toFixed(3)), 0],
        scale: rule.scale ?? [1, 1, 1],
        color: rule.color,
      });
    }
  }

  const summaryParts = activeRules.map((rule) => rule.modelType.replace('_', ' '));
  return {
    templateId,
    themeTag,
    summary: `${themeTag} layout with ${props.length} props: ${summaryParts.join(', ')}.`,
    props: props.slice(0, 64),
  };
}

/** Validate + clamp arbitrary model output into a safe `SceneProp[]`. */
export function sanitizeGeneratedProps(candidate: readonly SceneProp[], templateId: string): SceneProp[] {
  const bounds = getRoomTemplate(templateId).bounds;
  return candidate.slice(0, 64).map((sceneProp, index) => ({
    ...sceneProp,
    id: sceneProp.id.slice(0, 64) || `generated-${index}`,
    position: [
      Math.min(Math.max(sceneProp.position[0], bounds.minX), bounds.maxX),
      Math.max(sceneProp.position[1], 0),
      Math.min(Math.max(sceneProp.position[2], bounds.minZ), bounds.maxZ),
    ],
    rotation: sceneProp.rotation,
    scale: [
      Math.min(Math.max(sceneProp.scale[0], 0.2), 6),
      Math.min(Math.max(sceneProp.scale[1], 0.2), 6),
      Math.min(Math.max(sceneProp.scale[2], 0.2), 6),
    ],
  }));
}
