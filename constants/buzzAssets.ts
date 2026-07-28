export type BuzzKind = 'love' | 'kiss' | 'hug' | 'sorry' | 'please' | 'anger';

export const BUZZ_OPTIONS = [
  {
    id: 'love',
    label: 'Love',
    icon: 'heart',
    color: '#EF4444',
    library: 'Ionicons',
    image: require('../assets/images/love-new.png'),
  },
  {
    id: 'kiss',
    label: 'Kiss',
    icon: 'heart',
    color: '#E14D76',
    library: 'Ionicons',
    image: require('../assets/images/kiss-new.png'),
  },
  {
    id: 'hug',
    label: 'Hug',
    icon: 'accessibility',
    color: '#8B5CF6',
    library: 'Ionicons',
    image: require('../assets/images/hug-new.png'),
  },
  {
    id: 'sorry',
    label: 'Sorry',
    icon: 'heart-dislike',
    color: '#4D8FC8',
    library: 'Ionicons',
    image: require('../assets/images/sorry-new.png'),
  },
  {
    id: 'please',
    label: 'Please',
    icon: 'hands-pray',
    color: '#D99A2B',
    library: 'MaterialCommunityIcons',
    image: require('../assets/images/please-new.png'),
  },
  {
    id: 'anger',
    label: 'Angry',
    icon: 'flame',
    color: '#DC2626',
    library: 'Ionicons',
    image: require('../assets/images/angry_send.png'),
  },
] as const;

const BUZZ_ALIASES: Record<string, BuzzKind> = {
  love_heart: 'love',
  love_kiss: 'kiss',
  love_cuddle: 'hug',
  anger_mad: 'anger',
  anger_hate: 'anger',
  please_beg: 'please',
};

export function normalizeBuzzKind(kind: string | null | undefined): BuzzKind {
  const value = kind?.trim().toLowerCase() ?? '';
  if (BUZZ_ALIASES[value]) return BUZZ_ALIASES[value];
  if (BUZZ_OPTIONS.some((option) => option.id === value)) return value as BuzzKind;
  return 'love';
}

export function buzzImageFor(
  kind: string | null | undefined,
  direction: 'sent' | 'received' = 'sent',
): number {
  const normalized = normalizeBuzzKind(kind);
  if (normalized === 'anger' && direction === 'received') {
    return require('../assets/images/angry_receive.png');
  }
  return BUZZ_OPTIONS.find((option) => option.id === normalized)?.image ?? BUZZ_OPTIONS[0].image;
}
