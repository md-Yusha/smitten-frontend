import { Dimensions } from 'react-native';

/**
 * Responsive Layout Utilities
 * Provides responsive values based on screen width
 */

const WIN = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

// Breakpoints
export const BREAKPOINTS = {
  SMALL: 320,    // Small phones (iPhone SE)
  MEDIUM: 375,   // Standard phones (iPhone 11)
  LARGE: 414,    // Large phones (iPhone 12 Pro)
  XLARGE: 480,   // Extra large phones
  TABLET: 768,   // Tablets
};

/**
 * Get responsive message bubble max width
 * Ensures good readability on all screen sizes
 */
export const getMessageBubbleMaxWidth = (): string => {
  if (WIN < BREAKPOINTS.SMALL) return '82%';
  if (WIN < BREAKPOINTS.MEDIUM) return '80%';
  if (WIN < BREAKPOINTS.LARGE) return '78%';
  if (WIN < BREAKPOINTS.XLARGE) return '75%';
  if (WIN < BREAKPOINTS.TABLET) return '70%';
  return '60%'; // Tablets
};

/**
 * Get responsive media bubble max width
 * Media (images, videos) need slightly more space
 */
export const getMediaBubbleMaxWidth = (): string => {
  if (WIN < BREAKPOINTS.SMALL) return '90%';
  if (WIN < BREAKPOINTS.MEDIUM) return '88%';
  if (WIN < BREAKPOINTS.LARGE) return '85%';
  if (WIN < BREAKPOINTS.XLARGE) return '82%';
  if (WIN < BREAKPOINTS.TABLET) return '75%';
  return '65%'; // Tablets
};

/**
 * Get responsive padding for composer
 */
export const getComposerPadding = (): number => {
  if (WIN < BREAKPOINTS.SMALL) return 8;
  if (WIN < BREAKPOINTS.MEDIUM) return 10;
  if (WIN < BREAKPOINTS.LARGE) return 12;
  return 14;
};

/**
 * Get responsive font size for chat messages
 */
export const getChatFontSize = (): number => {
  if (WIN < BREAKPOINTS.SMALL) return 13;
  if (WIN < BREAKPOINTS.MEDIUM) return 14;
  if (WIN < BREAKPOINTS.LARGE) return 14;
  if (WIN < BREAKPOINTS.XLARGE) return 15;
  return 14; // Tablets
};

/**
 * Get responsive line height for chat messages
 */
export const getChatLineHeight = (): number => {
  if (WIN < BREAKPOINTS.SMALL) return 18;
  if (WIN < BREAKPOINTS.MEDIUM) return 19;
  if (WIN < BREAKPOINTS.LARGE) return 20;
  if (WIN < BREAKPOINTS.XLARGE) return 21;
  return 20; // Tablets
};

/**
 * Get responsive bubble padding
 */
export const getBubblePadding = (): { horizontal: number; vertical: number } => {
  if (WIN < BREAKPOINTS.SMALL) return { horizontal: 11, vertical: 8 };
  if (WIN < BREAKPOINTS.MEDIUM) return { horizontal: 12, vertical: 8 };
  if (WIN < BREAKPOINTS.LARGE) return { horizontal: 13, vertical: 9 };
  if (WIN < BREAKPOINTS.XLARGE) return { horizontal: 14, vertical: 10 };
  return { horizontal: 15, vertical: 10 }; // Tablets
};

/**
 * Get responsive bubble border radius
 */
export const getBubbleBorderRadius = (): number => {
  if (WIN < BREAKPOINTS.SMALL) return 14;
  if (WIN < BREAKPOINTS.MEDIUM) return 16;
  if (WIN < BREAKPOINTS.LARGE) return 18;
  if (WIN < BREAKPOINTS.XLARGE) return 20;
  return 18; // Tablets
};

/**
 * Get responsive header max width
 */
export const getHeaderMaxWidth = (): number => {
  if (WIN < BREAKPOINTS.SMALL) return 160;
  if (WIN < BREAKPOINTS.MEDIUM) return 180;
  if (WIN < BREAKPOINTS.LARGE) return 190;
  if (WIN < BREAKPOINTS.XLARGE) return 220;
  return 300; // Tablets
};

/**
 * Get responsive system message max width
 */
export const getSystemMessageMaxWidth = (): string => {
  if (WIN < BREAKPOINTS.SMALL) return '90%';
  if (WIN < BREAKPOINTS.MEDIUM) return '88%';
  if (WIN < BREAKPOINTS.LARGE) return '85%';
  if (WIN < BREAKPOINTS.XLARGE) return '80%';
  return '70%'; // Tablets
};

/**
 * Get responsive emoji picker cell size
 */
export const getEmojiCellSize = (cols: number = 6): number => {
  const PICKER_PAD = 16;
  const EMOJI_GAP = 8;
  return Math.floor((WIN - PICKER_PAD * 2 - EMOJI_GAP * (cols - 1)) / cols);
};

/**
 * Get responsive sticker cell size
 */
export const getStickerCellSize = (cols: number = 5): number => {
  const PICKER_PAD = 16;
  const STICKER_GAP = 10;
  return Math.floor((WIN - PICKER_PAD * 2 - STICKER_GAP * (cols - 1)) / cols);
};

/**
 * Get responsive picker height
 */
export const getPickerHeight = (): number => {
  const PICKER_MIN_HEIGHT = 290;
  const PICKER_MAX_HEIGHT = 560;
  const defaultHeight = Math.min(390, Math.max(PICKER_MIN_HEIGHT, SCREEN_H * 0.42));
  return Math.min(PICKER_MAX_HEIGHT, Math.max(PICKER_MIN_HEIGHT, defaultHeight));
};

/**
 * Get responsive composer input height
 */
export const getComposerInputHeight = (): { min: number; max: number } => {
  if (WIN < BREAKPOINTS.SMALL) return { min: 40, max: 100 };
  if (WIN < BREAKPOINTS.MEDIUM) return { min: 44, max: 110 };
  if (WIN < BREAKPOINTS.LARGE) return { min: 44, max: 120 };
  return { min: 48, max: 140 }; // Tablets
};

/**
 * Get responsive margin for messages
 */
export const getMessageMargin = (): { bottom: number; horizontal: number } => {
  if (WIN < BREAKPOINTS.SMALL) return { bottom: 8, horizontal: 2 };
  if (WIN < BREAKPOINTS.MEDIUM) return { bottom: 9, horizontal: 3 };
  if (WIN < BREAKPOINTS.LARGE) return { bottom: 10, horizontal: 4 };
  return { bottom: 12, horizontal: 6 }; // Tablets
};

/**
 * Check if device is tablet
 */
export const isTablet = (): boolean => {
  return WIN >= BREAKPOINTS.TABLET;
};

/**
 * Check if device is small phone
 */
export const isSmallPhone = (): boolean => {
  return WIN < BREAKPOINTS.MEDIUM;
};

/**
 * Get responsive gap between elements
 */
export const getResponsiveGap = (baseGap: number = 8): number => {
  if (WIN < BREAKPOINTS.SMALL) return baseGap * 0.75;
  if (WIN < BREAKPOINTS.MEDIUM) return baseGap * 0.875;
  if (WIN < BREAKPOINTS.LARGE) return baseGap;
  if (WIN < BREAKPOINTS.XLARGE) return baseGap * 1.125;
  return baseGap * 1.25; // Tablets
};
