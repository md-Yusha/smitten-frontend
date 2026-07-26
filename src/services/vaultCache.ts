import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VaultItem } from '@/src/services/vaultApi';

const PREFIX = 'smitten:vault:';

type CachedVault = {
  items: VaultItem[];
  savedAt: string;
};

export async function readVaultCache(coupleId: string): Promise<VaultItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${coupleId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedVault;
    if (!Array.isArray(parsed.items)) return null;
    return parsed.items.filter((item) => (item.visibility ?? 'PRIVATE') === 'PRIVATE');
  } catch {
    return null;
  }
}

export async function writeVaultCache(coupleId: string, items: VaultItem[]): Promise<void> {
  try {
    const payload: CachedVault = {
      items: items.filter((item) => (item.visibility ?? 'PRIVATE') === 'PRIVATE'),
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(`${PREFIX}${coupleId}`, JSON.stringify(payload));
  } catch {
    /* best-effort */
  }
}
