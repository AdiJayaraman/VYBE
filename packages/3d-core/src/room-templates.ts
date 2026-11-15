import type { RoomTemplateId, SceneProp } from '@vybe/shared-types';
import { DEFAULT_ROOM_BOUNDS, DEFAULT_SPAWN_POSITION } from './constants';
import type { RoomBounds, Vec3 } from './math';

export interface RoomTemplate {
  templateId: RoomTemplateId;
  name: string;
  themeTag: string;
  description: string;
  spawnPoint: Vec3;
  bounds: RoomBounds;
  sceneGraph: SceneProp[];
  environment: {
    floorColor: string;
    gridColor: string;
    fogColor: string;
    ambientColor: string;
    accentColor: string;
  };
}

let propCounter = 0;

function prop(
  modelType: SceneProp['modelType'],
  position: Vec3,
  options: { rotationY?: number; scale?: Vec3; color: string; id?: string },
): SceneProp {
  propCounter += 1;
  const scale = options.scale ?? [1, 1, 1];
  return {
    id: options.id ?? `${modelType}-${propCounter}`,
    modelType,
    position,
    rotation: [0, options.rotationY ?? 0, 0],
    scale,
    color: options.color,
  };
}

/** Cyber lo-fi lounge: neon sofas, low tables and a portal ring. */
const cyberLounge: RoomTemplate = {
  templateId: 'cyber_lounge_v1',
  name: 'Cyber Lounge',
  themeTag: 'CYBER LOUNGE',
  description: 'Lo-fi synth lounge with violet sofas and a pulsing portal ring.',
  spawnPoint: DEFAULT_SPAWN_POSITION,
  bounds: DEFAULT_ROOM_BOUNDS,
  environment: {
    floorColor: '#080D1C',
    gridColor: '#1E293B',
    fogColor: '#070B19',
    ambientColor: '#312E81',
    accentColor: '#7C3AED',
  },
  sceneGraph: [
    prop('sofa', [-5, 0, -3], { rotationY: 0, scale: [2.4, 1, 1], color: '#7C3AED', id: 'lounge-sofa-left' }),
    prop('sofa', [5, 0, -3], { rotationY: 0, scale: [2.4, 1, 1], color: '#6D28D9', id: 'lounge-sofa-right' }),
    prop('table', [0, 0, -3], { scale: [1.6, 1, 1.6], color: '#0F1629', id: 'lounge-table' }),
    prop('neon_sign', [0, 3.4, -12], { color: '#06B6D4', scale: [2, 1, 1], id: 'lounge-sign' }),
    prop('arcade', [-10, 0, -8], { rotationY: 0.4, color: '#A855F7', id: 'lounge-arcade' }),
    prop('portal', [9, 0, -9], { color: '#06B6D4', scale: [1.4, 1.4, 1.4], id: 'lounge-portal' }),
    prop('neon_sign', [-12, 2.6, 2], { rotationY: 1.57, color: '#F472B6', id: 'lounge-pillar-left' }),
    prop('neon_sign', [12, 2.6, 2], { rotationY: -1.57, color: '#F472B6', id: 'lounge-pillar-right' }),
  ],
};

/** Open-air rooftop with skyline neon and a central holo table. */
const neonRooftop: RoomTemplate = {
  templateId: 'neon_rooftop_v1',
  name: 'Neon Rooftop',
  themeTag: 'NEON ROOFTOP',
  description: 'Open-air rooftop above the city grid. Cyan neon rim lighting.',
  spawnPoint: [0, 0, 8],
  bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 },
  environment: {
    floorColor: '#050A16',
    gridColor: '#0E7490',
    fogColor: '#04101C',
    ambientColor: '#0E7490',
    accentColor: '#06B6D4',
  },
  sceneGraph: [
    prop('neon_sign', [0, 1.2, -18], { color: '#06B6D4', scale: [6, 1.4, 1], id: 'rooftop-skyline' }),
    prop('table', [0, 0, 0], { scale: [2, 1, 2], color: '#0F1629', id: 'rooftop-holo-table' }),
    prop('sofa', [-6, 0, 2], { rotationY: 0.5, scale: [2, 1, 1], color: '#06B6D4', id: 'rooftop-sofa-a' }),
    prop('sofa', [6, 0, 2], { rotationY: -0.5, scale: [2, 1, 1], color: '#0891B2', id: 'rooftop-sofa-b' }),
    prop('arcade', [-14, 0, -10], { rotationY: 0.8, color: '#7C3AED', id: 'rooftop-arcade' }),
    prop('portal', [14, 0, -12], { color: '#7C3AED', scale: [1.6, 1.6, 1.6], id: 'rooftop-portal' }),
    prop('neon_sign', [-16, 3, 8], { rotationY: 1.57, color: '#A855F7', id: 'rooftop-beacon-left' }),
    prop('neon_sign', [16, 3, 8], { rotationY: -1.57, color: '#A855F7', id: 'rooftop-beacon-right' }),
  ],
};

/** Retro arcade hall with cabinet walls and a dance floor. */
const arcadeHub: RoomTemplate = {
  templateId: 'arcade_hub_v1',
  name: 'Arcade Hub',
  themeTag: 'ARCADE HUB',
  description: 'Wall-to-wall cabinets, magenta neon and a chrome dance floor.',
  spawnPoint: [0, 0, 10],
  bounds: { minX: -16, maxX: 16, minZ: -16, maxZ: 16 },
  environment: {
    floorColor: '#0A0718',
    gridColor: '#3B0764',
    fogColor: '#0B0719',
    ambientColor: '#581C87',
    accentColor: '#F472B6',
  },
  sceneGraph: [
    prop('arcade', [-8, 0, -12], { color: '#F472B6', id: 'arcade-cabinet-1' }),
    prop('arcade', [-4, 0, -12], { color: '#A855F7', id: 'arcade-cabinet-2' }),
    prop('arcade', [4, 0, -12], { color: '#7C3AED', id: 'arcade-cabinet-3' }),
    prop('arcade', [8, 0, -12], { color: '#F472B6', id: 'arcade-cabinet-4' }),
    prop('neon_sign', [0, 3.2, -14], { color: '#F59E0B', scale: [3, 1, 1], id: 'arcade-marquee' }),
    prop('table', [-9, 0, 4], { scale: [1.4, 1, 1.4], color: '#1E1B4B', id: 'arcade-table-left' }),
    prop('table', [9, 0, 4], { scale: [1.4, 1, 1.4], color: '#1E1B4B', id: 'arcade-table-right' }),
    prop('sofa', [0, 0, 8], { scale: [2.6, 1, 1], color: '#7C3AED', id: 'arcade-lounge-sofa' }),
    prop('portal', [0, 0, -6], { color: '#06B6D4', scale: [1.2, 1.2, 1.2], id: 'arcade-portal' }),
  ],
};

export const STARTER_ROOM_TEMPLATES: readonly RoomTemplate[] = [cyberLounge, neonRooftop, arcadeHub];

export function getRoomTemplate(templateId: string): RoomTemplate {
  return (
    STARTER_ROOM_TEMPLATES.find((template) => template.templateId === templateId) ??
    STARTER_ROOM_TEMPLATES[0]!
  );
}

/** Fresh copies so callers can mutate a room's scene without touching the template. */
export function cloneTemplateScene(templateId: string): SceneProp[] {
  return getRoomTemplate(templateId).sceneGraph.map((sceneProp) => ({
    ...sceneProp,
    position: [...sceneProp.position] as Vec3,
    rotation: [...sceneProp.rotation] as Vec3,
    scale: [...sceneProp.scale] as Vec3,
  }));
}
