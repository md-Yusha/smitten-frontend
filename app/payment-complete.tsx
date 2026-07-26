import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { UnMeColors } from '@/constants/smittenTheme';
import { paymentsApi } from '@/src/services/paymentsApi';
import { useAuthStore } from '@/src/store/useAuthStore';

type ReturnState = 'checking' | 'failed' | 'pending' | 'missing';

export default function PaymentCompleteScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const checkingRef = useRef(false);
  const [state, setState] = useState<ReturnState>('checking');

  const verifyPayment = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setState('checking');

    try {
      const pending = await paymentsApi.loadPendingPayment();
      if (!pending) {
        setState('missing');
        return;
      }

      const result = await paymentsApi.pollUntilSettled(pending.merchantOrderId);
      if (result.state === 'COMPLETED' && result.invite_code) {
        await paymentsApi.clearPendingPayment();
        if (result.user) setSession(result.user, true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/auth/your-key', params: { code: result.invite_code } });
        return;
      }

      if (result.state === 'FAILED') {
        await paymentsApi.clearPendingPayment();
        setState('failed');
        return;
      }

      setState('pending');
    } catch {
      setState('pending');
    } finally {
      checkingRef.current = false;
    }
  }, [router, setSession]);

  useEffect(() => {
    void verifyPayment();
  }, [verifyPayment]);

  const message =
    state === 'failed'
      ? 'The payment was not completed. You can return and try again.'
      : state === 'missing'
        ? 'We could not find a payment waiting to be verified.'
        : state === 'pending'
          ? 'PhonePe has not confirmed the payment yet. Tap below to check again.'
          : 'Please wait while we confirm your payment with PhonePe.';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.mark}>
          {state === 'checking' ? (
            <ActivityIndicator size="large" color={UnMeColors.m7} />
          ) : (
            <Text style={styles.markText}>{state === 'failed' ? '!' : '♥'}</Text>
          )}
        </View>
        <Text style={styles.title}>{state === 'checking' ? 'Confirming payment' : 'Payment update'}</Text>
        <Text style={styles.message}>{message}</Text>

        {state === 'pending' ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => void verifyPayment()}>
            <Text style={styles.primaryButtonText}>Check again</Text>
          </TouchableOpacity>
        ) : null}

        {state !== 'checking' ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/auth/payment')}>
            <Text style={styles.secondaryButtonText}>Back to plans</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
  },
  mark: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbebef',
    marginBottom: 24,
  },
  markText: {
    color: UnMeColors.m7,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 38,
  },
  title: {
    color: UnMeColors.txDark,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    marginBottom: 30,
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: UnMeColors.m7,
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: UnMeColors.m7,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
