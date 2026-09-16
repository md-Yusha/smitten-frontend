/**
 * Maroon palette + gradient stops from u-n-me-6.html (:root --m0…--m7).
 */
export const UnMeColors = {
  white: '#ffffff',
  white2: '#f8f8f8',
  white3: '#f0f0f0',
  m0: '#0d0005',
  m1: '#1c0210',
  m2: '#2e0518',
  m3: '#450b24',
  m4: '#6b1535',
  m5: '#8b1c40',
  m6: '#b02550',
  m7: '#d03868',
  txDark: '#1a0010',
  txMid: '#5a2030',
  txMuted: '#9a6070',
  heroEmphasis: '#ffa0b8',
  green: '#2ecc71',
} as const;

export type UnMeGradientKey =
  | 'welcomeHero'
  | 'welcomeHeroFade'
  | 'buttonPrimary'
  | 'iconTile'
  | 'screenHeader'
  | 'lockScreen'
  | 'appIcon'
  | 'loveDashboard';

type Point = { x: number; y: number };

export type UnMeGradientSpec = {
  colors: readonly string[];
  locations?: readonly number[];
  start: Point;
  end: Point;
};

/** CSS linear-gradient equivalents for expo-linear-gradient. */
export const unMeGradients: Record<UnMeGradientKey, UnMeGradientSpec> = {
  /** .w-hero — linear-gradient(145deg, m0 0%, m2 40%, m5 75%, m7 100%) */
  welcomeHero: {
    colors: [UnMeColors.m0, UnMeColors.m2, UnMeColors.m5, UnMeColors.m7],
    locations: [0, 0.4, 0.75, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** .w-hero::after — fade hero into white */
  welcomeHeroFade: {
    colors: ['rgba(255,255,255,0)', '#ffffff'],
    locations: [0.68, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  /** .btn-burg — linear-gradient(135deg, m7 0%, m5 55%, m3 100%) */
  buttonPrimary: {
    colors: [UnMeColors.m7, UnMeColors.m5, UnMeColors.m3],
    locations: [0, 0.55, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** .f-ic — linear-gradient(135deg, m5, m3) */
  iconTile: {
    colors: [UnMeColors.m5, UnMeColors.m3],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** .prof-hdr / chat hdr — linear-gradient(135deg, m0 0%, m2 50%, m4 100%) */
  screenHeader: {
    colors: [UnMeColors.m0, UnMeColors.m2, UnMeColors.m4],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** #s-lock — linear-gradient(175deg, m0 0%, m1 30%, m3 65%, m5 100%) */
  lockScreen: {
    colors: [UnMeColors.m0, UnMeColors.m1, UnMeColors.m3, UnMeColors.m5],
    locations: [0, 0.3, 0.65, 1],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** .app-icon — linear-gradient(145deg, m7 0%, m5 40%, m3 100%) */
  appIcon: {
    colors: [UnMeColors.m7, UnMeColors.m5, UnMeColors.m3],
    locations: [0, 0.4, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** .love-card — linear-gradient(145deg, m0 0%, m2 45%, m5 100%) */
  loveDashboard: {
    colors: [UnMeColors.m0, UnMeColors.m2, UnMeColors.m5],
    locations: [0, 0.45, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

export function unMeGradientProps(key: UnMeGradientKey) {
  const spec = unMeGradients[key];
  return {
    colors: [...spec.colors] as [string, string, ...string[]],
    locations: spec.locations ? ([...spec.locations] as [number, number, ...number[]]) : undefined,
    start: spec.start,
    end: spec.end,
  };
}

/** Primary CTA shadow from .btn-burg */
export const unMeButtonShadow = {
  shadowColor: UnMeColors.m5,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 6,
} as const;
