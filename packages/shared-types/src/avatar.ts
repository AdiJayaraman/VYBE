import { z } from 'zod';

export const SKIN_TONES = ['porcelain', 'sand', 'honey', 'bronze', 'umber', 'obsidian'] as const;
export const SkinToneSchema = z.enum(SKIN_TONES);

export const HAIR_STYLE_IDS = ['buzz', 'shag', 'bob', 'ponytail', 'locs', 'mohawk', 'none'] as const;
export const HairStyleIdSchema = z.enum(HAIR_STYLE_IDS);

export const TOP_IDS = ['hoodie', 'bomber', 'tank', 'cropped_hoodie', 'tech_jacket'] as const;
export const TopIdSchema = z.enum(TOP_IDS);

export const BOTTOM_IDS = ['cargo_pants', 'joggers', 'shorts', 'skirt', 'tech_pants'] as const;
export const BottomIdSchema = z.enum(BOTTOM_IDS);

export const SHOES_IDS = ['sneakers', 'boots', 'hightops', 'none'] as const;
export const ShoesIdSchema = z.enum(SHOES_IDS);

export const ACCESSORY_IDS = ['none', 'visor', 'halo', 'earpiece', 'wings'] as const;
export const AccessoryIdSchema = z.enum(ACCESSORY_IDS);

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const HexColorSchema = z
  .string()
  .regex(HEX_COLOR_REGEX, 'Expected a hex color such as #06B6D4');

/** Full modular avatar definition. Persisted on `User.avatarConfig`. */
export const AvatarConfigSchema = z.object({
  skinTone: SkinToneSchema,
  hairStyleId: HairStyleIdSchema,
  hairColor: HexColorSchema,
  topId: TopIdSchema,
  topColor: HexColorSchema,
  bottomId: BottomIdSchema,
  bottomColor: HexColorSchema,
  shoesId: ShoesIdSchema,
  accessoryId: AccessoryIdSchema,
  accessoryColor: HexColorSchema,
});

export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;
export type SkinTone = z.infer<typeof SkinToneSchema>;
export type HairStyleId = z.infer<typeof HairStyleIdSchema>;
export type TopId = z.infer<typeof TopIdSchema>;
export type BottomId = z.infer<typeof BottomIdSchema>;
export type ShoesId = z.infer<typeof ShoesIdSchema>;
export type AccessoryId = z.infer<typeof AccessoryIdSchema>;

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: 'honey',
  hairStyleId: 'shag',
  hairColor: '#0F172A',
  topId: 'hoodie',
  topColor: '#7C3AED',
  bottomId: 'cargo_pants',
  bottomColor: '#0F1629',
  shoesId: 'sneakers',
  accessoryId: 'visor',
  accessoryColor: '#06B6D4',
};

export const UpdateAvatarDtoSchema = AvatarConfigSchema.partial();
export type UpdateAvatarDto = z.infer<typeof UpdateAvatarDtoSchema>;

/** Safe parser used by both API and clients so malformed JSON never crashes a render. */
export function parseAvatarConfig(value: unknown): AvatarConfig {
  const parsed = AvatarConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_AVATAR_CONFIG;
}
