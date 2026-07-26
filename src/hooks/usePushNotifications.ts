import { disconnectCoupleSocket, ensureCoupleSocket } from '@/src/services/coupleSocket';
import { claimNotificationResponse, saveNotificationIntent } from '@/src/services/notificationIntent';
import { registerPushTokenWithBackend } from '@/src/services/pushNotifications';
import { canAccessApp } from '@/src/services/session';
import { useCoupleLoveStore } from '@/src/store/coupleLoveStore';
import { useNotificationInboxStore } from '@/src/store/useNotificationInboxStore';
import { usePushActivityStore } from '@/src/store/pushActivityStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Register Expo push token; incoming alerts are sent by the server (works when app is closed). */
export function usePushNotifications() {
  const apiUser = useAuthStore((s) => s.apiUser);
  const signedOut = useAuthStore((s) => s.signedOut);
  const coupleId = apiUser?.coupleId;
  const router = useRouter();
  const registeredRef = useRef(false);

  useEffect(() => {
    void useNotificationInboxStore.getState().hydrate();
  }, []);

  const addInboxNotification = useCallback((title: string, message: string) => {
    useNotificationInboxStore.getState().add({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const handleNotificationData = useCallback(
    async (data: Record<string, unknown> | undefined | null) => {
      const type = data?.type as string | undefined;
      if (type === 'chat_message') {
        addInboxNotification('New message', 'Open chat to see the latest message.');
        await saveNotificationIntent({ type: 'chat' });
        router.push('/chat');
      } else if (type === 'game_invite' || type === 'game_move') {
        addInboxNotification('Game invite', 'Your partner sent you a game invite.');
        await saveNotificationIntent({ type: 'home' });
        router.push('/(tabs)');
      } else if (type === 'game_challenge' || type === 'game_challenge_answered') {
        addInboxNotification('Love Challenge', 'There is a challenge update waiting for you.');
        await saveNotificationIntent({ type: 'love_challenge' });
        router.push('/(tabs)');
      } else if (type === 'love_ping') {
        const kind = typeof data?.kind === 'string' ? data.kind : undefined;
        const pingId = typeof data?.pingId === 'string' ? data.pingId : undefined;
        const senderId = typeof data?.senderId === 'string' ? data.senderId : undefined;
        const senderName = typeof data?.senderName === 'string' ? data.senderName : undefined;
        const createdAt = typeof data?.createdAt === 'string' ? data.createdAt : new Date().toISOString();
        await saveNotificationIntent({ type: 'love_ping', kind });
        if (pingId && senderId && senderName) {
          useCoupleLoveStore.getState().pushIncoming({
            id: pingId,
            senderId,
            senderName,
            kind,
            createdAt,
          });
        }
        addInboxNotification(senderName ? `${senderName}: ${kind ?? 'Buzz'}` : 'Love ping', 'Your partner sent you a buzz.');
        await useCoupleLoveStore.getState().fetchPending();
        router.push('/(tabs)');
      } else if (type === 'note_created' || type === 'memory_created' || type === 'special_moment') {
        addInboxNotification('Calendar update', 'A new note, memory, or special moment was added.');
        await saveNotificationIntent({ type: 'calendar' });
        router.push('/(tabs)/calendar');
      } else if (type === 'vault_shared') {
        addInboxNotification('Vault image shared', 'A temporary vault image is waiting for you.');
        await saveNotificationIntent({ type: 'home' });
        router.push('/vault');
      } else if (type === 'partner_joined') {
        addInboxNotification('Partner joined', 'Your partner is now connected with you on Smittenz.');
        await saveNotificationIntent({ type: 'home' });
        router.push('/(tabs)');
      }
    },
    [addInboxNotification, router],
  );

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse | null | undefined) => {
      if (!response) return;
      const responseId = response.notification.request.identifier;
      const shouldHandle = await claimNotificationResponse(responseId);
      if (!shouldHandle) return;
      await handleNotificationData(response.notification.request.content.data);
    },
    [handleNotificationData],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      usePushActivityStore.getState().setAppState(next);
      const auth = useAuthStore.getState();
      if (auth.signedOut || !auth.apiUser) return;

      if (next === 'background' || next === 'inactive') {
        disconnectCoupleSocket();
        return;
      }

      if (next === 'active') {
        if (auth.apiUser.coupleId && canAccessApp(auth.apiUser)) {
          void ensureCoupleSocket(auth.apiUser.coupleId);
          void useCoupleLoveStore.getState().fetchPending();
        }
        void registerPushTokenWithBackend().then((ok) => {
          registeredRef.current = ok;
        });
      }
    });
    usePushActivityStore.getState().setAppState(AppState.currentState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (signedOut || !apiUser) {
      registeredRef.current = false;
      return;
    }

    const register = () => {
      void registerPushTokenWithBackend()
        .then((ok) => {
          registeredRef.current = ok;
        })
        .catch(() => {
          registeredRef.current = false;
        });
    };

    register();
    const retry = setInterval(() => {
      if (!registeredRef.current) register();
    }, 12_000);

    if (coupleId && canAccessApp(apiUser)) {
      void ensureCoupleSocket(coupleId);
    }

    void Notifications.getLastNotificationResponseAsync().then(handleNotificationResponse);

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response);
    });

    const receiveSub = Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title?.trim() || 'New notification';
      const message = notification.request.content.body?.trim() || 'Open Smittenz to see the update.';
      addInboxNotification(title, message);
    });

    return () => {
      clearInterval(retry);
      tapSub.remove();
      receiveSub.remove();
    };
  }, [addInboxNotification, apiUser, coupleId, handleNotificationResponse, signedOut]);
}
