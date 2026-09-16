import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const LOGO = require('../../../assets/images/app_icon_square.png');
const CRIMSON = '#c9102e';

function useLoopedValue(duration: number, easing = Easing.inOut(Easing.ease)) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }),
    );
    animation.start();
    return () => animation.stop();
  }, [duration, easing, value]);
  return value;
}

function LogoImage({ style }: { style?: object }) {
  return <Animated.Image source={LOGO} resizeMode="contain" style={[styles.logo, style]} />;
}

export function FreshLaunchLoading() {
  const pulse = useLoopedValue(2200);
  const spin = useLoopedValue(1400, Easing.linear);
  const dots = useLoopedValue(1400, Easing.linear);
  const labelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(labelOpacity, { toValue: 1, duration: 650, delay: 300, useNativeDriver: true }).start();
  }, [labelOpacity]);

  return (
    <LinearGradient colors={['#fff8f9', '#ffd9df', '#fffefe']} locations={[0, 0.52, 1]} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.loadingStage}>
        <View style={styles.loadingVisual}>
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.24, 0.58, 0.24] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.76, 1.1, 0.76] }) }],
              },
            ]}
          />
          <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
          <LogoImage
            style={{
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.88, 1.035, 0.88] }) }],
            }}
          />
        </View>
        <Animated.View style={[styles.loadingLabelWrap, { opacity: labelOpacity }]}>
          <Text style={styles.brand}>Smittenz</Text>
          <View style={styles.dotsRow}>
            {[0, 0.18, 0.36].map((offset) => (
              <Animated.View
                key={offset}
                style={[
                  styles.dot,
                  {
                    opacity: dots.interpolate({
                      inputRange: [offset, Math.min(offset + 0.18, 0.99), Math.min(offset + 0.38, 1)],
                      outputRange: [0.2, 1, 0.2],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.loadingCopy}>Preparing your private space</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

function Ripple({ delay }: { delay: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, { toValue: 1, duration: 2400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);
  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.52, 0] }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1.62] }) }],
        },
      ]}
    />
  );
}

export function FlipRevealIntro() {
  const reveal = useRef(new Animated.Value(0)).current;
  const beat = useRef(new Animated.Value(0)).current;
  const copy = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(reveal, { toValue: 1, delay: 120, friction: 6, tension: 52, useNativeDriver: true }).start();
    Animated.timing(copy, { toValue: 1, duration: 650, delay: 1150, useNativeDriver: true }).start();
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.delay(1250),
        Animated.timing(beat, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0.68, duration: 130, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.delay(420),
      ]),
    );
    heartbeat.start();
    return () => heartbeat.stop();
  }, [beat, copy, reveal]);

  return (
    <LinearGradient colors={['#fff9fa', '#ffe2e7']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.flipStage}>
        <Ripple delay={0} />
        <Ripple delay={800} />
        <Ripple delay={1600} />
        <Animated.View
          style={{
            opacity: reveal,
            transform: [
              { perspective: 900 },
              { rotateY: reveal.interpolate({ inputRange: [0, 0.62, 0.82, 1], outputRange: ['-180deg', '20deg', '-8deg', '0deg'] }) },
              { scale: Animated.multiply(
                reveal.interpolate({ inputRange: [0, 0.62, 0.82, 1], outputRange: [0.42, 1.08, 0.97, 1] }),
                beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }),
              ) },
            ],
          }}
        >
          <LogoImage />
        </Animated.View>
        <Animated.View style={[styles.revealCopyWrap, { opacity: copy, transform: [{ translateY: copy.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Text style={styles.revealTitle}>A fresh beginning</Text>
          <Text style={styles.revealCopy}>Your account has been deleted securely.</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingStage: { width: 300, alignItems: 'center' },
  loadingVisual: { width: 270, height: 270, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 248, height: 248, borderRadius: 124, backgroundColor: '#d2143238' },
  spinnerRing: { position: 'absolute', width: 232, height: 232, borderRadius: 116, borderWidth: 3, borderColor: '#c9102e25', borderTopColor: CRIMSON, borderRightColor: '#c9102e60' },
  logo: { width: 184, height: 184, borderRadius: 92, shadowColor: '#aa1730', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.28, shadowRadius: 22 },
  loadingLabelWrap: { alignItems: 'center', marginTop: 24 },
  brand: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: '#a90c27', letterSpacing: 0.4 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 9 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: CRIMSON },
  loadingCopy: { marginTop: 11, fontFamily: 'Inter_500Medium', fontSize: 11, color: '#a66d78', letterSpacing: 0.4 },
  flipStage: { width: 310, height: 390, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -72 }] },
  ripple: { position: 'absolute', top: 60, width: 238, height: 238, borderRadius: 119, borderWidth: 2, borderColor: '#c9102e70' },
  revealCopyWrap: { position: 'absolute', bottom: 20, alignItems: 'center', width: 290 },
  revealTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 25, color: '#a90c27' },
  revealCopy: { marginTop: 7, fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9b6b75', textAlign: 'center' },
});
