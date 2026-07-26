import { apiRequest } from '@/src/services/api';
import { resolveVaultMediaUrl } from '@/src/services/mediaUrl';
import { postMultipart } from '@/src/services/multipart';
import type { MediaUploadProgress } from '@/src/services/multipart';

export function vaultItemMediaUrl(item: { id: string; mediaUrl?: string }): string {
  const mediaUrl = item.mediaUrl?.trim();
  const hasVaultMediaUrl =
    !!mediaUrl &&
    (mediaUrl.startsWith('http://') ||
      mediaUrl.startsWith('https://') ||
      mediaUrl.startsWith('/api/v1/vault/') ||
      mediaUrl.includes('/api/v1/vault/'));

  return resolveVaultMediaUrl(hasVaultMediaUrl ? mediaUrl : item.id);
}

export type VaultItem = {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  uploaderId: string;
  uploaderName: string;
  visibility?: 'PRIVATE' | 'SHARED';
  sourceItemId?: string | null;
  sharedAt?: string | null;
  expiresAt?: string | null;
  disappearingAfterMs?: number | null;
  createdAt: string;
};

export const vaultApi = {
  list() {
    return apiRequest<{ items: VaultItem[] }>('/vault');
  },
  upload(uri: string, kind: 'image' | 'video' = 'image', onProgress?: (value: MediaUploadProgress) => void) {
    return postMultipart<{ item: VaultItem }>('/vault', {}, { field: 'media', uri, kind }, 'POST', onProgress);
  },
  remove(id: string) {
    return apiRequest<{ ok: boolean }>(`/vault/${id}`, { method: 'DELETE' });
  },
  share(id: string, disappearingAfterMs = 30_000) {
    return apiRequest<{ item: VaultItem; alreadyShared?: boolean }>(`/vault/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ disappearingAfterMs }),
    });
  },
  open(id: string) {
    return apiRequest<{ item: VaultItem }>(`/vault/${id}/open`, { method: 'POST' });
  },
  updateSettings(body: { vaultDisappearingAfterMs?: number | null }) {
    return apiRequest<{ ok: boolean }>('/vault/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};
