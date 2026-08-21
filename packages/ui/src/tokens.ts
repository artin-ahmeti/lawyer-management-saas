/**
 * Design tokens — single source of truth for mobile (NativeWind) and web.
 * Dark-first. Core palette (user-approved 2026-08-21):
 *   #1B2632 canvas · #2C3B4D surface · #FFB162 accent · #A35139 rust
 *   #EEE9DF cream (primary text) · #C9C1B1 stone (muted text)
 * tailwind-preset.cjs mirrors these values; keep them in sync.
 */
export const palette = {
  canvas: '#1B2632',
  surface: '#2C3B4D',
  accent: '#FFB162',
  rust: '#A35139',
  cream: '#EEE9DF',
  stone: '#C9C1B1',
} as const;

export const colors = {
  // Backgrounds
  bg: palette.canvas,
  bgElevated: palette.surface,
  bgSunken: '#141d27', // canvas darkened — inputs, wells
  // Text
  ink: palette.cream,
  inkMuted: palette.stone,
  inkFaint: '#8B94A3', // stone cooled toward canvas — timestamps, placeholders
  // Actions
  primary: palette.accent,
  primaryPressed: '#E89C50',
  onPrimary: palette.canvas,
  // Semantic
  danger: '#C96A50', // rust lifted for dark-bg contrast
  dangerDeep: palette.rust,
  success: '#9CB380',
  warning: palette.accent,
  // Lines
  border: '#3A4A5E', // surface lightened
  borderFaint: '#25334272',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, full: 9999 } as const;
