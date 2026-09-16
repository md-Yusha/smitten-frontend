import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { authApi } from '@/src/services/api';
import type { BiometricCapability } from '@/src/services/biometrics';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PIN_LENGTH = 4;

const NUM_PAD = [
  [{ digit: '1', sub: '' }, { digit: '2', sub: 'ABC' }, { digit: '3', sub: 'DEF' }],
  [{ digit: '4', sub: 'GHI' }, { digit: '5', sub: 'JKL' }, { digit: '6', sub: 'MNO' }],
  [{ digit: '7', sub: 'PQRS' }, { digit: '8', sub: 'TUV' }, { digit: '9', sub: 'WXYZ' }],
  [{ digit: '', sub: '' }, { digit: '0', sub: '' }, { digit: 'del', sub: '' }],
];

interface PinLockScreenProps {
  onSuccess: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  biometricEnabled?: boolean;
  biometricCapability?: BiometricCapability;
  onBiometricUnlock?: () => Promise<boolean>;
}

export function PinLockScreen({
  onSuccess,
  onVerify,
  biometricEnabled = false,
  biometricCapability,
  onBiometricUnlock,
}: PinLockScreenProps) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('your account email');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const shakeX = useSharedValue(0);

  const animatedDots = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const biometricLabel = biometricCapability?.unlockLabel ?? 'Use device biometrics';
  const biometricIcon = biometricCapability?.kind === 'face' ? 'scan' : 'finger-print';

  const shake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeX]);

  const handleBiometricUnlock = useCallback(async () => {
    if (!biometricEnabled || !onBiometricUnlock) return;
    const ok = await onBiometricUnlock();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    }
  }, [biometricEnabled, onBiometricUnlock, onSuccess]);

  React.useEffect(() => {
    void handleBiometricUnlock();
  }, [handleBiometricUnlock]);

  const handlePress = useCallback(async (digit: string) => {
    if (verifying) return;
    if (digit === 'del') {
      setError(false);
      setPin((p) => p.slice(0, -1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (digit === '' || pin.length >= PIN_LENGTH) return;

    const next = pin + digit;
    Haptics.impactAsync(next.length === PIN_LENGTH ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    setPin(next);

    if (next.length === PIN_LENGTH) {
      setVerifying(true);
      await new Promise((resolve) => setTimeout(resolve, 120));
      const correct = await onVerify(next);
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(true);
        shake();
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
      setVerifying(false);
    }
  }, [pin, verifying, onVerify, onSuccess, shake]);

  const requestRecoveryCode = useCallback(async () => {
    setRecovering(true);
    setRecoveryCode('');
    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      const result = await authApi.requestAppLockRecovery();
      setMaskedEmail(result.maskedEmail);
    } catch (requestError) {
      setRecoveryError(requestError instanceof Error ? requestError.message : 'Could not send the recovery code.');
    } finally {
      setRecoveryLoading(false);
    }
  }, []);

  const verifyRecoveryCode = useCallback(async () => {
    if (recoveryCode.length !== 6 || recoveryLoading) return;
    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      await authApi.verifyAppLockRecovery({ code: recoveryCode });
      await useAppLockStore.getState().clear();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch (verifyError) {
      setRecoveryError(verifyError instanceof Error ? verifyError.message : 'Could not verify this code.');
    } finally {
      setRecoveryLoading(false);
    }
  }, [onSuccess, recoveryCode, recoveryLoading]);

  if (recovering) {
    return (
      <View style={styles.screen}>
        <View style={[styles.recoveryScreen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.recoveryHeader}>
            <TouchableOpacity onPress={() => { setRecovering(false); setRecoveryCode(''); setRecoveryError(''); }} style={styles.recoveryBack}>
              <Ionicons name="chevron-back" size={24} color="#2b1b25" />
            </TouchableOpacity>
            <Text style={styles.recoveryHeaderTitle}>Recover PIN</Text>
            <View style={styles.recoveryBack} />
          </View>

          <View style={styles.recoveryHero}>
            <View style={styles.recoveryIcon}><Ionicons name="mail-outline" size={32} color="#9577dc" /></View>
            <Text style={styles.recoveryTitle}>Check your email</Text>
            <Text style={styles.recoverySubtitle}>We sent a 6-digit code to{`\n`}{maskedEmail}</Text>
          </View>

          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryLabel}>VERIFICATION CODE</Text>
            <TextInput
              value={recoveryCode}
              onChangeText={(value) => { setRecoveryCode(value.replace(/\D/g, '').slice(0, 6)); setRecoveryError(''); }}
              style={[styles.recoveryInput, recoveryError && styles.recoveryInputError]}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="• • • • • •"
              placeholderTextColor="#c9b9c1"
              autoFocus
            />
            {recoveryError ? <Text style={styles.recoveryError}>{recoveryError}</Text> : <Text style={styles.recoveryHint}>The code expires in 10 minutes.</Text>}
          </View>

          <View style={styles.recoveryActions}>
            <TouchableOpacity disabled={recoveryCode.length !== 6 || recoveryLoading} onPress={() => void verifyRecoveryCode()} style={[styles.recoveryPrimary, (recoveryCode.length !== 6 || recoveryLoading) && styles.recoveryPrimaryDisabled]}>
              {recoveryLoading && recoveryCode.length === 6 ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
              <Text style={styles.recoveryPrimaryText}>Verify & continue</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={recoveryLoading} onPress={() => void requestRecoveryCode()} style={styles.resendButton}>
              {recoveryLoading && recoveryCode.length !== 6 ? <ActivityIndicator color="#c74768" /> : <Text style={styles.resendText}>Didn’t receive it? Send again</Text>}
            </TouchableOpacity>
            <Text style={styles.recoveryNote}>After verification, the lock will be disabled. You can create a new PIN later from Vault or Profile.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}> 
        <View style={styles.logoContainer}>
          <ExpoImage 
            source={require('@/assets/images/logo.png')} 
            style={styles.logoImage} 
            contentFit="contain"
          />
          <View style={styles.iconBox}>
            <Ionicons name="lock-closed-outline" size={31} color="#9577dc" />
          </View>
          <Text style={styles.title}>Locked</Text>
          <Text style={styles.subtitle}>Enter your four-digit PIN to continue.</Text>
        </View>

        <View style={[styles.pinCard, error && styles.pinCardError]}>
          <Text style={[styles.promptText, error && styles.promptError]}> 
            {error ? 'Wrong PIN' : 'Enter your PIN'}
          </Text>

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

        {biometricEnabled ? (
          <TouchableOpacity
            onPress={handleBiometricUnlock}
            style={styles.biometricBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={biometricLabel}
          >
            <Ionicons name={biometricIcon} size={21} color="#c74768" />
            <Text style={styles.biometricText}>{biometricLabel}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={() => void requestRecoveryCode()}
          style={styles.forgotBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.forgotText}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee7fb',
  },
  title: { marginTop: 12, color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24 },
  subtitle: { marginTop: 7, color: '#9f8b96', fontFamily: 'Inter_400Regular', fontSize: 13 },
  pinCard: {
    width: '78%',
    alignItems: 'center',
    marginTop: 22,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0e0e5',
    backgroundColor: '#fffafb',
  },
  pinCardError: { borderColor: '#e67b92', backgroundColor: '#fff6f7' },
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
  forgotBtn: {
    paddingVertical: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
    backgroundColor: '#fbe9ee',
    borderWidth: 1,
    borderColor: '#f0ccd5',
    marginTop: 8,
  },
  biometricText: {
    color: '#c74768',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  forgotText: {
    fontSize: 14,
    color: '#a08b95',
    fontFamily: 'Inter_500Medium',
  },
  recoveryScreen: { flex: 1, paddingHorizontal: 22 },
  recoveryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recoveryBack: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf2f5' },
  recoveryHeaderTitle: { color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 23 },
  recoveryHero: { alignItems: 'center', marginTop: 48 },
  recoveryIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee7fb' },
  recoveryTitle: { marginTop: 22, color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25 },
  recoverySubtitle: { marginTop: 9, color: '#9b8792', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  recoveryCard: { marginTop: 36, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: '#efdee3', backgroundColor: '#fffafb' },
  recoveryLabel: { color: '#9f8994', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  recoveryInput: { height: 66, marginTop: 12, borderRadius: 17, borderWidth: 1, borderColor: '#ead6dc', backgroundColor: '#fff', color: '#2b1b25', fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: 10, textAlign: 'center' },
  recoveryInputError: { borderColor: '#d85a79', backgroundColor: '#fff7f8' },
  recoveryHint: { marginTop: 10, color: '#aa98a1', fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center' },
  recoveryError: { marginTop: 10, color: '#c74768', fontFamily: 'Inter_500Medium', fontSize: 11, textAlign: 'center' },
  recoveryActions: { marginTop: 'auto', paddingTop: 26 },
  recoveryPrimary: { ...smittenGlassButton, height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  recoveryPrimaryDisabled: { opacity: 0.45 },
  recoveryPrimaryText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  resendButton: { height: 48, alignItems: 'center', justifyContent: 'center' },
  resendText: { color: '#c74768', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  recoveryNote: { color: '#a08d96', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
