import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'smitten_profile_v1_';

export type PersistedProfile = {
  nicknameSelf?: string;
  partnerPetName?: string;
  avatarSelf?: string;
  avatarPartner?: string;
  chatDisappearingAfterMs: number | null;
};

function storageKey(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

export async function readPersistedProfile(userId: string): Promise<PersistedProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedProfile;
  } catch {
    return null;
  }
}

export async function writePersistedProfile(userId: string, p: PersistedProfile): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(p));
}

/** Clears cached profile for one account (not called on normal logout). */
export async function clearPersistedProfile(userId?: string): Promise<void> {
  if (userId) {
    await AsyncStorage.removeItem(storageKey(userId));
    return;
  }
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(KEY_PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}
