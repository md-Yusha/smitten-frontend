import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { getAccessToken } from '@/src/services/tokenStorage';
import { useAuthStore } from '@/src/store/useAuthStore';
import { claimSessionRefresh } from '@/src/services/sessionRefreshThrottle';

/** Refetch /auth/me when a screen gains focus — throttled so tabs stay snappy. */
export function useRefreshSessionOnFocus() {
  const { refreshSession } = useTheme();

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const auth = useAuthStore.getState();
        if (auth.isSigningOut || !auth.apiUser) return;
        const token = await getAccessToken();
        if (!token) return;
        if (!claimSessionRefresh()) return;
        await refreshSession();
      })();
    }, [refreshSession]),
  );
}
