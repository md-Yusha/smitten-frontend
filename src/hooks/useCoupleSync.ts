import { useTheme } from '@/context/ThemeContext';
import { smittenAlert } from '@/src/components/ui/SmittenAlertProvider';
import type { LovePing } from '@/src/services/coupleApi';
import { ensureCoupleSocket, subscribeCoupleSocket } from '@/src/services/coupleSocket';
import { useCoupleContentStore } from '@/src/store/coupleContentStore';
import { useCoupleLoveStore } from '@/src/store/coupleLoveStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNotificationInboxStore } from '@/src/store/useNotificationInboxStore';
import { useEffect, useRef } from 'react';

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
    const unsubDisbanded = subscribeCoupleSocket('couple:disbanded', (payload: any) => {
      const me = useAuthStore.getState().apiUser?.id;
      if (payload?.deletedUserId === me) return;
      useNotificationInboxStore.getState().add({
        id: `partner-deleted-${Date.now()}`,
        title: 'Partner account deleted',
        message: 'Your partner has deleted their account and data. 😔',
        createdAt: new Date().toISOString(),
        category: 'account',
      });
      smittenAlert({
        title: 'Partner account deleted 😔',
        message: 'Your partner has deleted their Smittenz account. Their account data has been permanently deleted.',
        tone: 'warning',
      });
    });
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
      const user = useAuthStore.getState().user;
      const partnerName = user ? (love.senderName || 'Partner') : 'Partner';
      useNotificationInboxStore.getState().add({
        id: `buzz-${love.id}-${Date.now()}`,
        title: `${partnerName} sent you a Buzz!`,
        message: `Your partner sent you a ${love.kind || 'love'} buzz.`,
        createdAt: love.createdAt || new Date().toISOString(),
        category: 'buzz',
      });
    });
    // Socket events sent while this device was offline are not replayed by
    // Socket.IO. Pull the persisted unread queue whenever a connection returns.
    const unsubReconnect = subscribeCoupleSocket('connection:ready', () => {
      void useCoupleLoveStore.getState().fetchPending();
    });

    return () => {
      unsubReconnect();
      unsubProfile();
      unsubDisbanded();
      unsubCouple();
      unsubContent();
      unsubLove();
    };
  }, [coupleId]);
}
