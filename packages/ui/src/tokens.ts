/**
 * VYBE Design System — strict dark-first spatial theme.
 *
 * These tokens are the single source of truth for `apps/web` (Tailwind theme),
 * `apps/mobile` (StyleSheet) and any future surface. Never hardcode a hex value
 * in an app when a token exists here.
 */

export const colors = {
  /** Deep Space Navy — primary background */
  background: '#070B19',
  /** Elevated card / panel surface */
  surface: '#0F1629',
  /** Raised surface for nested cards and inputs */
  surfaceElevated: '#16203A',
  /** Electric Purple — brand & portal accent */
  primary: '#7C3AED',
  primaryMuted: '#6D28D9',
  primarySoft: 'rgba(124, 58, 237, 0.18)',
  /** Neon Cyan — spatial / live presence accent */
  accent: '#06B6D4',
  accentSoft: 'rgba(6, 182, 212, 0.18)',
  /** Text */
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textInverse: '#070B19',
  /** Semantic */
  success: '#22D3EE',
  warning: '#F59E0B',
  danger: '#EF4444',
  /** Lines & overlays */
  border: 'rgba(148, 163, 184, 0.16)',
  borderStrong: 'rgba(148, 163, 184, 0.32)',
  /** HUD glass overlay */
  hudGlass: 'rgba(15, 22, 41, 0.75)',
  scrim: 'rgba(7, 11, 25, 0.82)',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;

export const gradients = {
  brand: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
  portal: `linear-gradient(160deg, rgba(124, 58, 237, 0.35) 0%, rgba(6, 182, 212, 0.18) 100%)`,
  feedFade: `linear-gradient(180deg, ${colors.background} 0%, ${colors.surface} 100%)`,
  hud: `linear-gradient(180deg, rgba(15, 22, 41, 0.92) 0%, rgba(7, 11, 25, 0.65) 100%)`,
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;

export const typography = {
  fontFamily: {
    sans: "'Inter', 'SF Pro Display', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
  },
  size: {
    xxs: 10,
    xs: 12,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 24,
    xxl: 32,
    display: 44,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '800',
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.04em',
    caps: '0.14em',
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const shadows = {
  none: 'none',
  card: '0 18px 45px -24px rgba(2, 6, 23, 0.9)',
  portal: `0 0 0 1px rgba(124, 58, 237, 0.35), 0 24px 60px -30px rgba(124, 58, 237, 0.75)`,
  live: `0 0 0 1px rgba(6, 182, 212, 0.35), 0 0 32px -8px rgba(6, 182, 212, 0.65)`,
  hud: '0 24px 80px -32px rgba(0, 0, 0, 0.95)',
} as const;

export const blur = {
  glass: '12px',
  heavy: '24px',
} as const;

/** Glassmorphic HUD overlay recipe used by every 3D surface. */
export const glass = {
  background: colors.hudGlass,
  border: `1px solid ${colors.border}`,
  backdropFilter: `blur(${blur.glass})`,
  WebkitBackdropFilter: `blur(${blur.glass})`,
  boxShadow: shadows.hud,
} as const;

export const zIndex = {
  base: 0,
  canvas: 1,
  hud: 10,
  drawer: 20,
  modal: 30,
  toast: 40,
} as const;

export const motion = {
  /** Socket.IO transform broadcast cadence (15Hz) — must stay in sync with API gateway. */
  moveIntervalMs: 66,
  fast: 120,
  normal: 220,
  slow: 420,
  emoteDurationMs: 2200,
} as const;

export const layout = {
  sidebarWidth: 264,
  rightRailWidth: 320,
  mobileTabBarHeight: 64,
  contentMaxWidth: 720,
  hudTopBarHeight: 72,
} as const;

/** Neon palette shared by the avatar customizer and room builder. */
export const neonPalette = [
  '#06B6D4',
  '#7C3AED',
  '#22D3EE',
  '#F472B6',
  '#A3E635',
  '#F59E0B',
] as const;

/** Cyber room theme tags surfaced on 3D portal cards. */
export const roomThemeTags = {
  cyberLounge: 'CYBER LOUNGE',
  neonRooftop: 'NEON ROOFTOP',
  arcadeHub: 'ARCADE HUB',
  creatorPlaza: 'CREATOR PLAZA',
} as const;

export const theme = {
  colors,
  gradients,
  spacing,
  radii,
  typography,
  shadows,
  blur,
  glass,
  zIndex,
  motion,
  layout,
  neonPalette,
  roomThemeTags,
} as const;

export type VybeTheme = typeof theme;

/**
 * Tailwind v4 `@theme` bridge. Consumed as CSS custom properties so the web app
 * can use `bg-vybe-background`, `text-vybe-accent`, etc.
 */
export const cssVariables: Readonly<Record<string, string>> = {
  '--color-vybe-background': colors.background,
  '--color-vybe-surface': colors.surface,
  '--color-vybe-surface-elevated': colors.surfaceElevated,
  '--color-vybe-primary': colors.primary,
  '--color-vybe-accent': colors.accent,
  '--color-vybe-text-primary': colors.textPrimary,
  '--color-vybe-text-secondary': colors.textSecondary,
  '--color-vybe-border': colors.border,
  '--color-vybe-hud': colors.hudGlass,
};
