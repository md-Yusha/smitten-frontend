import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'smitten:notification:intent';
const LAST_RESPONSE_KEY = 'smitten:notification:last-response-id';

export type NotificationIntent =
  | { type: 'chat' }
  | { type: 'love_ping'; kind?: string }
  | { type: 'love_challenge' }
  | { type: 'calendar' }
  | { type: 'home' };

export async function saveNotificationIntent(intent: NotificationIntent): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(intent));
  } catch {
    /* best-effort */
  }
}

export async function consumeNotificationIntent(): Promise<NotificationIntent | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as NotificationIntent;
    return parsed?.type ? parsed : null;
  } catch {
    return null;
  }
}

export async function claimNotificationResponse(responseId: string | undefined): Promise<boolean> {
  if (!responseId) return true;
  try {
    const previous = await AsyncStorage.getItem(LAST_RESPONSE_KEY);
    if (previous === responseId) return false;
    await AsyncStorage.setItem(LAST_RESPONSE_KEY, responseId);
    return true;
  } catch {
    return true;
  }
}
