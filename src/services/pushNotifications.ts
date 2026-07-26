import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationsApi } from './notificationsApi';
import { getAccessToken } from './tokenStorage';
import { shouldShowMessageNotification } from '@/src/store/pushActivityStore';

// NOTE: setNotificationHandler is registered at app startup in app/_layout.tsx
// so it is guaranteed to be set before any notification arrives.

export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F05A28',
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('games', {
    name: 'Games',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3498DB',
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('buzz', {
    name: 'Buzz',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 100, 300],
    lightColor: '#FF69B4',
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('updates', {
    name: 'Updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#9B59B6',
    sound: 'default',
  });
}

function resolveExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return (
    extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  );
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[push] running on simulator/emulator, attempting to get push token anyway');
  }

  await ensureAndroidNotificationChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId = resolveExpoProjectId();
  if (!projectId) {
    console.warn(
      '[push] EXPO_PUBLIC_EAS_PROJECT_ID is not set — push tokens may fail on release APK builds. Run `eas init` and add the project id to .env.',
    );
  }
  try {
    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e: any) {
    console.warn('[push] could not get Expo push token', e);
    return null;
  }
}

export async function registerPushTokenWithBackend(): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.log('[push] skipping backend registration until auth token is ready');
    return false;
  }

  const token = await getExpoPushToken();
  if (!token) {
    console.warn('[push] No Expo push token fetched.');
    return false;
  }
  try {
    await notificationsApi.registerPushToken(token);
    return true;
  } catch (err: any) {
    const isExpiredAuth =
      err?.status === 401 ||
      (err?.name === 'ApiError' && String(err?.message ?? '').toLowerCase().includes('token'));
    if (isExpiredAuth) {
      console.log('[push] skipping backend registration because the auth session expired');
      return false;
    }
    console.error('[push] failed to send token to backend', err);
    return false;
  }
}

export async function unregisterPushTokenFromBackend(): Promise<void> {
  try {
    await notificationsApi.unregisterPushToken();
  } catch {
    /* offline or already logged out */
  }
}

export async function showLocalMessageNotification(title: string, body: string) {
  if (!shouldShowMessageNotification()) return;
  await ensureAndroidNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { type: 'chat_message' },
      ...(Platform.OS === 'android' ? { channelId: 'messages' } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
}
