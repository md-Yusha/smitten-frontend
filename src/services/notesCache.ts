import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiNote } from '@/src/services/notesApi';

const key = (coupleId: string) => `smitten:notes:${coupleId}`;

export async function readNotesCache(coupleId: string): Promise<ApiNote[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key(coupleId));
    if (!raw) return null;
    return JSON.parse(raw) as ApiNote[];
  } catch {
    return null;
  }
}

export async function writeNotesCache(coupleId: string, notes: ApiNote[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key(coupleId), JSON.stringify(notes));
  } catch {
    /* best-effort */
  }
}

const seenKey = (coupleId: string) => `smitten:notes-seen:${coupleId}`;

export async function readNotesLastSeen(coupleId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(seenKey(coupleId));
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export async function writeNotesLastSeen(coupleId: string, at = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(seenKey(coupleId), String(at));
  } catch {
    /* best-effort */
  }
}
