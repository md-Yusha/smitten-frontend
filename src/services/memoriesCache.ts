import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiMemory } from '@/src/services/memoriesApi';

const PREFIX = 'smitten:memories:';

export async function readMemoriesCache(coupleId: string): Promise<ApiMemory[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${coupleId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { memories: ApiMemory[] };
    return Array.isArray(parsed.memories) ? parsed.memories : null;
  } catch {
    return null;
  }
}

export async function writeMemoriesCache(coupleId: string, memories: ApiMemory[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIX}${coupleId}`, JSON.stringify({ memories }));
  } catch {
    /* best-effort */
  }
}
