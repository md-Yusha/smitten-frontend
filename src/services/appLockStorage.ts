import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_LOCK_ENABLED = 'smitten:appLockEnabled';
const KEY_LOCK_PIN = 'smitten:appLockPin';
const KEY_BIOMETRIC_ENABLED = 'smitten:appLockBiometricEnabled';

function scopedKey(baseKey: string, userId?: string | null): string {
  return userId ? `${baseKey}:${userId}` : baseKey;
}

export async function isAppLockEnabled(userId?: string | null): Promise<boolean> {
  const val = await AsyncStorage.getItem(scopedKey(KEY_LOCK_ENABLED, userId));
  return val === '1';
}

export async function setAppLockEnabled(enabled: boolean, userId?: string | null): Promise<void> {
  await AsyncStorage.setItem(scopedKey(KEY_LOCK_ENABLED, userId), enabled ? '1' : '0');
}

export async function getStoredPin(userId?: string | null): Promise<string | null> {
  return AsyncStorage.getItem(scopedKey(KEY_LOCK_PIN, userId));
}

export async function setStoredPin(pin: string, userId?: string | null): Promise<void> {
  await AsyncStorage.setItem(scopedKey(KEY_LOCK_PIN, userId), pin);
}

export async function isBiometricEnabled(userId?: string | null): Promise<boolean> {
  const val = await AsyncStorage.getItem(scopedKey(KEY_BIOMETRIC_ENABLED, userId));
  return val === '1';
}

export async function setBiometricEnabled(enabled: boolean, userId?: string | null): Promise<void> {
  await AsyncStorage.setItem(scopedKey(KEY_BIOMETRIC_ENABLED, userId), enabled ? '1' : '0');
}

export async function clearAppLock(userId?: string | null): Promise<void> {
  const keys = [
    scopedKey(KEY_LOCK_ENABLED, userId),
    scopedKey(KEY_LOCK_PIN, userId),
    scopedKey(KEY_BIOMETRIC_ENABLED, userId),
  ];

  if (userId) {
    keys.push(KEY_LOCK_ENABLED, KEY_LOCK_PIN, KEY_BIOMETRIC_ENABLED);
  }

  await AsyncStorage.multiRemove(keys);
}
