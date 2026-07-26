import { create } from 'zustand';
import { type ApiUser, authApi } from '@/src/services/api';
import { clearAuthMediaHeadersCache, preloadAuthMediaHeaders } from '@/src/services/authMediaHeaders';
import { clearAuthedMediaFileCache } from '@/src/services/authedMediaCache';
import { disconnectCoupleSocket, ensureCoupleSocket } from '@/src/services/coupleSocket';
import { clearTokens } from '@/src/services/tokenStorage';
import { useCoupleLoveStore } from '@/src/store/coupleLoveStore';
import { readPersistedProfile, writePersistedProfile } from '@/src/store/profileStorage';
import { resolveApiMediaUrl } from '@/src/services/mediaUrl';
import { writeSessionCache, clearSessionCache } from '@/src/services/sessionCache';
import { clearMemoryContentCaches } from '@/src/store/contentMemoryCache';
import { useAppLockStore } from '@/src/store/useAppLockStore';

export interface CoupleUser {
  id: string;
  name: string;
  email: string;
  partnerId: string;
  /** Partner account (legal) name */
  partnerName: string;
  /** Nickname they set on their phone — synced to you */
  partnerNicknameSelf?: string;
  avatarSelf: string;
  avatarPartner: string;
  nicknameSelf?: string;
  partnerPetName?: string;
  partnerMood?: string;
}

export function mapApiUserToCoupleUser(api: ApiUser): CoupleUser {
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    partnerId: api.partner?.id ?? '',
    partnerName: api.partner?.name ?? 'Partner',
    partnerNicknameSelf: api.partner?.nicknameSelf ?? undefined,
    partnerPetName: api.partnerPetName ?? undefined,
    nicknameSelf: api.nicknameSelf ?? undefined,
    avatarSelf: api.avatarUrl ? (resolveApiMediaUrl(api.avatarUrl) ?? '') : '',
    avatarPartner:
      api.partner?.avatarUrl ? (resolveApiMediaUrl(api.partner.avatarUrl) ?? '') : '',
    partnerMood: api.partner?.mood ?? undefined,
  };
}

interface AuthState {
  apiUser: ApiUser | null;
  user: CoupleUser | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isSigningOut: boolean;
  /** Blocks setSession after logout until the user signs in again. */
  signedOut: boolean;
  chatDisappearingAfterMs: number | null;
  setSession: (apiUser: ApiUser, force?: boolean) => void;
  clearSession: () => void;
  setHydrating: (v: boolean) => void;
  setSigningOut: (v: boolean) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUser: (patch: Partial<Pick<CoupleUser, 'nicknameSelf' | 'partnerPetName' | 'avatarSelf' | 'avatarPartner'>>) => void;
  setChatDisappearingAfterMs: (ms: number | null) => void;
  mergePersistedProfile: () => Promise<void>;
}

async function persistFromUser(userId: string, user: CoupleUser | null, ttl: number | null) {
  if (!user) return;
  await writePersistedProfile(userId, {
    nicknameSelf: user.nicknameSelf,
    partnerPetName: user.partnerPetName,
    avatarSelf: user.avatarSelf,
    avatarPartner: user.avatarPartner,
    chatDisappearingAfterMs: ttl,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  apiUser: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true,
  isSigningOut: false,
  signedOut: false,
  chatDisappearingAfterMs: null,

  setSession: (apiUser, force = false) => {
    if (!force && (get().isSigningOut || get().signedOut)) return;
    const couple = mapApiUserToCoupleUser(apiUser);
    set({
      apiUser,
      user: couple,
      isAuthenticated: true,
      signedOut: false,
      chatDisappearingAfterMs: apiUser.chatDisappearingAfterMs ?? null,
    });
    void useAppLockStore.getState().setUserScope(apiUser.id);
    preloadAuthMediaHeaders();
    void writeSessionCache(apiUser);
    if (apiUser.coupleId) void ensureCoupleSocket(apiUser.coupleId);
    void get()
      .mergePersistedProfile()
      .then(() => {
        const merged = get().user;
        if (merged) void persistFromUser(apiUser.id, merged, get().chatDisappearingAfterMs);
      });
  },

  clearSession: () => {
    void useAppLockStore.getState().setUserScope(null);
    set({
      apiUser: null,
      user: null,
      isAuthenticated: false,
      signedOut: true,
      chatDisappearingAfterMs: null,
    });
    try {
      void clearTokens();
      void clearSessionCache();
    } catch {
      /* continue */
    }
  },

  setHydrating: (isHydrating) => set({ isHydrating }),

  setSigningOut: (isSigningOut) => set({ isSigningOut }),

  logout: async () => {
    void useAppLockStore.getState().setUserScope(null);
    set({ signedOut: true, apiUser: null, user: null, isAuthenticated: false });
    try {
      await clearTokens();
      await clearSessionCache();
    } catch {
      /* continue */
    }
    try {
      clearAuthMediaHeadersCache();
      clearMemoryContentCaches();
      void clearAuthedMediaFileCache();
      disconnectCoupleSocket();
      useCoupleLoveStore.getState().clear();
    } catch {
      /* continue */
    }
    set({
      apiUser: null,
      user: null,
      isAuthenticated: false,
      signedOut: true,
      chatDisappearingAfterMs: null,
    });
  },

  deleteAccount: async () => {
    try {
      await authApi.deleteAccount();
    } catch (e) {
      console.warn('[useAuthStore] deleteAccount backend failed:', e);
      throw e;
    }
    await useAppLockStore.getState().clear();
    void useAppLockStore.getState().setUserScope(null);
    set({ signedOut: true, apiUser: null, user: null, isAuthenticated: false });
    try {
      await clearTokens();
      await clearSessionCache();
    } catch {
      /* continue */
    }
    try {
      clearAuthMediaHeadersCache();
      clearMemoryContentCaches();
      void clearAuthedMediaFileCache();
      disconnectCoupleSocket();
      useCoupleLoveStore.getState().clear();
    } catch {
      /* continue */
    }
    set({
      apiUser: null,
      user: null,
      isAuthenticated: false,
      signedOut: true,
      chatDisappearingAfterMs: null,
    });
  },

  updateUser: (patch) => {
    const u = get().user;
    const api = get().apiUser;
    if (!u || !api) return;
    const next: CoupleUser = { ...u, ...patch };
    if ('partnerPetName' in patch && (patch.partnerPetName === undefined || !String(patch.partnerPetName).trim())) {
      delete next.partnerPetName;
    }
    if ('nicknameSelf' in patch && (patch.nicknameSelf === undefined || !String(patch.nicknameSelf).trim())) {
      delete next.nicknameSelf;
    }
    set({ user: next });
    void persistFromUser(api.id, next, get().chatDisappearingAfterMs);
  },

  setChatDisappearingAfterMs: (ms) => {
    set({ chatDisappearingAfterMs: ms });
    const u = get().user;
    const api = get().apiUser;
    if (u && api) void persistFromUser(api.id, u, ms);
  },

  mergePersistedProfile: async () => {
    const api = get().apiUser;
    const u = get().user;
    if (!api || !u) return;

    const saved = await readPersistedProfile(api.id);
    if (!saved) return;

    const next: CoupleUser = { ...u };
    if (!api.avatarUrl && saved.avatarSelf) next.avatarSelf = resolveApiMediaUrl(saved.avatarSelf) ?? saved.avatarSelf;
    if (!api.partner?.avatarUrl && saved.avatarPartner) {
      next.avatarPartner = resolveApiMediaUrl(saved.avatarPartner) ?? saved.avatarPartner;
    }

    set({
      user: next,
      chatDisappearingAfterMs:
        api.chatDisappearingAfterMs ?? saved.chatDisappearingAfterMs ?? get().chatDisappearingAfterMs,
    });
  },
}));

export function getDisplaySelfName(user: CoupleUser | null | undefined): string {
  if (!user) return 'You';
  const n = user.nicknameSelf?.trim();
  return n || user.name;
}

/** Partner name with your private nickname override. */
export function getPartnerSyncedName(user: CoupleUser | null | undefined): string {
  if (!user) return 'Partner';
  const petName = user.partnerPetName?.trim();
  if (petName) return petName;
  return user.partnerName;
}

/** Partner's display name everywhere (synced from their nickname). */
export function getPartnerChatLabel(user: CoupleUser | null | undefined): string {
  return getPartnerSyncedName(user);
}
