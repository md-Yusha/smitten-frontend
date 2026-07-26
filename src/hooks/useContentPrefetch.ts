import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { canAccessApp } from '@/src/services/session';
import { warmContentCaches, refreshContentCaches } from '@/src/services/contentBootstrap';

/** Background refresh while on tabs (disk cache already warmed at bootstrap). */
export function useContentPrefetch() {
  const apiUser = useAuthStore((s) => s.apiUser);
  const signedOut = useAuthStore((s) => s.signedOut);
  const coupleId = apiUser?.coupleId;
  const selfId = apiUser?.id;
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (signedOut || !apiUser || !canAccessApp(apiUser) || !coupleId) return;

    const now = Date.now();
    if (now - lastRefreshRef.current < 45_000) return;
    lastRefreshRef.current = now;

    void refreshContentCaches(coupleId, selfId);
  }, [apiUser, coupleId, selfId, signedOut]);
}
