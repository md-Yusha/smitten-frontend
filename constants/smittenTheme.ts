/** Unified Smittenz brand palette — u n me maroon theme for everyone. */
import { UnMeColors } from './unMeGradients';

export const SmittenColors = {
  cream: UnMeColors.white,
  peach: UnMeColors.white,
  /** Mid maroon accent (icons, links, toggles). */
  accentBrand: UnMeColors.m6,
  accent: UnMeColors.m7,
  accentDeep: UnMeColors.m5,
  partnerBubble: UnMeColors.white,
  ink: UnMeColors.txDark,
  muted: UnMeColors.txMuted,
  white: UnMeColors.white,
  border: 'rgba(26, 26, 26, 0.08)',
  maroon: UnMeColors,
} as const;

export const gradientCream = [SmittenColors.white, SmittenColors.white] as const;
/** Screen body: keep shell backgrounds white; brand color belongs in actions and accents. */
export const gradientShell = [SmittenColors.white, SmittenColors.white, SmittenColors.white] as const;

export const PROFILE_THEME_OPTIONS = [
  { id: 'wine', label: 'Wine Cream', color: UnMeColors.m6 },
  { id: 'berry', label: 'Berry Blush', color: '#9f1239' },
  { id: 'plum', label: 'Plum Wine', color: '#7e2259' },
  { id: 'rose', label: 'Rosewood', color: '#be3455' },
] as const;

export { UnMeColors, unMeGradients, unMeGradientProps, unMeButtonShadow } from './unMeGradients';
