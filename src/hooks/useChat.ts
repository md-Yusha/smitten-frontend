import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { chatApi, type ApiMessage } from '@/src/services/chatApi';
import { readChatCache, writeChatCache } from '@/src/services/chatCache';
import { prefetchChatMediaUrls } from '@/src/services/mediaPrefetch';
import { resolveChatMessageMediaUrl } from '@/src/services/mediaUrl';
import { chatMediaUrl, isLocalDeviceMediaUri } from '@/src/services/authedMediaCache';
import { showLocalMessageNotification } from '@/src/services/pushNotifications';
import {
  ensureCoupleSocket,
  emitCoupleTyping,
  subscribeCoupleSocket,
} from '@/src/services/coupleSocket';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNotificationInboxStore } from '@/src/store/useNotificationInboxStore';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export type ChatRow = ApiMessage & { time: string; isMe: boolean };

function toRow(m: ApiMessage, selfId: string): ChatRow {
  return { ...m, time: formatTime(m.createdAt), isMe: m.senderId === selfId };
}

function isMessageExpired(m: { expiresAt: string | null }): boolean {
  if (!m.expiresAt) return false;
  return new Date(m.expiresAt).getTime() <= Date.now();
}

function dropExpired(rows: ChatRow[]): ChatRow[] {
  return rows.filter((m) => !isMessageExpired(m));
}

function rowsToApi(rows: ChatRow[]): ApiMessage[] {
  return rows.map(({ time: _t, isMe: _m, ...api }) => api);
}

function mergeMessages(existing: ApiMessage[], incoming: ApiMessage[]): ApiMessage[] {
  const byId = new Map<string, ApiMessage>();
  for (const msg of existing) {
    if (!msg.id.startsWith('pending-')) byId.set(msg.id, msg);
  }
  for (const msg of incoming) {
    byId.set(msg.id, msg);
  }
  return Array.from(byId.values()).sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export function useChat() {
  const apiUser = useAuthStore((s) => s.apiUser);
  const setSession = useAuthStore((s) => s.setSession);
  const selfId = apiUser?.id ?? '';
  const coupleId = apiUser?.coupleId;

  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    phase: 'preparing' | 'uploading';
    progress: number;
    detail?: string;
  } | null>(null);
  const loadedOnceRef = useRef(false);
  const coupleIdRef = useRef(coupleId);
  const typingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markReadInflightRef = useRef(false);
  const mediaUploadInflightRef = useRef(false);
  const legacyRepairRunningRef = useRef(false);
  const legacyRepairAttemptedRef = useRef(new Set<string>());
  coupleIdRef.current = coupleId;

  const applyMessages = useCallback(
    (list: ApiMessage[], online?: boolean) => {
      setMessages(dropExpired(list.map((m) => toRow(m, selfId))));
      if (online !== undefined) setPartnerOnline(online);
    },
    [selfId],
  );

  const patchMessagesRead = useCallback(
    (messageIds: string[], readAt: string) => {
      if (!messageIds.length) return;
      const idSet = new Set(messageIds);
      setMessages((prev) => {
        const next = prev.map((row) =>
          row.isMe && idSet.has(row.id) ? { ...row, readAt } : row,
        );
        if (coupleIdRef.current) void writeChatCache(coupleIdRef.current, rowsToApi(next));
        return next;
      });
    },
    [],
  );

  const markPartnerMessagesRead = useCallback(async () => {
    if (!coupleId || markReadInflightRef.current) return;
    markReadInflightRef.current = true;
    try {
      const { messageIds } = await chatApi.markMessagesRead();
      if (messageIds.length) {
        const readAt = new Date().toISOString();
        patchMessagesRead(messageIds, readAt);
      }
    } catch {
      /* offline */
    } finally {
      markReadInflightRef.current = false;
    }
  }, [coupleId, patchMessagesRead]);

  const notifyTyping = useCallback(() => {
    emitCoupleTyping(true);
    if (typingHideRef.current) clearTimeout(typingHideRef.current);
    typingHideRef.current = setTimeout(() => emitCoupleTyping(false), 2800);
  }, []);

  const stopTyping = useCallback(() => {
    if (typingHideRef.current) clearTimeout(typingHideRef.current);
    emitCoupleTyping(false);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!coupleId) {
      setLoading(false);
      return;
    }
    try {
      const { messages: list, partnerOnline: online } = await chatApi.getMessages();
      setMessages((prev) => {
        const merged = mergeMessages(rowsToApi(prev), list);
        const next = dropExpired(merged.map((m) => toRow(m, selfId)));
        void writeChatCache(coupleId, rowsToApi(next));
        return next;
      });
      if (online !== undefined) setPartnerOnline(online);
      prefetchChatMediaUrls(
        list.filter((m) => m.kind === 'gif').map((m) => resolveChatMessageMediaUrl(m.body)),
      );
      setError(null);
      loadedOnceRef.current = true;
    } catch {
      if (!loadedOnceRef.current) setError('Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [coupleId, selfId]);

  useEffect(() => {
    loadedOnceRef.current = false;
    setError(null);
    setPartnerTyping(false);
    if (!coupleId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let showedCache = false;

    void (async () => {
      const cached = await readChatCache(coupleId);
      if (cancelled || coupleIdRef.current !== coupleId) return;
      if (cached?.length) {
        applyMessages(cached);
        prefetchChatMediaUrls(
          cached.filter((m) => m.kind === 'gif').map((m) => resolveChatMessageMediaUrl(m.body)),
        );
        showedCache = true;
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const { messages: list, partnerOnline: online } = await chatApi.getMessages();
        if (cancelled || coupleIdRef.current !== coupleId) return;
        setMessages((prev) => {
          const merged = mergeMessages(rowsToApi(prev), list);
          const next = dropExpired(merged.map((m) => toRow(m, selfId)));
          void writeChatCache(coupleId, rowsToApi(next));
          return next;
        });
        if (online !== undefined) setPartnerOnline(online);
        prefetchChatMediaUrls(
          list.filter((m) => m.kind === 'gif').map((m) => resolveChatMessageMediaUrl(m.body)),
        );
        setError(null);
        loadedOnceRef.current = true;
      } catch {
        if (!loadedOnceRef.current && !showedCache) setError('Could not load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coupleId, applyMessages, selfId]);

  useEffect(() => {
    if (!coupleId || legacyRepairRunningRef.current) return;
    const candidates = messages.filter(
      (message) =>
        message.senderId === selfId &&
        message.kind === 'video' &&
        !message.id.startsWith('pending-') &&
        isLocalDeviceMediaUri(message.body) &&
        !legacyRepairAttemptedRef.current.has(message.id),
    );
    if (!candidates.length) return;

    legacyRepairRunningRef.current = true;
    void (async () => {
      for (const message of candidates) {
        legacyRepairAttemptedRef.current.add(message.id);
        try {
          const { mediaId } = await chatApi.uploadMedia(message.body, 'video');
          const { message: repaired } = await chatApi.replaceMediaMessage(message.id, mediaId);
          setMessages((current) => {
            const next = current.map((row) =>
              row.id === repaired.id ? toRow(repaired, selfId) : row,
            );
            void writeChatCache(coupleId, rowsToApi(next));
            return next;
          });
        } catch (error) {
          console.warn('[chat] Could not repair legacy local video message', {
            messageId: message.id,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })().finally(() => {
      legacyRepairRunningRef.current = false;
    });
  }, [coupleId, messages, selfId]);

  useEffect(() => {
    if (!coupleId) return;

    void ensureCoupleSocket(coupleId);

    const unsubMsg = subscribeCoupleSocket('message:new', (msg) => {
      const m = msg as ApiMessage;
      if (isMessageExpired(m)) return;
      if (m.kind === 'gif') {
        prefetchChatMediaUrls([resolveChatMessageMediaUrl(m.body)]);
      }
      setMessages((prev) => {
        if (prev.some((row) => row.id === m.id)) return prev;
        const pendingIdx = prev.findIndex(
          (row) =>
            row.id.startsWith('pending-') &&
            row.senderId === selfId &&
            row.kind === m.kind &&
            row.body === m.body,
        );
        if (pendingIdx >= 0) {
          const next = [...prev];
          next[pendingIdx] = toRow(m, selfId);
          if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
          return next;
        }
        const next = [...prev, toRow(m, selfId)];
        if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
        return next;
      });
      if (m.senderId !== selfId) {
        void markPartnerMessagesRead();
        let notificationBody = m.body;
        if (m.kind === 'gif') {
          notificationBody = '📷 Sent a GIF';
        } else if (m.kind === 'video') {
          notificationBody = '🎥 Sent a video';
        } else if (m.kind === 'sticker') {
          notificationBody = '💖 Sent a sticker';
        }
        useNotificationInboxStore.getState().add({
          id: `chat-${m.id}`,
          title: 'New message',
          message: notificationBody,
          createdAt: m.createdAt,
          category: 'chat',
        });
        void showLocalMessageNotification('New message', notificationBody);
      }
    });

    const unsubRead = subscribeCoupleSocket('messages:read', (payload) => {
      const { messageIds, readAt } = payload as { messageIds: string[]; readAt: string };
      patchMessagesRead(messageIds, readAt);
    });

    const unsubUpdated = subscribeCoupleSocket('message:updated', (msg) => {
      const m = msg as ApiMessage;
      setMessages((prev) => {
        const next = prev.map((row) => (row.id === m.id ? toRow(m, selfId) : row));
        if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
        return next;
      });
    });

    const unsubDeleted = subscribeCoupleSocket('message:deleted', (payload) => {
      const { id } = payload as { id: string };
      setMessages((prev) => {
        const next = prev.filter((row) => row.id !== id);
        if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
        return next;
      });
    });

    const unsubPresence = subscribeCoupleSocket('presence:update', (payload) => {
      const { userId } = payload as { userId: string };
      if (userId !== selfId) setPartnerOnline(true);
    });

    const unsubTyping = subscribeCoupleSocket('typing:update', (payload) => {
      const { userId, typing } = payload as { userId: string; typing: boolean };
      if (userId === selfId) return;
      setPartnerTyping(typing);
      if (typing) {
        if (typingHideRef.current) clearTimeout(typingHideRef.current);
        typingHideRef.current = setTimeout(() => setPartnerTyping(false), 4000);
      }
    });

    void chatApi.heartbeat().catch(() => {});

    const heartbeat = setInterval(() => {
      void chatApi.heartbeat().catch(() => {});
    }, 45_000);

    const expirySweep = setInterval(() => {
      setMessages((prev) => dropExpired(prev));
    }, 60_000);

    return () => {
      unsubMsg();
      unsubRead();
      unsubUpdated();
      unsubDeleted();
      unsubPresence();
      unsubTyping();
      clearInterval(heartbeat);
      clearInterval(expirySweep);
      stopTyping();
    };
  }, [coupleId, selfId, patchMessagesRead, markPartnerMessagesRead, stopTyping]);

  useEffect(() => {
    if (!coupleId) return;

    const refreshFromServer = (next: AppStateStatus) => {
      if (next !== 'active') return;
      void loadMessages().then(() => {
        void markPartnerMessagesRead();
      });
    };

    const sub = AppState.addEventListener('change', refreshFromServer);
    if (AppState.currentState === 'active') {
      void loadMessages().then(() => {
        void markPartnerMessagesRead();
      });
    }

    return () => sub.remove();
  }, [coupleId, loadMessages, markPartnerMessagesRead]);

  const sendMessage = useCallback(
    async (payload: { kind: 'text' | 'sticker' | 'gif' | 'video'; body: string; replyToId?: string | null }) => {
      stopTyping();
      const isLocalMediaUpload =
        (payload.kind === 'gif' || payload.kind === 'video') &&
        isLocalDeviceMediaUri(payload.body);

      // Native video compression is intentionally single-flight. Running two
      // compressors together can exhaust memory and terminate the app.
      if (isLocalMediaUpload && mediaUploadInflightRef.current) {
        throw new Error('Please wait for the current media upload to finish.');
      }
      if (isLocalMediaUpload) {
        mediaUploadInflightRef.current = true;
        setUploading(true);
      }

      const tempId = `pending-${Date.now()}`;
      const optimistic = toRow(
        {
          id: tempId,
          coupleId: coupleId ?? '',
          senderId: selfId,
          kind: payload.kind,
          body: payload.body,
          replyToId: payload.replyToId ?? null,
          reaction: null,
          reactionUserId: null,
          reactionUserName: null,
          isEdited: false,
          isDeleted: false,
          readAt: null,
          expiresAt: null,
          createdAt: new Date().toISOString(),
        },
        selfId,
      );

      setMessages((prev) => {
        const next = [...prev, optimistic];
        if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
        return next;
      });

      try {
        let outbound = payload;
        if (isLocalMediaUpload) {
          const uploadKind = payload.kind === 'video' ? 'video' : 'image';
          const { mediaId } = await chatApi.uploadMedia(payload.body, uploadKind, setUploadProgress);
          outbound = { kind: payload.kind, body: chatMediaUrl(mediaId) };
        }

        const { message } = await chatApi.sendMessage(outbound);
        setMessages((prev) => {
          const withoutPending = prev.filter((m) => m.id !== tempId);
          if (withoutPending.some((m) => m.id === message.id)) return withoutPending;
          const next = [...withoutPending, toRow(message, selfId)];
          if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
          return next;
        });
        if (message.kind === 'gif') prefetchChatMediaUrls([message.body]);
      } catch (error) {
        setMessages((prev) => {
          const next = prev.filter((m) => m.id !== tempId);
          if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
          return next;
        });
        throw error instanceof Error ? error : new Error('send failed');
      } finally {
        if (isLocalMediaUpload) {
          mediaUploadInflightRef.current = false;
          setUploading(false);
          setUploadProgress(null);
        }
      }
    },
    [coupleId, selfId, stopTyping],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (messageId.startsWith('pending-')) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        return;
      }
      const { message } = await chatApi.deleteMessage(messageId);
      setMessages((prev) => {
        const next = prev.map((row) => (row.id === messageId ? toRow(message, selfId) : row));
        if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
        return next;
      });
    },
    [coupleId, selfId],
  );

  const reactMessage = useCallback(
    async (messageId: string, reaction: string | null) => {
      const { message } = await chatApi.reactMessage(messageId, reaction);
      setMessages((prev) => {
        const next = prev.map((row) => (row.id === messageId ? toRow(message, selfId) : row));
        if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
        return next;
      });
    },
    [coupleId, selfId],
  );

  const editMessage = useCallback(
    async (messageId: string, body: string) => {
      const { message } = await chatApi.editMessage(messageId, body);
      setMessages((prev) => {
        const next = prev.map((row) => (row.id === messageId ? toRow(message, selfId) : row));
        if (coupleId) void writeChatCache(coupleId, rowsToApi(next));
        return next;
      });
    },
    [coupleId, selfId],
  );

  const updateSettings = useCallback(
    async (patch: {
      chatDisappearingAfterMs?: number | null;
      chatThemeId?: string;
    }) => {
      const previousValue = useAuthStore.getState().chatDisappearingAfterMs;
      if (patch.chatDisappearingAfterMs !== undefined) {
        useAuthStore.getState().setChatDisappearingAfterMs(patch.chatDisappearingAfterMs);
      }
      try {
        const { user } = await chatApi.updateSettings(patch);
        setSession(user);
        useAuthStore.getState().setChatDisappearingAfterMs(user.chatDisappearingAfterMs);
      } catch (err) {
        if (patch.chatDisappearingAfterMs !== undefined) {
          useAuthStore.getState().setChatDisappearingAfterMs(previousValue);
        }
        throw err;
      }
    },
    [setSession],
  );

  return {
    messages,
    partnerOnline,
    partnerTyping,
    loading,
    error,
    sendMessage,
    deleteMessage,
    reactMessage,
    editMessage,
    updateSettings,
    reload: loadMessages,
    markPartnerMessagesRead,
    notifyTyping,
    stopTyping,
    canChat: Boolean(coupleId),
    uploading,
    uploadProgress,
  };
}
