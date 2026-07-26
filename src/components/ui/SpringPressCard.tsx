import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const PRESS_IN = { damping: 17, stiffness: 400, mass: 0.35 };
const PRESS_OUT = { damping: 14, stiffness: 240, mass: 0.35 };

type Props = Omit<PressableProps, 'onPress' | 'style'> & {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Slightly stronger press for smaller targets (e.g. avatar). */
  shrink?: number;
};

/**
 * Press feedback via spring scale only — no opacity flash or default Android ripple box.
 */
export function SpringPressCard({ onPress, children, style, shrink = 0.97, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(shrink, PRESS_IN);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, PRESS_OUT);
      }}
      android_ripple={null}
      style={style}
      {...rest}
    >
      <Animated.View style={animatedStyle} className="w-full">
        {children}
      </Animated.View>
    </Pressable>
  );
}
