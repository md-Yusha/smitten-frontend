import { gradientShell, SmittenColors } from './smittenTheme';

export type Gender = 'male' | 'female' | 'other' | null;

/** Same soft shell background for all users. */
export function getShellGradients(_gender?: Gender): readonly [string, string, string] {
  return gradientShell;
}

export function getShellOrbColor(_gender: Gender, themeColor: string): string {
  return `${themeColor}28`;
}

export function getPartnerBubble(_gender?: Gender): string {
  return SmittenColors.partnerBubble;
}

export function getSelfBubble(_gender?: Gender): string {
  return '#FFEBEE';
}
