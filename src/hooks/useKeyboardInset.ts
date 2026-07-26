import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FOOTER_GAP = 8;

/**
 * Distance from the bottom of the window to the top of the keyboard.
 * Uses screenY from the keyboard event (device-specific) instead of a fixed height.
 */
function keyboardInsetFromEvent(e: KeyboardEvent): number {
  const { screenY, height } = e.endCoordinates;
  const windowHeight = Dimensions.get('window').height;
  // iOS emits a final frame event with the keyboard below the window.
  // Android emits a separate hide event, while its resized window can make
  // screenY equal the current window height even when the keyboard is open.
  if (screenY >= windowHeight - 1) {
    return Platform.OS === 'ios' ? 0 : Math.round(height);
  }
  const fromScreenY = Math.round(windowHeight - screenY);

  if (fromScreenY > 0 && fromScreenY <= windowHeight) {
    return fromScreenY;
  }

  return Math.round(height);
}

/** Positions the chat composer flush above the keyboard on any device. */
export function useKeyboardInset() {
  const insets = useSafeAreaInsets();
  const [keyboardInset, setKeyboardInset] = useState(0);

  const onKeyboardFrame = useCallback((e: KeyboardEvent) => {
    setKeyboardInset(keyboardInsetFromEvent(e));
  }, []);

  const onKeyboardHide = useCallback(() => setKeyboardInset(0), []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subs = [
      Keyboard.addListener(showEvent, onKeyboardFrame),
      Keyboard.addListener(hideEvent, onKeyboardHide),
    ];

    if (Platform.OS === 'ios') {
      subs.push(Keyboard.addListener('keyboardWillChangeFrame', onKeyboardFrame));
    }

    return () => subs.forEach((s) => s.remove());
  }, [onKeyboardFrame, onKeyboardHide]);

  const keyboardVisible = keyboardInset > 0;

  // When the keyboard is open, sit just above it; otherwise respect the home-indicator safe area.
  const footerBottom = keyboardVisible
    ? keyboardInset + FOOTER_GAP
    : Math.max(insets.bottom, FOOTER_GAP);

  /** Bottom padding for bottom sheets / modals (keyboard or gesture/nav bar). */
  const sheetBottomInset = keyboardVisible
    ? keyboardInset + FOOTER_GAP
    : Math.max(insets.bottom, 16);

  return { keyboardVisible, keyboardInset, footerBottom, sheetBottomInset };
}
