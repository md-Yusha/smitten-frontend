import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'smitten:game-notices:';
const BASELINE_PREFIX = 'smitten:game-notices-baseline:';

function key(userId: string) {
  return `${PREFIX}${userId}`;
}

function baselineKey(userId: string) {
  return `${BASELINE_PREFIX}${userId}`;
}

export async function getGameNoticeBaseline(userId: string): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(baselineKey(userId));
    if (existing) return existing;
    const baseline = new Date().toISOString();
    await AsyncStorage.setItem(baselineKey(userId), baseline);
    return baseline;
  } catch {
    return new Date().toISOString();
  }
}

export async function hasSeenGameNotice(userId: string, noticeId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) && ids.includes(noticeId);
  } catch {
    return false;
  }
}

export async function markSeenGameNotice(userId: string, noticeId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    const parsed = JSON.parse(raw || '[]') as unknown;
    const ids = Array.isArray(parsed) ? (parsed as string[]) : [];
    const next = ids.includes(noticeId) ? ids : [...ids.slice(-100), noticeId];
    await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  } catch {
    /* best-effort */
  }
}
