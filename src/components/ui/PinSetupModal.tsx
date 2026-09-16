import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmittenLogo } from './SmittenLogo';

const PIN_LENGTH = 4;

const NUM_PAD = [
  [{ digit: '1', sub: '' }, { digit: '2', sub: 'ABC' }, { digit: '3', sub: 'DEF' }],
  [{ digit: '4', sub: 'GHI' }, { digit: '5', sub: 'JKL' }, { digit: '6', sub: 'MNO' }],
  [{ digit: '7', sub: 'PQRS' }, { digit: '8', sub: 'TUV' }, { digit: '9', sub: 'WXYZ' }],
  [{ digit: '', sub: '' }, { digit: '0', sub: '' }, { digit: 'del', sub: '' }],
];

type Step = 'enter' | 'confirm';

interface PinSetupModalProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: (pin: string) => void;
}

export function PinSetupModal({ visible, onDismiss, onComplete }: PinSetupModalProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shakeX = useSharedValue(0);

  const animatedDots = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const shake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeX]);

  const reset = useCallback(() => {
    setStep('enter');
    setFirstPin('');
    setPin('');
    setError(false);
  }, []);

  const handlePress = useCallback(
    (digit: string) => {
      if (digit === 'del') {
        setError(false);
        setPin((p) => p.slice(0, -1));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      if (digit === '' || pin.length >= PIN_LENGTH) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = pin + digit;
      setPin(next);

      if (next.length === PIN_LENGTH) {
        if (step === 'enter') {
          setFirstPin(next);
          setPin('');
          setStep('confirm');
        } else {
          if (next === firstPin) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete(next);
            reset();
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(true);
            shake();
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 600);
          }
        }
      }
    },
    [pin, step, firstPin, onComplete, reset, shake],
  );

  const promptText = step === 'enter' ? 'Set a 4-digit PIN' : error ? "PINs don't match — try again" : 'Confirm your PIN';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.screen}>
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                reset();
                onDismiss();
              }}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={24} color="#2b1b25" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create a PIN</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.logoContainer}>
            <View style={styles.iconBox}>
              <Ionicons name="lock-closed-outline" size={35} color="#9577dc" />
            </View>
            <SmittenLogo width={112} height={40} style={styles.smittenBrand} />
            <Text style={styles.title}>Protect your App</Text>
            <Text style={styles.subtitle}>Use four digits you will remember.</Text> 
            <Text style={styles.subtitle}>This will be used as you vault pin too.</Text>
          </View>

          <View style={[styles.pinCard, error && styles.pinCardError]}>
            <Text style={[styles.promptText, error && styles.promptError]}>{promptText}</Text>

            <Animated.View style={[styles.dotsRow, animatedDots]}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < pin.length && styles.dotFilled,
                    error && i < pin.length && styles.dotError,
                  ]}
                />
              ))}
            </Animated.View>
          </View>

          <View style={styles.numpad}>
            {NUM_PAD.map((row, ri) => (
              <View key={ri} style={styles.numpadRow}>
                {row.map((btn) => {
                  if (btn.digit === '') {
                    return <View key="empty" style={styles.numpadBtn} />;
                  }
                  if (btn.digit === 'del') {
                    return (
                      <TouchableOpacity
                        key="del"
                        style={styles.numpadBtn}
                        activeOpacity={0.7}
                        onPress={() => handlePress('del')}
                      >
                        <Ionicons name="backspace-outline" size={25} color="#7f6b75" />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={btn.digit}
                      style={styles.numpadBtn}
                      activeOpacity={0.7}
                      onPress={() => handlePress(btn.digit)}
                    >
                      <View style={styles.numpadCircle}>
                        <Text style={styles.numpadDigit}>{btn.digit}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.footer}>Your PIN stays securely on this device.</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#fbf2f5',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: '#2b1b25',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconBox: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee7fb',
  },
  smittenBrand: { marginTop: 14 },
  title: { marginTop: 8, color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22 },
  subtitle: { marginTop: 7, color: '#9f8b96', fontFamily: 'Inter_400Regular', fontSize: 13 },
  pinCard: {
    width: '78%',
    alignItems: 'center',
    marginTop: 22,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0e0e5',
    backgroundColor: '#fff',
  },
  pinCardError: { borderColor: '#e67b92', backgroundColor: '#fff' },
  promptError: { color: '#c94d69' },
  promptText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#8d7782',
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#df9cad',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#df5c7d',
    borderColor: '#df5c7d',
  },
  dotError: {
    backgroundColor: '#c94d69',
    borderColor: '#c94d69',
  },
  numpad: {
    gap: 8,
    paddingHorizontal: 30,
    marginTop: 12,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  numpadBtn: {
    width: 70,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff9fa',
    borderWidth: 1,
    borderColor: '#ead9de',
  },
  numpadDigit: {
    fontSize: 25,
    fontFamily: 'Inter_500Medium',
    color: '#2b1b25',
  },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 15, color: '#ad9aa3', fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center' },
});
