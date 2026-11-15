import { ACCESSORY_IDS, HAIR_STYLE_IDS, SKIN_TONES, type AvatarConfig } from '@vybe/shared-types';
import { DEFAULT_AVATAR_CONFIG } from '@vybe/shared-types';

export interface AvatarPreset {
  id: string;
  label: string;
  config: AvatarConfig;
}

/** Curated starting points for the Avatar Studio. */
export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  {
    id: 'neon_runner',
    label: 'Neon Runner',
    config: {
      ...DEFAULT_AVATAR_CONFIG,
      skinTone: 'bronze',
      hairStyleId: 'locs',
      hairColor: '#1E1B4B',
      topId: 'tech_jacket',
      topColor: '#7C3AED',
      bottomId: 'tech_pants',
      bottomColor: '#0F1629',
      shoesId: 'hightops',
      accessoryId: 'visor',
      accessoryColor: '#06B6D4',
    },
  },
  {
    id: 'cyber_scholar',
    label: 'Cyber Scholar',
    config: {
      ...DEFAULT_AVATAR_CONFIG,
      skinTone: 'porcelain',
      hairStyleId: 'bob',
      hairColor: '#F472B6',
      topId: 'hoodie',
      topColor: '#0F1629',
      bottomId: 'skirt',
      bottomColor: '#312E81',
      shoesId: 'sneakers',
      accessoryId: 'earpiece',
      accessoryColor: '#22D3EE',
    },
  },
  {
    id: 'plaza_creator',
    label: 'Plaza Creator',
    config: {
      ...DEFAULT_AVATAR_CONFIG,
      skinTone: 'umber',
      hairStyleId: 'mohawk',
      hairColor: '#F59E0B',
      topId: 'bomber',
      topColor: '#06B6D4',
      bottomId: 'joggers',
      bottomColor: '#0B1120',
      shoesId: 'boots',
      accessoryId: 'halo',
      accessoryColor: '#7C3AED',
    },
  },
  {
    id: 'midnight_dj',
    label: 'Midnight DJ',
    config: {
      ...DEFAULT_AVATAR_CONFIG,
      skinTone: 'obsidian',
      hairStyleId: 'buzz',
      hairColor: '#0B1120',
      topId: 'tank',
      topColor: '#A855F7',
      bottomId: 'shorts',
      bottomColor: '#0F1629',
      shoesId: 'sneakers',
      accessoryId: 'wings',
      accessoryColor: '#A3E635',
    },
  },
] as const;

export const AVATAR_SURFACE_COLORS: Readonly<Record<(typeof SKIN_TONES)[number], string>> = {
  porcelain: '#F5D6C6',
  sand: '#E8C39E',
  honey: '#C98D63',
  bronze: '#A2643F',
  umber: '#6E4228',
  obsidian: '#3B2418',
};

export const HAIR_STYLE_LABELS: Readonly<Record<(typeof HAIR_STYLE_IDS)[number], string>> = {
  buzz: 'Buzz',
  shag: 'Shag',
  bob: 'Bob',
  ponytail: 'Ponytail',
  locs: 'Locs',
  mohawk: 'Mohawk',
  none: 'Bald',
};

export const ACCESSORY_LABELS: Readonly<Record<(typeof ACCESSORY_IDS)[number], string>> = {
  none: 'None',
  visor: 'Neon Visor',
  halo: 'Halo Ring',
  earpiece: 'Earpiece',
  wings: 'Holo Wings',
};

export const HAIR_COLOR_SWATCHES = [
  '#0F172A',
  '#1E1B4B',
  '#4C1D95',
  '#7C3AED',
  '#F472B6',
  '#F59E0B',
  '#A3E635',
  '#06B6D4',
] as const;

export const OUTFIT_COLOR_SWATCHES = [
  '#7C3AED',
  '#06B6D4',
  '#0F1629',
  '#312E81',
  '#A855F7',
  '#22D3EE',
  '#F8FAFC',
  '#F59E0B',
] as const;

export const TOP_LABELS = {
  hoodie: 'Hoodie',
  bomber: 'Bomber',
  tank: 'Tank',
  cropped_hoodie: 'Cropped Hoodie',
  tech_jacket: 'Tech Jacket',
} as const;

export const BOTTOM_LABELS = {
  cargo_pants: 'Cargo Pants',
  joggers: 'Joggers',
  shorts: 'Shorts',
  skirt: 'Skirt',
  tech_pants: 'Tech Pants',
} as const;

export const SHOES_LABELS = {
  sneakers: 'Sneakers',
  boots: 'Boots',
  hightops: 'High Tops',
  none: 'Barefoot',
} as const;

export const SKIN_TONE_LABELS = {
  porcelain: 'Porcelain',
  sand: 'Sand',
  honey: 'Honey',
  bronze: 'Bronze',
  umber: 'Umber',
  obsidian: 'Obsidian',
} as const;

export const AVATAR_HEIGHT_UNITS = 1.8;

export function getAvatarPreset(id: string): AvatarPreset {
  return AVATAR_PRESETS.find((preset) => preset.id === id) ?? AVATAR_PRESETS[0]!;
}
