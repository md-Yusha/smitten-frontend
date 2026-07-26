import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { unMeButtonShadow, unMeGradientProps } from '@/constants/unMeGradients';

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  textClassName?: string;
};

export function GradientPrimaryButton({
  label,
  loading,
  disabled,
  containerStyle,
  textClassName = 'font-sans-bold text-lg text-white',
  ...pressableProps
}: Props) {
  const spec = unMeGradientProps('buttonPrimary');
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...pressableProps}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrap,
        unMeButtonShadow,
        containerStyle,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.inner}>
        <LinearGradient {...spec} style={StyleSheet.absoluteFill} />
        <View style={styles.gloss} pointerEvents="none" />
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={textClassName}>{label}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
  },
  inner: {
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.65,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});
