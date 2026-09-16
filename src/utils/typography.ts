import { StyleSheet, TextStyle } from 'react-native';
import { SmittenColors } from '@/constants/smittenTheme';

/**
 * Typography System
 * Based on Smittenz Style Guide
 * Font: Inter (sans-serif) for body, Playfair Display (serif) for accents
 */

// Color Palette from Style Guide
export const TYPOGRAPHY_COLORS = {
  text: '#2E2A45',           // Default body & heading text
  brandRed: '#BC142B',       // Smittenz wordmark
  gray: '#9A8FA0',           // Secondary text/subtitles
  grayLight: '#C9BDC7',      // Placeholders, faint icons
  gold: '#E36B85',           // Accent, heart icon, primary buttons
  goldDark: '#D45274',       // Links, active nav, day badges
  white: '#FFFFFF',
};

// Font Families
export const FONT_FAMILIES = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  playfairRegular: 'PlayfairDisplay_400Regular',
  playfairBold: 'PlayfairDisplay_700Bold',
};

// Typography Styles from Style Guide
export const TYPOGRAPHY = {
  // Status bar clock: 13px Bold
  statusBarClock: {
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: FONT_FAMILIES.bold,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 16,
  } as TextStyle,

  // Screen title (h2): 19px Regular
  screenTitle: {
    fontSize: 19,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 24,
  } as TextStyle,

  // Screen subtitle: 11.5px Regular
  screenSubtitle: {
    fontSize: 11.5,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.gray,
    lineHeight: 15,
  } as TextStyle,

  // Phone mockup label: 12.5px Bold
  phoneMockupLabel: {
    fontSize: 12.5,
    fontWeight: '600' as const,
    fontFamily: FONT_FAMILIES.bold,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 16,
  } as TextStyle,

  // Phone mockup description: 11px Regular
  phoneMockupDescription: {
    fontSize: 11,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.gray,
    lineHeight: 14,
  } as TextStyle,

  // Primary button: 13.5px Bold (white text)
  primaryButton: {
    fontSize: 13.5,
    fontWeight: '700' as const,
    fontFamily: FONT_FAMILIES.bold,
    color: TYPOGRAPHY_COLORS.white,
    lineHeight: 17,
  } as TextStyle,

  // Secondary button: 13.5px Bold (text color)
  secondaryButton: {
    fontSize: 13.5,
    fontWeight: '700' as const,
    fontFamily: FONT_FAMILIES.bold,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 17,
  } as TextStyle,

  // Input field text: 13px Regular
  inputText: {
    fontSize: 13,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 18,
  } as TextStyle,

  // Input placeholder: 13px Regular (light gray)
  inputPlaceholder: {
    fontSize: 13,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.grayLight,
    lineHeight: 18,
  } as TextStyle,

  // Bottom nav item: 9.5px Bold
  bottomNavItem: {
    fontSize: 9.5,
    fontWeight: '600' as const,
    fontFamily: FONT_FAMILIES.bold,
    color: TYPOGRAPHY_COLORS.grayLight,
    lineHeight: 12,
  } as TextStyle,

  // Bottom nav item (active): 9.5px Bold (gold-dark)
  bottomNavItemActive: {
    fontSize: 9.5,
    fontWeight: '600' as const,
    fontFamily: FONT_FAMILIES.bold,
    color: TYPOGRAPHY_COLORS.goldDark,
    lineHeight: 12,
  } as TextStyle,

  // Body text: 12-13px Regular
  bodyText: {
    fontSize: 13,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 18,
  } as TextStyle,

  // Small text: 11px Regular
  smallText: {
    fontSize: 11,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.gray,
    lineHeight: 14,
  } as TextStyle,

  // Caption text: 10px Regular
  captionText: {
    fontSize: 10,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.gray,
    lineHeight: 13,
  } as TextStyle,

  // Playfair Display - Titles: 20px Regular (serif)
  playfairTitle: {
    fontSize: 20,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.playfairRegular,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 25,
  } as TextStyle,

  // Playfair Display - Subtitle: 16px Regular (serif)
  playfairSubtitle: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.playfairRegular,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 20,
  } as TextStyle,

  // Playfair Display - Date badge: 19px Bold (serif)
  playfairDateBadge: {
    fontSize: 19,
    fontWeight: '700' as const,
    fontFamily: FONT_FAMILIES.playfairBold,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 24,
  } as TextStyle,

  // Chat message: 14px Regular
  chatMessage: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 19,
  } as TextStyle,

  // Chat message outgoing: 14px SemiBold (white)
  chatMessageOutgoing: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: FONT_FAMILIES.semibold,
    color: TYPOGRAPHY_COLORS.white,
    lineHeight: 19,
  } as TextStyle,

  // Heading 1: 23px Regular
  heading1: {
    fontSize: 23,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 28,
  } as TextStyle,

  // Heading 2: 19px Regular
  heading2: {
    fontSize: 19,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 24,
  } as TextStyle,

  // Heading 3: 16px SemiBold
  heading3: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: FONT_FAMILIES.semibold,
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 20,
  } as TextStyle,

  // Link text: 13px Regular (gold-dark)
  linkText: {
    fontSize: 13,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.goldDark,
    lineHeight: 18,
  } as TextStyle,

  // Error text: 12px Regular (brand red)
  errorText: {
    fontSize: 12,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.brandRed,
    lineHeight: 16,
  } as TextStyle,

  // Success text: 12px Regular (gold)
  successText: {
    fontSize: 12,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILIES.regular,
    color: TYPOGRAPHY_COLORS.gold,
    lineHeight: 16,
  } as TextStyle,
};

/**
 * Create custom typography style
 */
export const createTypographyStyle = (
  fontSize: number,
  fontWeight: '400' | '500' | '600' | '700' = '400',
  color: string = TYPOGRAPHY_COLORS.text,
  lineHeight?: number,
): TextStyle => {
  const fontFamilyMap = {
    '400': FONT_FAMILIES.regular,
    '500': FONT_FAMILIES.medium,
    '600': FONT_FAMILIES.semibold,
    '700': FONT_FAMILIES.bold,
  };

  return {
    fontSize,
    fontWeight,
    fontFamily: fontFamilyMap[fontWeight],
    color,
    lineHeight: lineHeight || fontSize * 1.3,
  } as TextStyle;
};

/**
 * Create Playfair Display typography style
 */
export const createPlayfairStyle = (
  fontSize: number,
  fontWeight: '400' | '700' = '400',
  color: string = TYPOGRAPHY_COLORS.text,
  lineHeight?: number,
): TextStyle => {
  const fontFamilyMap = {
    '400': FONT_FAMILIES.playfairRegular,
    '700': FONT_FAMILIES.playfairBold,
  };

  return {
    fontSize,
    fontWeight,
    fontFamily: fontFamilyMap[fontWeight],
    color,
    lineHeight: lineHeight || fontSize * 1.25,
  } as TextStyle;
};

/**
 * Get typography style by name
 */
export const getTypographyStyle = (
  name: keyof typeof TYPOGRAPHY,
): TextStyle => {
  return TYPOGRAPHY[name];
};

/**
 * Merge typography styles
 */
export const mergeTypographyStyles = (
  ...styles: (TextStyle | undefined)[]
): TextStyle => {
  return Object.assign({}, ...styles.filter(Boolean));
};

/**
 * Typography styles object for StyleSheet
 */
export const typographyStyles = StyleSheet.create({
  statusBarClock: TYPOGRAPHY.statusBarClock,
  screenTitle: TYPOGRAPHY.screenTitle,
  screenSubtitle: TYPOGRAPHY.screenSubtitle,
  phoneMockupLabel: TYPOGRAPHY.phoneMockupLabel,
  phoneMockupDescription: TYPOGRAPHY.phoneMockupDescription,
  primaryButton: TYPOGRAPHY.primaryButton,
  secondaryButton: TYPOGRAPHY.secondaryButton,
  inputText: TYPOGRAPHY.inputText,
  inputPlaceholder: TYPOGRAPHY.inputPlaceholder,
  bottomNavItem: TYPOGRAPHY.bottomNavItem,
  bottomNavItemActive: TYPOGRAPHY.bottomNavItemActive,
  bodyText: TYPOGRAPHY.bodyText,
  smallText: TYPOGRAPHY.smallText,
  captionText: TYPOGRAPHY.captionText,
  playfairTitle: TYPOGRAPHY.playfairTitle,
  playfairSubtitle: TYPOGRAPHY.playfairSubtitle,
  playfairDateBadge: TYPOGRAPHY.playfairDateBadge,
  chatMessage: TYPOGRAPHY.chatMessage,
  chatMessageOutgoing: TYPOGRAPHY.chatMessageOutgoing,
  heading1: TYPOGRAPHY.heading1,
  heading2: TYPOGRAPHY.heading2,
  heading3: TYPOGRAPHY.heading3,
  linkText: TYPOGRAPHY.linkText,
  errorText: TYPOGRAPHY.errorText,
  successText: TYPOGRAPHY.successText,
});
