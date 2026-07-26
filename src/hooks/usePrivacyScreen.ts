import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';

/** Block screenshots & screen recording while this screen is focused (iOS + Android). */
export function usePrivacyScreen(enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void ScreenCapture.preventScreenCaptureAsync();
      return () => {
        if (process.env.EXPO_PUBLIC_DISABLE_SCREENSHOT_BLOCK === 'true') {
          void ScreenCapture.allowScreenCaptureAsync();
        }
      };
    }, [enabled]),
  );
}
