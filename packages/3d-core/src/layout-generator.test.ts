import { describe, expect, it } from 'vitest';
import { ScenePropSchema } from '@vybe/shared-types';
import { generateDeterministicLayout, sanitizeGeneratedProps } from './layout-generator.js';
import {
  STARTER_ROOM_TEMPLATES,
  cloneTemplateScene,
  getRoomTemplate,
} from './room-templates.js';

const PROMPT = 'Cyberpunk lo-fi chill lounge with neon sofas and an arcade corner';

describe('room templates', () => {
  it('exposes the three starter templates', () => {
    expect(STARTER_ROOM_TEMPLATES.map((template) => template.templateId)).toEqual([
      'cyber_lounge_v1',
      'neon_rooftop_v1',
      'arcade_hub_v1',
    ]);
  });

  it('every template prop satisfies the shared SceneProp contract', () => {
    for (const template of STARTER_ROOM_TEMPLATES) {
      expect(template.sceneGraph.length).toBeGreaterThan(0);
      for (const sceneProp of template.sceneGraph) {
        expect(ScenePropSchema.safeParse(sceneProp).success).toBe(true);
      }
    }
  });

  it('clones scenes without sharing tuple references', () => {
    const first = cloneTemplateScene('cyber_lounge_v1');
    const second = cloneTemplateScene('cyber_lounge_v1');
    const firstProp = first[0];
    const secondProp = second[0];
    expect(firstProp).toBeDefined();
    expect(secondProp).toBeDefined();
    if (!firstProp || !secondProp) return;

    firstProp.position[0] = 999;
    expect(secondProp.position[0]).not.toBe(999);
  });

  it('falls back to the first template for unknown ids', () => {
    expect(getRoomTemplate('does-not-exist').templateId).toBe('cyber_lounge_v1');
  });
});

describe('generateDeterministicLayout', () => {
  it('produces valid, in-bounds props deterministically', () => {
    const first = generateDeterministicLayout(PROMPT);
    const second = generateDeterministicLayout(PROMPT);

    expect(first).toEqual(second);
    expect(first.props.length).toBeGreaterThanOrEqual(6);

    const bounds = getRoomTemplate(first.templateId).bounds;
    for (const sceneProp of first.props) {
      expect(ScenePropSchema.safeParse(sceneProp).success).toBe(true);
      expect(sceneProp.position[0]).toBeGreaterThanOrEqual(bounds.minX);
      expect(sceneProp.position[0]).toBeLessThanOrEqual(bounds.maxX);
      expect(sceneProp.position[2]).toBeGreaterThanOrEqual(bounds.minZ);
      expect(sceneProp.position[2]).toBeLessThanOrEqual(bounds.maxZ);
    }
  });

  it('maps prompt keywords to model types', () => {
    const arcade = generateDeterministicLayout('retro arcade hall with game cabinets');
    expect(arcade.templateId).toBe('arcade_hub_v1');
    expect(arcade.props.some((sceneProp) => sceneProp.modelType === 'arcade')).toBe(true);

    const rooftop = generateDeterministicLayout('open rooftop above the city with neon signs');
    expect(rooftop.templateId).toBe('neon_rooftop_v1');
  });

  it('honours an explicit preferred template', () => {
    const layout = generateDeterministicLayout('a quiet reading corner', 'neon_rooftop_v1');
    expect(layout.templateId).toBe('neon_rooftop_v1');
  });
});

describe('sanitizeGeneratedProps', () => {
  it('clamps out-of-bounds positions and extreme scales', () => {
    const sanitized = sanitizeGeneratedProps(
      [
        {
          id: 'wild',
          modelType: 'sofa',
          position: [500, -4, -500],
          rotation: [0, 0, 0],
          scale: [50, 0.01, 50],
          color: '#7C3AED',
        },
      ],
      'cyber_lounge_v1',
    );

    const first = sanitized[0];
    expect(first).toBeDefined();
    if (!first) return;

    const bounds = getRoomTemplate('cyber_lounge_v1').bounds;
    expect(first.position[0]).toBeLessThanOrEqual(bounds.maxX);
    expect(first.position[2]).toBeGreaterThanOrEqual(bounds.minZ);
    expect(first.position[1]).toBeGreaterThanOrEqual(0);
    expect(first.scale[0]).toBeLessThanOrEqual(6);
    expect(first.scale[1]).toBeGreaterThanOrEqual(0.2);
  });

  it('caps the number of props', () => {
    const many = Array.from({ length: 100 }, (_value, index) => ({
      id: `p-${index}`,
      modelType: 'table' as const,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      color: '#06B6D4',
    }));
    expect(sanitizeGeneratedProps(many, 'cyber_lounge_v1')).toHaveLength(64);
  });
});
