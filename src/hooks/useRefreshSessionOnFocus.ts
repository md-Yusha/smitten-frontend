import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { getAccessToken } from '@/src/services/tokenStorage';
import { useAuthStore } from '@/src/store/useAuthStore';

let lastRefreshAt = 0;
const MIN_INTERVAL_MS = 90_000;

export function resetSessionRefreshThrottle() {
  lastRefreshAt = 0;
}

/** Refetch /auth/me when a screen gains focus — throttled so tabs stay snappy. */
export function useRefreshSessionOnFocus() {
  const { refreshSession } = useTheme();

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const auth = useAuthStore.getState();
        if (auth.isSigningOut || !auth.apiUser) return;
        const now = Date.now();
        if (now - lastRefreshAt < MIN_INTERVAL_MS) return;
        const token = await getAccessToken();
        if (!token) return;
        lastRefreshAt = now;
        await refreshSession();
      })();
    }, [refreshSession]),
  );
}
