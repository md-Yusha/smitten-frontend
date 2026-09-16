import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { WhiteAuthButtonContent, WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { paymentsApi } from '@/src/services/paymentsApi';
import { usePhonePePayment } from '@/src/hooks/usePhonePePayment';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { smittenAlert } from '@/src/components/ui/SmittenAlertProvider';
import { UnMeColors } from '@/constants/smittenTheme';
import { useAuthNavigation } from '@/src/hooks/useAuthNavigation';
import { Ionicons } from '@expo/vector-icons';

type PlanId = 'monthly' | 'quarterly' | 'yearly';

const PLANS: { id: PlanId; label: string; price: string; days: number; rank: number; note: string }[] = [
  { id: 'monthly', label: 'Monthly', price: '99', days: 30, rank: 1, note: '30 days of full access' },
  { id: 'quarterly', label: 'Quarterly', price: '199', days: 90, rank: 2, note: 'Best value — 90 days' },
  { id: 'yearly', label: 'Yearly', price: '599', days: 365, rank: 3, note: '365 days of full access' },
];

const planLabel = (value: PlanId | null | undefined) => PLANS.find((p) => p.id === value)?.label ?? 'No active plan';

function remainingDays(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

type PayConfig = {
  phonepeConfigured: boolean;
  redirectError: string | null;
  pollOnlyMode: boolean;
  sandboxUsesCardFlow: boolean;
};

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ plan?: string }>();
  const requestedPlan: PlanId = params.plan === 'quarterly' || params.plan === 'yearly' ? params.plan : 'monthly';
  const [plan, setPlan] = useState<PlanId>(requestedPlan);
  const [payConfig, setPayConfig] = useState<PayConfig | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const apiUser = useAuthStore((s) => s.apiUser);
  const router = useRouter();
  const navigateForUser = useAuthNavigation();
  const { paying, payWithPhonePe, resumePendingPayment } = usePhonePePayment();
  const partnerLocked = Boolean(apiUser?.coupleId && !apiUser.isCoupleOwner && !apiUser.coupleHasActiveSubscription);
  const ownerRenewal = Boolean(apiUser?.isCoupleOwner && apiUser.coupleId && !apiUser.hasActiveSubscription);
  const currentPlan = apiUser?.subscriptionPlan ?? apiUser?.coupleSubscriptionPlan ?? null;
  const activeOwnerPlan = apiUser?.isCoupleOwner && apiUser.hasActiveSubscription ? apiUser.subscriptionPlan : null;
  const daysLeft = remainingDays(apiUser?.subscriptionExpiresAt ?? apiUser?.coupleSubscriptionExpiresAt);
  const currentPlanRank = PLANS.find((p) => p.id === activeOwnerPlan)?.rank ?? 0;
  const selectedPlan = PLANS.find((p) => p.id === plan) ?? PLANS[0];
  const selectedPlanRank = selectedPlan.rank;
  const isRenewingSamePlan = Boolean(activeOwnerPlan && plan === activeOwnerPlan);
  const isUpgradingPlan = Boolean(activeOwnerPlan && selectedPlanRank > currentPlanRank);

  useEffect(() => {
    if (activeOwnerPlan) {
      setPlan(activeOwnerPlan);
    }
  }, [activeOwnerPlan]);

  useEffect(() => {
    if (!ownerRenewal && !partnerLocked) return;
    smittenAlert({
      title: 'Subscription expired',
      message: partnerLocked
        ? 'Your private space is locked until the couple owner renews the subscription.'
        : 'Renew your subscription to unlock your private space again.',
      tone: 'warning',
    });
  }, [ownerRenewal, partnerLocked]);

  useEffect(() => {
    paymentsApi
      .getConfig()
      .then((c) =>
        setPayConfig({
          phonepeConfigured: c.phonepeConfigured,
          redirectError: c.redirectError,
          pollOnlyMode: c.pollOnlyMode,
          sandboxUsesCardFlow: c.sandboxUsesCardFlow,
        }),
      )
      .catch(() =>
        setPayConfig({
          phonepeConfigured: false,
          redirectError: null,
          pollOnlyMode: false,
          sandboxUsesCardFlow: false,
        }),
      );
  }, []);

  const goToKey = useCallback(
    (inviteCode: string, user?: typeof apiUser) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (user?.coupleStatus === 'active') {
        navigateForUser(user);
        return;
      }
      router.replace({
        pathname: '/auth/your-key',
        params: { code: inviteCode },
      });
    },
    [navigateForUser, router],
  );

  const tryResumePending = useCallback(async () => {
    if (!payConfig?.phonepeConfigured || payConfig.redirectError) return;
    const pending = await paymentsApi.loadPendingPayment();
    if (!pending) return;

    await resumePendingPayment((inviteCode, user) => {
      if (user) setSession(user, true);
      goToKey(inviteCode, user ?? null);
    });
  }, [payConfig, resumePendingPayment, goToKey, setSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void tryResumePending();
    });
    return () => sub.remove();
  }, [tryResumePending]);

  const onPay = async () => {
    if (!payConfig) return;
    if (partnerLocked) {
      smittenAlert({
        title: 'Subscription expired',
        message: 'Ask the couple owner to renew the subscription to unlock your private space again.',
        tone: 'warning',
      });
      return;
    }

    if (payConfig.phonepeConfigured && payConfig.redirectError) {
      smittenAlert({
        title: 'PhonePe setup required',
        message: payConfig.redirectError,
        tone: 'warning',
      });
      return;
    }

    try {
      await payWithPhonePe(plan, {
        phonepeConfigured: payConfig.phonepeConfigured,
        onCompleted: (inviteCode, user) => {
          if (user) setSession(user, true);
          goToKey(inviteCode, user ?? null);
        },
        onMockCompleted: (inviteCode, user) => {
          setSession(user, true);
          goToKey(inviteCode, user);
        },
      });
    } catch {
      /* alert shown in hook */
    }
  };

  const statusMessage = (() => {
    if (partnerLocked) {
      return 'Your subscription has ended. Ask the couple owner to renew before you can use Smittenz again.';
    }
    if (!payConfig) return 'Checking payment setup…';
    if (!payConfig.phonepeConfigured) {
      return 'PhonePe is not configured on the server — mock checkout is used for local testing.';
    }
    if (payConfig.redirectError) {
      return payConfig.redirectError;
    }
    if (payConfig.pollOnlyMode && payConfig.sandboxUsesCardFlow) {
      return 'Sandbox (poll-only, no tunnel): on PhonePe choose Debit/Credit Card or Net Banking — not UPI. Card 4242 4242 4242 4242, expiry 12/2027, CVV 936, OTP 123456. Return to Smittenz after paying.';
    }
    if (payConfig.sandboxUsesCardFlow) {
      return 'Sandbox: choose Debit/Credit Card or Net Banking on the PhonePe page. Test card 4242 4242 4242 4242, OTP 123456. Return to Smittenz after pay.';
    }
    return 'You will complete payment in PhonePe. Return here after paying.';
  })();

  const payBlocked = partnerLocked || !payConfig || paying || Boolean(payConfig?.redirectError && payConfig.phonepeConfigured);
  const screenTitle = apiUser?.isCoupleOwner && apiUser.coupleId ? 'Manage subscription' : ownerRenewal ? 'Renew your plan' : 'Choose your plan';
  const screenSubtitle = partnerLocked
    ? 'Your private couple space is locked until the owner renews.'
    : ownerRenewal
      ? 'Pick a plan to start the next cycle and unlock your private couple space again.'
      : apiUser?.isCoupleOwner && apiUser.coupleId
        ? 'Renew your current plan or upgrade to a higher plan.'
        : 'Pick a plan to unlock your private couple space.';
  const buttonLabel = partnerLocked
    ? 'Waiting for renewal'
    : isUpgradingPlan
      ? `Upgrade to ${selectedPlan.label}`
      : isRenewingSamePlan || ownerRenewal
        ? 'Renew & continue'
        : 'Pay & continue';

  return (
    <WhiteAuthShell
      title={screenTitle}
      subtitle={screenSubtitle}
      showBack={!apiUser?.coupleId && !apiUser?.isCoupleOwner}
      backFallback="/auth/connect"
      contentStyle={styles.content}
    >
      {apiUser?.isCoupleOwner && apiUser.coupleId ? (
        <View style={styles.currentPlanCard}>
          <Text style={styles.eyebrow}>Current plan</Text>
          <View style={styles.currentPlanRow}>
            <Text style={styles.currentPlanName}>{planLabel(currentPlan as PlanId | null)}</Text>
            <Text style={styles.daysLeft}>
              {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Expired'}
            </Text>
          </View>
          <Text style={styles.currentPlanNote}>
            Renewals add {selectedPlan.days} days after your remaining days, so paid time is carried forward.
          </Text>
        </View>
      ) : null}

      {!partnerLocked ? (
        <View style={styles.planList}>
          {PLANS.map((item) => {
            const selected = plan === item.id;
            const disabled = Boolean(activeOwnerPlan && item.rank < currentPlanRank);
            const badge =
              activeOwnerPlan && item.id === activeOwnerPlan
                ? 'Current'
                : item.id === 'quarterly'
                  ? 'Best value'
                  : null;
            return (
              <TouchableOpacity
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled }}
                activeOpacity={0.88}
                disabled={disabled}
                onPress={() => setPlan(item.id)}
                style={[styles.planCard, selected && styles.planCardSelected, disabled && styles.planDisabled]}
              >
                <View style={styles.radioOuter}>{selected ? <View style={styles.radioInner} /> : null}</View>
                <View style={styles.planCopy}>
                  <View style={styles.planTitleRow}>
                    <Text style={styles.planName}>{item.label}</Text>
                    {badge ? <Text style={styles.planBadge}>{badge}</Text> : null}
                  </View>
                  <Text style={styles.planNote}>{item.note}</Text>
                </View>
                <View style={styles.priceWrap}>
                  <Text style={styles.price}>₹{item.price}</Text>
                  <Text style={styles.priceSuffix}>
                    /{item.id === 'monthly' ? 'mo' : item.id === 'quarterly' ? '3 mo' : 'yr'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.statusCard, payConfig?.redirectError && styles.statusCardWarning]}>
        <Ionicons
          name={payConfig?.redirectError ? 'warning-outline' : 'shield-checkmark-outline'}
          size={20}
          color={payConfig?.redirectError ? '#a16207' : UnMeColors.m7}
        />
        <Text style={[styles.statusText, payConfig?.redirectError && styles.statusTextWarning]}>{statusMessage}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.88}
        disabled={payBlocked}
        onPress={() => void onPay()}
        style={[whiteAuthStyles.button, payBlocked && styles.payButtonDisabled]}
      >
        <WhiteAuthButtonContent label={buttonLabel} loading={paying} />
      </TouchableOpacity>

      <View style={styles.secureRow}>
        <Ionicons name="lock-closed" size={13} color={UnMeColors.txMuted} />
        <Text style={styles.secureText}>Secure checkout · Your invite code appears after payment</Text>
      </View>
    </WhiteAuthShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 4 },
  currentPlanCard: {
    borderWidth: 1,
    borderColor: '#ead8dd',
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 18,
    marginBottom: 20,
  },
  eyebrow: {
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  currentPlanRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  currentPlanName: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24 },
  daysLeft: { color: UnMeColors.m7, fontFamily: 'Inter_700Bold', fontSize: 14 },
  currentPlanNote: {
    marginTop: 8,
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  planList: { gap: 14, marginBottom: 22 },
  planCard: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ead8dd',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  planCardSelected: { borderWidth: 2, borderColor: UnMeColors.m7, backgroundColor: '#fff5f7' },
  planDisabled: { opacity: 0.45 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: UnMeColors.m7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: UnMeColors.m7 },
  planCopy: { flex: 1, paddingHorizontal: 13 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planName: { color: UnMeColors.txDark, fontFamily: 'Inter_700Bold', fontSize: 17 },
  planBadge: {
    color: UnMeColors.m7,
    backgroundColor: '#f8dfe6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    textTransform: 'uppercase',
  },
  planNote: { marginTop: 5, color: UnMeColors.txMuted, fontFamily: 'Inter_400Regular', fontSize: 12.5 },
  priceWrap: { alignItems: 'flex-end' },
  price: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 23 },
  priceSuffix: { marginTop: 1, color: UnMeColors.txMuted, fontFamily: 'Inter_400Regular', fontSize: 10.5 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#ead8dd',
    borderRadius: 17,
    backgroundColor: '#fff8fa',
    padding: 14,
    marginBottom: 20,
  },
  statusCardWarning: { borderColor: '#f0c96b', backgroundColor: '#fffbeb' },
  statusText: {
    flex: 1,
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  statusTextWarning: { color: '#854d0e' },
  payButtonDisabled: { opacity: 0.5 },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
  },
  secureText: {
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    textAlign: 'center',
  },
});
