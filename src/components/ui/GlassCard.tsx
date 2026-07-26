import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  /** Kept for API compatibility; light cards use a fixed soft shadow. */
  intensity?: number;
  className?: string;
}

export function GlassCard({ children, className = '', style, ...props }: GlassCardProps) {
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const {
    borderColor,
    borderWidth,
    borderStyle,
    borderRadius,
    backgroundColor,
    ...outerStyle
  } = flattenedStyle;

  const innerStyle = {
    borderColor,
    borderWidth,
    borderStyle,
    borderRadius,
    backgroundColor,
  };

  return (
    <View style={[styles.card, outerStyle]} {...props}>
      <View
        className={`overflow-hidden rounded-[28px] border border-stone-200/90 bg-white ${className}`}
        style={innerStyle}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
});
