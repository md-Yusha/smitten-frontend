import { create } from 'zustand';
import {
  isAppLockEnabled,
  setAppLockEnabled as persistEnabled,
  getStoredPin,
  setStoredPin as persistPin,
  isBiometricEnabled,
  setBiometricEnabled as persistBiometricEnabled,
  clearAppLock as clearStorage,
} from '@/src/services/appLockStorage';
import { getBiometricCapability, type BiometricCapability } from '@/src/services/biometrics';

interface AppLockState {
  userId: string | null;
  /** Whether app lock is toggled on in settings. */
  enabled: boolean;
  /** Whether a PIN has been set. */
  hasPin: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricCapability: BiometricCapability;
  /** Whether the app is currently locked (needs PIN entry). */
  locked: boolean;
  isHydrated: boolean;
  isSystemOverlayActive: boolean;
  /** Select which account owns the app-lock settings on this device. */
  setUserScope: (userId: string | null) => Promise<void>;
  /** Hydrate from AsyncStorage on boot. */
  hydrate: () => Promise<void>;
  /** Toggle app lock on/off. The stored PIN is shared with Vault and is kept. */
  setEnabled: (v: boolean) => Promise<void>;
  setBiometricEnabled: (v: boolean) => Promise<void>;
  refreshBiometricAvailability: () => Promise<boolean>;
  /** Save a new PIN. */
  savePin: (pin: string, options?: { enableAppLock?: boolean }) => Promise<void>;
  /** Verify an entered PIN. Returns true if correct. */
  verifyPin: (pin: string) => Promise<boolean>;
  /** Lock the app (e.g. on background). */
  lock: (force?: boolean) => void;
  /** Unlock the app (after correct PIN). */
  unlock: () => void;
  /** Clear everything (used on account delete/reset, not normal logout). */
  clear: () => Promise<void>;
  setSystemOverlayActive: (v: boolean) => void;
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  userId: null,
  enabled: false,
  hasPin: false,
  biometricAvailable: false,
  biometricEnabled: false,
  biometricCapability: {
    available: false,
    kind: 'biometric',
    label: 'Device biometrics',
    unlockLabel: 'Use device biometrics',
    settingsTitle: 'Biometric unlock',
    settingsSubtitle: 'Use your device biometrics for app lock and vault lock',
    promptDescription: 'Use the biometric sensor configured on this device.',
  },
  locked: false,
  isHydrated: false,
  isSystemOverlayActive: false,

  setUserScope: async (userId) => {
    const previousUserId = get().userId;
    if (previousUserId === userId && get().isHydrated) return;
    set({
      userId,
      enabled: false,
      hasPin: false,
      biometricEnabled: false,
      locked: false,
      isHydrated: false,
    });
    await get().hydrate();
  },

  hydrate: async () => {
    const userId = get().userId;
    if (!userId) {
      set({
        enabled: false,
        hasPin: false,
        biometricEnabled: false,
        locked: false,
        isHydrated: true,
      });
      return;
    }

    const enabled = await isAppLockEnabled(userId);
    const pin = await getStoredPin(userId);
    const biometricAvailable = await get().refreshBiometricAvailability();
    const biometricEnabled = biometricAvailable ? await isBiometricEnabled(userId) : false;
    const { isHydrated } = get();
    set({
      enabled,
      hasPin: !!pin,
      biometricAvailable,
      biometricEnabled,
      locked: isHydrated ? get().locked : (enabled && !!pin),
      isHydrated: true,
    });
  },

  setEnabled: async (v) => {
    const userId = get().userId;
    if (!userId) return;
    if (!v) {
      await persistEnabled(false, userId);
      await persistBiometricEnabled(false, userId);
      set({ enabled: false, biometricEnabled: false, locked: false });
      return;
    }
    await persistEnabled(v, userId);
    set({ enabled: v, locked: false });
  },

  setBiometricEnabled: async (v) => {
    const userId = get().userId;
    if (!userId) return;
    const allowed = v ? await get().refreshBiometricAvailability() : get().biometricAvailable;
    await persistBiometricEnabled(v && allowed, userId);
    set({ biometricEnabled: v && allowed });
  },

  refreshBiometricAvailability: async () => {
    try {
      const capability = await getBiometricCapability();
      const available = capability.available;
      if (!available) {
        await persistBiometricEnabled(false, get().userId);
        set({ biometricAvailable: false, biometricEnabled: false, biometricCapability: capability });
      } else {
        set({ biometricAvailable: true, biometricCapability: capability });
      }
      return available;
    } catch {
      set({ biometricAvailable: false, biometricEnabled: false });
      return false;
    }
  },

  savePin: async (pin, options) => {
    const userId = get().userId;
    if (!userId) return;
    const enableAppLock = options?.enableAppLock ?? false;
    await persistPin(pin, userId);
    if (enableAppLock) await persistEnabled(true, userId);
    set({ hasPin: true, enabled: enableAppLock ? true : get().enabled, locked: false });
  },

  verifyPin: async (entered) => {
    const userId = get().userId;
    if (!userId) return false;
    const stored = await getStoredPin(userId);
    return stored === entered;
  },

  lock: (force = false) => {
    const { enabled, hasPin, isSystemOverlayActive } = get();
    if ((force || enabled) && hasPin && !isSystemOverlayActive) {
      set({ locked: true });
    }
  },

  unlock: () => set({ locked: false }),

  clear: async () => {
    await clearStorage(get().userId);
    set({ enabled: false, hasPin: false, biometricEnabled: false, locked: false });
  },

  setSystemOverlayActive: (v) => set({ isSystemOverlayActive: v }),
}));
