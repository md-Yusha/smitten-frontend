import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiUser } from '@/src/services/api';

const KEY = 'smitten:session:user';

export async function readSessionCache(): Promise<ApiUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

export async function writeSessionCache(user: ApiUser): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* best-effort */
  }
}

export async function clearSessionCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
