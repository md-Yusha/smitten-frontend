import { useEffect, useRef } from 'react';
import { ensureCoupleSocket, subscribeCoupleSocket } from '@/src/services/coupleSocket';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useCoupleContentStore } from '@/src/store/coupleContentStore';
import { useCoupleLoveStore } from '@/src/store/coupleLoveStore';
import type { LovePing } from '@/src/services/coupleApi';
import { useTheme } from '@/context/ThemeContext';

/** Live profile + partner updates over the shared couple socket. */
export function useCoupleSync() {
  const coupleId = useAuthStore((s) => s.apiUser?.coupleId);
  const { refreshSession } = useTheme();
  const refreshRef = useRef(refreshSession);
  refreshRef.current = refreshSession;

  useEffect(() => {
    if (!coupleId) return;

    void ensureCoupleSocket(coupleId);

    const sync = () => {
      const auth = useAuthStore.getState();
      if (auth.isSigningOut || auth.signedOut) return;
      void refreshRef.current();
    };

    const unsubCouple = subscribeCoupleSocket('couple:updated', sync);
    const unsubContent = subscribeCoupleSocket('content:updated', () => {
      useCoupleContentStore.getState().bump();
    });
    const unsubProfile = subscribeCoupleSocket('profile:updated', (payload: any) => {
      if (payload?.chatDisappearingAfterMs !== undefined) {
        useAuthStore.getState().setChatDisappearingAfterMs(payload.chatDisappearingAfterMs);
      }
      sync();
    });
    const unsubLove = subscribeCoupleSocket('love:sent', (payload) => {
      const love = payload as LovePing;
      const me = useAuthStore.getState().apiUser?.id;
      if (love.senderId === me) return;
      useCoupleLoveStore.getState().pushIncoming(love);
    });
    // Socket events sent while this device was offline are not replayed by
    // Socket.IO. Pull the persisted unread queue whenever a connection returns.
    const unsubReconnect = subscribeCoupleSocket('connection:ready', () => {
      void useCoupleLoveStore.getState().fetchPending();
    });

    return () => {
      unsubReconnect();
      unsubProfile();
      unsubCouple();
      unsubContent();
      unsubLove();
    };
  }, [coupleId]);
}
