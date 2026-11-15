import { colors, radii, spacing, typography } from '@vybe/ui';

export const theme = {
  colors: {
    background: colors.background,
    surface: colors.surface,
    surfaceElevated: colors.surfaceElevated,
    primary: colors.primary,
    accent: colors.accent,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    border: colors.border,
    danger: colors.danger,
    hudGlass: colors.hudGlass,
  },
  radii,
  spacing,
  typography,
} as const;

export const tabBarHeight = 64;
