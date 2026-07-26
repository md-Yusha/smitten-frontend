import { useTheme } from '@/context/ThemeContext';
import { hasCompletedOnboarding } from '@/src/services/onboarding';
import { canAccessApp, needsKeyDisplay, needsPayment, needsStory } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SmittenColors } from '@/constants/smittenTheme';
import { FreshLaunchLoading } from '@/src/components/launch/SmittenLaunchAnimations';

export default function EntryScreen() {
  const { sessionReady } = useTheme();
  const apiUser = useAuthStore((state) => state.apiUser);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const signedOut = useAuthStore((state) => state.signedOut);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [freshIntroComplete, setFreshIntroComplete] = useState(false);

  useEffect(() => {
    let mounted = true;
    void hasCompletedOnboarding()
      .then((complete) => {
        if (mounted) setOnboardingComplete(complete);
      })
      .catch(() => {
        if (mounted) setOnboardingComplete(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (onboardingComplete !== false) return;
    const timer = setTimeout(() => setFreshIntroComplete(true), 2800);
    return () => clearTimeout(timer);
  }, [onboardingComplete]);

  if (onboardingComplete === false && !freshIntroComplete) {
    return <FreshLaunchLoading />;
  }

  if (onboardingComplete === null || !sessionReady || (isHydrating && !signedOut && !apiUser)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={SmittenColors.accentBrand} />
      </View>
    );
  }

  if (!onboardingComplete) return <Redirect href={'/onboarding' as any} />;
  if (!apiUser || signedOut) return <Redirect href="/login" />;
  if (needsPayment(apiUser)) return <Redirect href="/auth/payment" />;
  if (needsStory(apiUser) && needsKeyDisplay(apiUser)) return <Redirect href="/auth/your-key" />;
  if (needsStory(apiUser)) return <Redirect href="/auth/story" />;
  if (canAccessApp(apiUser)) return <Redirect href="/(tabs)" />;
  if (needsKeyDisplay(apiUser)) return <Redirect href="/auth/your-key" />;
  return <Redirect href={'/auth/connect' as any} />;
}
