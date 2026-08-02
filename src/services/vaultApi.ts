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

type VaultTimedResponse<T> = T & { serverNow: string };

function localizeVaultExpiry(
  item: VaultItem,
  serverNow: string,
  requestStartedAt: number,
  responseReceivedAt: number,
): VaultItem {
  if (!item.expiresAt) return item;

  const expiresAt = Date.parse(item.expiresAt);
  const serverTime = Date.parse(serverNow);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(serverTime)) return item;

  // Estimate the one-way response time so countdowns use the server's clock,
  // while still accounting for the small amount of time spent in transit.
  const roundTripMs = Math.max(0, responseReceivedAt - requestStartedAt);
  const estimatedServerTimeAtReceipt = serverTime + roundTripMs / 2;
  const maximumRemainingMs = item.disappearingAfterMs ?? Number.POSITIVE_INFINITY;
  const remainingMs = Math.max(
    0,
    Math.min(maximumRemainingMs, expiresAt - estimatedServerTimeAtReceipt),
  );

  return {
    ...item,
    expiresAt: new Date(responseReceivedAt + remainingMs).toISOString(),
  };
}

function localizeVaultItems(
  items: VaultItem[],
  serverNow: string,
  requestStartedAt: number,
  responseReceivedAt: number,
): VaultItem[] {
  return items.map((item) =>
    localizeVaultExpiry(item, serverNow, requestStartedAt, responseReceivedAt),
  );
}

export const vaultApi = {
  async list() {
    const requestStartedAt = Date.now();
    const response = await apiRequest<VaultTimedResponse<{ items: VaultItem[] }>>('/vault');
    const responseReceivedAt = Date.now();
    return {
      ...response,
      items: localizeVaultItems(
        response.items,
        response.serverNow,
        requestStartedAt,
        responseReceivedAt,
      ),
    };
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
  async open(id: string) {
    const requestStartedAt = Date.now();
    const response = await apiRequest<VaultTimedResponse<{ item: VaultItem }>>(`/vault/${id}/open`, {
      method: 'POST',
    });
    const responseReceivedAt = Date.now();
    return {
      ...response,
      item: localizeVaultExpiry(
        response.item,
        response.serverNow,
        requestStartedAt,
        responseReceivedAt,
      ),
    };
  },
  updateSettings(body: { vaultDisappearingAfterMs?: number | null }) {
    return apiRequest<{ ok: boolean }>('/vault/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};
