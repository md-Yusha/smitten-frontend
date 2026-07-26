import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { canAccessApp } from '@/src/services/session';
import { chatApi } from '@/src/services/chatApi';
import { writeChatCache } from '@/src/services/chatCache';

/** Warm the chat message cache while the user is on tabs (before opening chat). */
export function useChatPrefetch() {
  const apiUser = useAuthStore((s) => s.apiUser);
  const signedOut = useAuthStore((s) => s.signedOut);
  const coupleId = apiUser?.coupleId;
  const lastPrefetchRef = useRef<string | null>(null);

  useEffect(() => {
    if (signedOut || !apiUser || !canAccessApp(apiUser) || !coupleId) {
      lastPrefetchRef.current = null;
      return;
    }
    if (lastPrefetchRef.current === coupleId) return;
    lastPrefetchRef.current = coupleId;

    void chatApi
      .getMessages()
      .then(({ messages }) => writeChatCache(coupleId, messages))
      .catch(() => {});
  }, [apiUser, coupleId, signedOut]);
}
