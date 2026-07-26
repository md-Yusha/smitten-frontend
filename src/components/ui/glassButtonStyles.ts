import type { ViewStyle } from 'react-native';

/** Crimson sampled from the Smittenz heart logo. */
export const SMITTEN_LOGO_RED = '#C8103A';

/** Shared translucent brand treatment for primary actions across the app. */
export const smittenGlassButton: ViewStyle = {
  backgroundColor: 'rgba(200, 16, 58, 0.9)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.62)',
  shadowColor: SMITTEN_LOGO_RED,
  shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.24,
  shadowRadius: 13,
  elevation: 5,
};
