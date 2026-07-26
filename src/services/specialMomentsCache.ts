import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiSpecialMoment } from '@/src/services/specialMomentsApi';

const key = (coupleId: string) => `smitten:special-moments:${coupleId}`;

export async function readSpecialMomentsCache(coupleId: string): Promise<ApiSpecialMoment[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key(coupleId));
    if (!raw) return null;
    return JSON.parse(raw) as ApiSpecialMoment[];
  } catch {
    return null;
  }
}

export async function writeSpecialMomentsCache(
  coupleId: string,
  moments: ApiSpecialMoment[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(key(coupleId), JSON.stringify(moments));
  } catch {
    /* best-effort */
  }
}
