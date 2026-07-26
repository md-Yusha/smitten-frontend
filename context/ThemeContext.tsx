import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROFILE_THEME_OPTIONS, SmittenColors } from '@/constants/smittenTheme';
import type { Gender } from '@/constants/genderTheme';
import type { ApiGender } from '@/src/services/api';
import { useAuthStore } from '@/src/store/useAuthStore';
import { goToLanding } from '@/src/services/authNavigation';
import { unregisterPushTokenFromBackend } from '@/src/services/pushNotifications';
import { authApi } from '@/src/services/api';
import { fetchSessionUser } from '@/src/services/session';
import { paymentsApi } from '@/src/services/paymentsApi';
import { getAccessToken } from '@/src/services/tokenStorage';
import { resetSessionRefreshThrottle } from '@/src/services/sessionRefreshThrottle';
import { readSessionCache } from '@/src/services/sessionCache';
import { warmContentCaches, refreshContentCaches } from '@/src/services/contentBootstrap';
import { preloadAuthMediaHeaders } from '@/src/services/authMediaHeaders';

type ThemeContextType = {
  themeColor: string;
  setThemeColor: (color: string) => void;
  userType: Gender;
  setUserType: (type: Gender) => void;
  sessionReady: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  themeColor: SmittenColors.accentBrand,
  setThemeColor: () => {},
  userType: null,
  setUserType: () => {},
  sessionReady: false,
  refreshSession: async () => {},
  signOut: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

function apiGenderToUserType(gender: ApiGender | null | undefined): Gender {
  if (gender === 'male' || gender === 'female' || gender === 'other') return gender;
  return null;
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeColor, setThemeColor] = useState<string>(SmittenColors.accentBrand);
  const [userType, setUserTypeState] = useState<Gender>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const lastGenderRef = useRef<Gender | undefined>(undefined);
  const refreshInFlightRef = useRef(false);
  const signOutInFlightRef = useRef(false);

  const applyStoredTheme = useCallback(async () => {
    const stored = await AsyncStorage.getItem('themeColor');
    const validTheme = PROFILE_THEME_OPTIONS.find((theme) => theme.color === stored);
    const nextColor = validTheme?.color ?? SmittenColors.accentBrand;
    setThemeColor(nextColor);
    if (!validTheme) {
      await AsyncStorage.setItem('themeColor', nextColor);
    }
  }, []);

  const applyUserGender = useCallback(async (type: Gender) => {
    if (lastGenderRef.current === type) return;
    lastGenderRef.current = type;
    setUserTypeState(type);
    if (type) {
      await AsyncStorage.setItem('userType', type);
    } else {
      await AsyncStorage.removeItem('userType');
    }
  }, []);

  const clearUserGender = useCallback(async () => {
    lastGenderRef.current = null;
    setUserTypeState(null);
    await AsyncStorage.removeItem('userType');
  }, []);

  const refreshSession = useCallback(async () => {
    if (
      refreshInFlightRef.current ||
      signOutInFlightRef.current ||
      useAuthStore.getState().isSigningOut ||
      useAuthStore.getState().signedOut
    ) {
      return;
    }
    refreshInFlightRef.current = true;
    try {
      const token = await getAccessToken();
      if (!token) {
        useAuthStore.getState().clearSession();
        await clearUserGender();
        return;
      }
      const result = await fetchSessionUser();
      if (
        signOutInFlightRef.current ||
        useAuthStore.getState().isSigningOut ||
        useAuthStore.getState().signedOut
      ) {
        return;
      }

      if (result.status === 'ok') {
        useAuthStore.getState().setSession(result.user);
        await applyUserGender(apiGenderToUserType(result.user.gender));
        return;
      }
      if (result.status === 'unauthorized') {
        useAuthStore.getState().clearSession();
        await clearUserGender();
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [applyUserGender, clearUserGender]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await applyStoredTheme();

        const token = await getAccessToken();
        if (token) {
          const cachedUser = await readSessionCache();
          if (cachedUser) {
            useAuthStore.getState().setSession(cachedUser);
            preloadAuthMediaHeaders();
            if (cachedUser.coupleId) {
              await warmContentCaches(cachedUser.coupleId, cachedUser.id);
            }
            await applyUserGender(apiGenderToUserType(cachedUser.gender));
            useAuthStore.getState().setHydrating(false);
            setSessionReady(true);
            void refreshSession().then(() => {
              const u = useAuthStore.getState().apiUser;
              if (u?.coupleId) void refreshContentCaches(u.coupleId, u.id);
            });
            return;
          }
          await refreshSession();
          const u = useAuthStore.getState().apiUser;
          if (u?.coupleId) {
            await warmContentCaches(u.coupleId, u.id);
            void refreshContentCaches(u.coupleId, u.id);
          }
        } else {
          await clearUserGender();
        }
      } catch (e) {
        console.error('[Smittenz] Session bootstrap failed', e);
      } finally {
        useAuthStore.getState().setHydrating(false);
        setSessionReady(true);
      }
    };
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, [applyStoredTheme]);

  const handleSetThemeColor = useCallback(async (color: string) => {
    setThemeColor(color);
    await AsyncStorage.setItem('themeColor', color);
  }, []);

  const signOut = useCallback(async () => {
    if (signOutInFlightRef.current) return;
    signOutInFlightRef.current = true;
    useAuthStore.getState().setSigningOut(true);

    try {
      await unregisterPushTokenFromBackend();
    } catch {
      /* best effort while token still valid */
    }

    useAuthStore.setState({
      signedOut: true,
      apiUser: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
    });

    queueMicrotask(() => goToLanding());

    const waitStart = Date.now();
    while (refreshInFlightRef.current && Date.now() - waitStart < 3000) {
      await new Promise((r) => setTimeout(r, 40));
    }

    try {
      try {
        await authApi.logout();
      } catch {
        /* offline or token already invalid */
      }

      try {
        await paymentsApi.clearPendingPayment();
        await useAuthStore.getState().logout();
      } catch (e) {
        console.warn('[Smittenz] logout storage', e);
        useAuthStore.setState({
          apiUser: null,
          user: null,
          isAuthenticated: false,
          signedOut: true,
          isHydrating: false,
        });
      }

      resetSessionRefreshThrottle();
      await clearUserGender();
    } finally {
      useAuthStore.getState().setSigningOut(false);
      signOutInFlightRef.current = false;
      goToLanding();
    }
  }, [clearUserGender]);

  const handleSetUserType = useCallback(
    async (type: Gender) => {
      if (!type) {
        await signOut();
        return;
      }
      await applyUserGender(type);
    },
    [applyUserGender, signOut],
  );

  const contextValue = useMemo(
    () => ({
      themeColor,
      setThemeColor: handleSetThemeColor,
      userType,
      setUserType: handleSetUserType,
      sessionReady,
      refreshSession,
      signOut,
    }),
    [themeColor, userType, sessionReady, refreshSession, signOut, handleSetThemeColor, handleSetUserType],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
