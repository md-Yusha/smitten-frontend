import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  seconds: number;
  progress: number;
  color: string;
  size?: number;
};

export function CircularCountdownBadge({ seconds, progress, color, size = 46 }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const half = size / 2;
  const segments = 40;
  const activeSegments = Math.ceil(clamped * segments);
  const tickWidth = Math.max(2, Math.round(size * 0.055));
  const tickHeight = Math.max(5, Math.round(size * 0.14));

  return (
    <View style={[styles.root, { width: size, height: size, borderRadius: half }]}>
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: Math.max(2, Math.round(size * 0.045)),
          },
        ]}
      />
      {Array.from({ length: segments }).map((_, index) => {
        const active = index < activeSegments;
        return (
          <View
            key={index}
            style={[
              styles.tickWrap,
              {
                width: tickWidth,
                height: size,
                left: half - tickWidth / 2,
                transform: [{ rotate: `${index * (360 / segments)}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.tick,
                {
                  width: tickWidth,
                  height: tickHeight,
                  borderRadius: tickWidth,
                  backgroundColor: active ? color : 'rgba(255,255,255,0.18)',
                },
              ]}
            />
          </View>
        );
      })}
      <View style={[styles.center, { inset: Math.max(7, Math.round(size * 0.17)), borderRadius: half }]}>
        <Text style={[styles.text, { fontSize: Math.max(12, Math.round(size * 0.3)) }]}>
          {Math.max(0, seconds)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(18,18,18,0.62)',
    overflow: 'hidden',
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  tickWrap: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  tick: {
    marginTop: 1,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  text: {
    color: '#fff',
    fontWeight: '900',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
