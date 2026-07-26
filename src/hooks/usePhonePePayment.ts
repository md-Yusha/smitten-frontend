import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { paymentsApi } from '@/src/services/paymentsApi';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';

type Plan = 'monthly' | 'quarterly' | 'yearly';

const PLAN_AMOUNTS: Record<Plan, number> = {
  monthly: 99,
  quarterly: 199,
  yearly: 599,
};

export function usePhonePePayment() {
  const [paying, setPaying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const resumePendingPayment = useCallback(
    async (
      onCompleted: (inviteCode: string, user?: import('@/src/services/api').ApiUser) => void,
      onFailed?: () => void,
    ) => {
      const pending = await paymentsApi.loadPendingPayment();
      if (!pending) return false;

      setPaying(true);
      try {
        const result = await paymentsApi.pollUntilSettled(pending.merchantOrderId);
        await paymentsApi.clearPendingPayment();
        if (result.state === 'COMPLETED' && result.invite_code) {
          onCompleted(result.invite_code, result.user);
          return true;
        }
        onFailed?.();
        return false;
      } catch {
        return false;
      } finally {
        setPaying(false);
      }
    },
    [],
  );

  const payWithPhonePe = useCallback(
    async (
      plan: Plan,
      options: {
        phonepeConfigured: boolean;
        onCompleted: (inviteCode: string, user?: import('@/src/services/api').ApiUser) => void;
        onMockCompleted?: (inviteCode: string, user: import('@/src/services/api').ApiUser) => void;
      },
    ) => {
      setPaying(true);
      stopPolling();

      try {
        if (options.phonepeConfigured !== true) {
          if (options.phonepeConfigured === false) {
            const mock = await paymentsApi.mockCheckout(plan);
            options.onMockCompleted?.(mock.inviteCode, mock.user);
            return;
          }
          throw new Error('Payment options are still loading. Please try again.');
        }

        await paymentsApi.clearPendingPayment();

        const initiated = await paymentsApi.initiate(plan);
        if (!initiated.success || !initiated.redirect_url) {
          throw new Error('Could not start payment');
        }

        await paymentsApi.savePendingPayment({
          merchantOrderId: initiated.merchant_order_id,
          plan,
          amount: PLAN_AMOUNTS[plan],
        });

        const canOpen = await Linking.canOpenURL(initiated.redirect_url);
        if (!canOpen) {
          throw new Error('Cannot open PhonePe checkout URL');
        }
        await Linking.openURL(initiated.redirect_url);

        pollRef.current = setInterval(async () => {
          try {
            const verified = await paymentsApi.verify(initiated.merchant_order_id);
            if (verified.state === 'COMPLETED') {
              stopPolling();
              await paymentsApi.clearPendingPayment();
              setPaying(false);
              if (verified.invite_code) {
                options.onCompleted(verified.invite_code, verified.user);
              }
            } else if (verified.state === 'FAILED') {
              stopPolling();
              await paymentsApi.clearPendingPayment();
              setPaying(false);
              smittenAlert({
                title: 'Payment failed',
                message: 'Your payment could not be completed. Please try again.',
                tone: 'error',
              });
            }
          } catch {
            /* keep polling */
          }
        }, 10_000);
      } catch (e) {
        stopPolling();
        smittenAlertFromError(e, 'Payment failed', 'error');
        throw e;
      } finally {
        if (!pollRef.current) {
          setPaying(false);
        }
      }
    },
    [stopPolling],
  );

  return { paying, payWithPhonePe, resumePendingPayment, stopPolling };
};
