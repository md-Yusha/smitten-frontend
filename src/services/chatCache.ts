import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiMessage } from './chatApi';

const PREFIX = 'smitten:chat:';

type CachedThread = {
  messages: ApiMessage[];
  savedAt: string;
};

export async function readChatCache(coupleId: string): Promise<ApiMessage[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${coupleId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedThread;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed.messages;
  } catch {
    return null;
  }
}

export async function writeChatCache(coupleId: string, messages: ApiMessage[]): Promise<void> {
  try {
    const payload: CachedThread = { messages, savedAt: new Date().toISOString() };
    await AsyncStorage.setItem(`${PREFIX}${coupleId}`, JSON.stringify(payload));
  } catch {
    /* best-effort */
  }
}

export async function clearChatCache(coupleId?: string): Promise<void> {
  try {
    if (coupleId) {
      await AsyncStorage.removeItem(`${PREFIX}${coupleId}`);
      return;
    }
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    /* best-effort */
  }
}
