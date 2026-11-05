import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, LogBox, Platform, View, Text } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';
import '../global.css';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider } from '../context/ThemeContext';
import { SmittenAlertProvider } from '@/src/components/ui/SmittenAlertProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ensureAndroidNotificationChannel } from '@/src/services/pushNotifications';
import { shouldShowMessageNotification } from '@/src/store/pushActivityStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { goToLanding } from '@/src/services/authNavigation';
import { canAccessApp, needsStory } from '@/src/services/session';
import { PinLockScreen } from '@/src/components/ui/PinLockScreen';
import { authenticateWithDeviceBiometrics } from '@/src/services/biometrics';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { useCoupleSync } from '@/src/hooks/useCoupleSync';
import { useCoupleLoveStore } from '@/src/store/coupleLoveStore';
import { LoveOverlayHost } from '@/src/components/love/LoveOverlayHost';
import { Ionicons } from '@expo/vector-icons';
import { BUZZ_OPTIONS, buzzImageFor } from '@/constants/buzzAssets';

LogBox.ignoreLogs(['Unable to activate keep awake']);

// Keep the native splash visible until first-screen fonts and images are locally ready.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const SmittenLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#F05A28',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    border: 'rgba(26, 26, 26, 0.08)',
    notification: '#F05A28',
  },
};

/** If logout leaves us on tabs/chat/auth, force a full reset to landing. */
function AuthNavigationGuard() {
  const signedOut = useAuthStore((s) => s.signedOut);
  const segments = useSegments();

  useEffect(() => {
    if (!signedOut) return;
    const root = segments[0];
    if (root === '(tabs)' || root === 'chat') {
      goToLanding();
    }
  }, [signedOut, segments]);

  return null;
}

function SubscriptionNavigationGuard() {
  const apiUser = useAuthStore((s) => s.apiUser);
  const signedOut = useAuthStore((s) => s.signedOut);
  const isSigningOut = useAuthStore((s) => s.isSigningOut);
  const segments = useSegments();
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (signedOut || isSigningOut || !apiUser) return;
    const root = segments[0];
    if (root === '(tabs)' || root === 'chat') {
      if (needsStory(apiUser)) {
        router.replace('/auth/story');
      } else if (!canAccessApp(apiUser)) {
        router.replace('/auth/payment');
      }
    }
  }, [apiUser, isSigningOut, router, segments, signedOut, tick]);

  return null;
}

const SUBSCRIPTION_REMINDER_KEY = 'smitten:subscriptionRenewalReminderDay';

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function SubscriptionRenewalReminder() {
  const apiUser = useAuthStore((s) => s.apiUser);

  useEffect(() => {
    void (async () => {
      if (!apiUser?.isCoupleOwner || !apiUser.subscriptionExpiresAt) {
        return;
      }

      const expiresAt = new Date(apiUser.subscriptionExpiresAt).getTime();
      if (!Number.isFinite(expiresAt)) return;
      const msLeft = expiresAt - Date.now();
      if (msLeft <= 0 || msLeft > 7 * 24 * 60 * 60 * 1000) return;

      const today = dateKey();
      const reminderKey = `${apiUser.id}:${apiUser.subscriptionExpiresAt}:${today}`;
      const existing = await AsyncStorage.getItem(SUBSCRIPTION_REMINDER_KEY);
      if (existing === reminderKey) return;

      const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Renew your Smittenz subscription',
          body: `Your plan expires in ${daysLeft === 1 ? '1 day' : `${daysLeft} days`}. Renew or upgrade to keep your private space unlocked.`,
          data: { type: 'subscription_renewal_reminder' },
        },
        trigger: null,
      });
      await AsyncStorage.setItem(SUBSCRIPTION_REMINDER_KEY, reminderKey);
    })();
  }, [apiUser?.id, apiUser?.isCoupleOwner, apiUser?.subscriptionExpiresAt]);

  return null;
}

/** Hydrate on boot, lock on background, show PIN overlay when locked. */
function AppLockGuard() {
  const { locked, lock, unlock, hydrate, verifyPin, biometricEnabled, biometricCapability, setUserScope } = useAppLockStore();
  const apiUserId = useAuthStore((s) => s.apiUser?.id ?? null);
  const isAuthenticated = !!apiUserId;

  useEffect(() => {
    void setUserScope(apiUserId);
  }, [apiUserId, setUserScope]);

  useEffect(() => {
    void hydrate();
  }, [hydrate, apiUserId]);

  useEffect(() => {
    let backgroundTime: number | null = null;

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        backgroundTime = Date.now();
      } else if (next === 'active') {
        if (backgroundTime !== null) {
          const elapsed = Date.now() - backgroundTime;
          // Grace period: lock only if in background for > 3 seconds
          if (elapsed > 3000) {
            lock();
          }
          backgroundTime = null;
        }
      }
    });
    return () => sub.remove();
  }, [lock]);

  if (!locked || !isAuthenticated) return null;

  return (
    <PinLockScreen
      onSuccess={unlock}
      onVerify={verifyPin}
      biometricEnabled={biometricEnabled}
      biometricCapability={biometricCapability}
      onBiometricUnlock={() => authenticateWithDeviceBiometrics(biometricCapability)}
    />
  );
}

function PushNotificationInitializer() {
  usePushNotifications();
  return null;
}

function CoupleLiveHost() {
  useCoupleSync();
  const coupleId = useAuthStore((state) => state.apiUser?.coupleId);
  const fetchPendingLove = useCoupleLoveStore((state) => state.fetchPending);

  useEffect(() => {
    if (!coupleId) return;
    void fetchPendingLove();
    const retryTimers = [500, 1500, 3500].map((delay) => setTimeout(() => void fetchPendingLove(), delay));
    return () => retryTimers.forEach(clearTimeout);
  }, [coupleId, fetchPendingLove]);

  return <LoveOverlayHost />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
  });
  const [startupImagesLoaded, setStartupImagesLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const startupAssets = [
      require('../assets/images/app_icon_square.png'),
      ...BUZZ_OPTIONS.map((option) => option.image),
      buzzImageFor('anger', 'received'),
    ];
    void Asset.loadAsync(startupAssets)
      .then(([logo]) => ExpoImage.prefetch(logo.localUri ?? logo.uri, 'memory-disk'))
      .catch((error) => {
        console.warn('[Smittenz] Startup image preload failed:', error);
      })
      .finally(() => {
        if (mounted) setStartupImagesLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const startupReady = (fontsLoaded || Boolean(fontError)) && startupImagesLoaded;

  useEffect(() => {
    if (startupReady) {
      void SplashScreen.hideAsync();
    }
  }, [startupReady]);

  useEffect(() => {
    if (fontError) {
      console.warn('[Smittenz] Font load failed, using system fallbacks:', fontError);
    }
  }, [fontError]);

  // ── Step 3 & 4: Set notification handler + create channels + request permission at startup ──
  useEffect(() => {
    // Must be set before any notification arrives
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Only suppress chat-message notifications when the user is actively on the chat screen.
        // All other notification types (games, love pings, content updates) should always show.
        const data = notification.request.content.data as { type?: string } | undefined;
        const notifType = data?.type;

        let show = true;
        if (notifType === 'chat_message') {
          show = shouldShowMessageNotification();
        }

        return {
          shouldShowBanner: show,
          shouldShowList: show,
          shouldPlaySound: show,
          shouldSetBadge: false,
        };
      },
    });

    async function bootstrapNotifications() {
      // Create Android channels at launch. Permission is requested later,
      // after authentication, so first-run onboarding is never interrupted.
      await ensureAndroidNotificationChannel();
    }

    void bootstrapNotifications();
  }, []);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_DISABLE_SCREENSHOT_BLOCK === 'true') {
      void ScreenCapture.allowScreenCaptureAsync();
      return;
    }

    void ScreenCapture.preventScreenCaptureAsync();

    let subscription: { remove: () => void } | null = null;
    if (Platform.OS === 'ios') {
      subscription = ScreenCapture.addScreenshotListener(() => {
        setIsBlackedOut(true);
        const timer = setTimeout(() => {
          setIsBlackedOut(false);
        }, 2000);
        return () => clearTimeout(timer);
      });
    }

    return () => {
      if (process.env.EXPO_PUBLIC_DISABLE_SCREENSHOT_BLOCK === 'true') {
        void ScreenCapture.allowScreenCaptureAsync();
      }
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  if (!startupReady) return null;

  if (isBlackedOut) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
          Screenshots are not allowed
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SmittenAlertProvider>
        <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : SmittenLightTheme}>
          <PushNotificationInitializer />
          <AuthNavigationGuard />
          <SubscriptionNavigationGuard />
          <SubscriptionRenewalReminder />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FFFFFF' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="login" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="terms-and-conditions" />
            <Stack.Screen name="faq" />
            <Stack.Screen name="community-guidelines" />
            <Stack.Screen name="auth/have-key" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/connect" />
            <Stack.Screen name="auth/payment" />
            <Stack.Screen name="auth/your-key" />
            <Stack.Screen name="auth/story" />
            <Stack.Screen name="payment-complete" options={{ animation: 'fade' }} />
            <Stack.Screen name="account-deleted" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="self-profile" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <CoupleLiveHost />
          <StatusBar style="light" translucent />
          <AppLockGuard />
        </NavThemeProvider>
        </SmittenAlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
