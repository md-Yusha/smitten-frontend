import { apiRequest } from './api';
import { postMultipart } from './multipart';
import type { MediaUploadProgress } from './multipart';

export type ApiMessage = {
  id: string;
  coupleId: string;
  senderId: string;
  kind: 'text' | 'sticker' | 'gif' | 'video' | 'system';
  body: string;
  isEdited: boolean;
  isDeleted: boolean;
  readAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export const chatApi = {
  getMessages(after?: string) {
    const q = after ? `?after=${encodeURIComponent(after)}` : '';
    return apiRequest<{ messages: ApiMessage[]; partnerOnline: boolean }>(`/chat/messages${q}`);
  },
  sendMessage(body: { kind: 'text' | 'sticker' | 'gif' | 'video'; body: string }) {
    return apiRequest<{ message: ApiMessage }>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  uploadMedia(uri: string, kind: 'image' | 'video', onProgress?: (value: MediaUploadProgress) => void) {
    return postMultipart<{ mediaId: string; mediaUrl: string; mediaType: 'image' | 'video' }>('/chat/media', {}, {
      field: 'media',
      uri,
      kind,
    }, 'POST', onProgress);
  },
  updateSettings(body: {
    chatDisappearingAfterMs?: number | null;
    chatThemeId?: string;
    partnerPetName?: string;
  }) {
    return apiRequest<{ user: import('./api').ApiUser }>('/chat/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  heartbeat() {
    return apiRequest<{ ok: boolean }>('/chat/presence', { method: 'POST' });
  },
  markMessagesRead() {
    return apiRequest<{ ok: boolean; messageIds: string[] }>('/chat/messages/read', {
      method: 'POST',
    });
  },
  editMessage(id: string, body: string) {
    return apiRequest<{ message: ApiMessage }>(`/chat/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
  },
  deleteMessage(id: string) {
    return apiRequest<{ ok: boolean; message: ApiMessage }>(`/chat/messages/${id}`, { method: 'DELETE' });
  },
  partnerStatus() {
    return apiRequest<{ online: boolean }>('/chat/partner-status');
  },
};
