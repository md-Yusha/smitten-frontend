import { useKeyboardInset } from '@/src/hooks/useKeyboardInset';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
  findNodeHandle,
  Platform,
  ScrollView,
  TextInput,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = Omit<ScrollViewProps, 'contentContainerStyle'> & {
  contentContainerStyle?: StyleProp<ViewStyle>;
  bottomPadding?: number;
  extraScrollHeight?: number;
};

/**
 * ScrollView that does not depend on an OEM's windowSoftInputMode behavior.
 * Android gets a real keyboard-height scroll spacer; both platforms scroll the
 * focused native input into view after keyboard animation/layout has settled.
 */
export const KeyboardAwareScrollView = forwardRef<ScrollView, Props>(
  function KeyboardAwareScrollView(
    {
      bottomPadding = 24,
      contentContainerStyle,
      extraScrollHeight = 96,
      keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
      keyboardShouldPersistTaps = 'handled',
      onFocus,
      ...props
    },
    forwardedRef,
  ) {
    const localRef = useRef<ScrollView>(null);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const { keyboardVisible, keyboardInset } = useKeyboardInset();

    useImperativeHandle(forwardedRef, () => localRef.current as ScrollView);

    const revealFocusedInput = useCallback(() => {
      for (const timer of timersRef.current) clearTimeout(timer);
      timersRef.current = [80, 280].map((delay) => setTimeout(() => {
        const focusedInput = TextInput.State.currentlyFocusedInput();
        const nodeHandle = focusedInput
          ? findNodeHandle(focusedInput as unknown as Parameters<typeof findNodeHandle>[0])
          : null;
        if (nodeHandle == null) return;
        localRef.current?.scrollResponderScrollNativeHandleToKeyboard(
          nodeHandle,
          extraScrollHeight,
          true,
        );
      }, delay));
    }, [extraScrollHeight]);

    useEffect(() => {
      if (keyboardVisible) revealFocusedInput();
    }, [keyboardVisible, keyboardInset, revealFocusedInput]);

    useEffect(() => () => {
      for (const timer of timersRef.current) clearTimeout(timer);
    }, []);

    return (
      <ScrollView
        {...props}
        ref={localRef}
        keyboardDismissMode={keyboardDismissMode}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        onFocus={(event) => {
          onFocus?.(event);
          revealFocusedInput();
        }}
        contentContainerStyle={[
          contentContainerStyle,
          {
            paddingBottom:
              bottomPadding +
              (Platform.OS === 'android' && keyboardVisible ? keyboardInset : 0),
          },
        ]}
      />
    );
  },
);
