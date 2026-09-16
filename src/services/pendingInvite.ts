import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_INVITE_KEY = 'smitten:pending-invite-code';

export function normalizeInviteCode(value: string | null | undefined): string {
  return (value ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
}

export async function savePendingInviteCode(value: string): Promise<void> {
  const code = normalizeInviteCode(value);
  if (code) await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
}

export async function getPendingInviteCode(): Promise<string | null> {
  const value = await AsyncStorage.getItem(PENDING_INVITE_KEY);
  const code = normalizeInviteCode(value);
  return code || null;
}

export async function clearPendingInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}
