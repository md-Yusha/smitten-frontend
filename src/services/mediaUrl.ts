import { API_BASE_URL, API_V1 } from '@/src/services/apiConfig';

function isApiMediaPath(path: string): boolean {
  return path.includes('/api/v1/chat/media/') || path.includes('/api/v1/vault/') || path.includes('/api/v1/memories/');
}

/** Rewrite media URLs to the phone's API host (localhost, stale ngrok, partner's old host). */
export function resolveApiMediaUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('ph://')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    if (isApiMediaPath(path) || path.includes('/uploads/')) {
      const base = new URL(API_BASE_URL);
      return `${base.origin}${path}${parsed.search}`;
    }

    const local =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '10.0.2.2';
    if (local) {
      const base = new URL(API_BASE_URL);
      return `${base.origin}${path}${parsed.search}`;
    }
  } catch {
    /* relative path below */
  }

  if (url.startsWith('/api/v1/') || url.startsWith('/uploads/')) {
    return `${API_BASE_URL.replace(/\/$/, '')}${url}`;
  }

  return url;
}

/** Vault thumbnail / full image — always uses current API host. */
export function resolveVaultMediaUrl(itemIdOrUrl: string): string {
  const trimmed = itemIdOrUrl.trim();
  const fromApi = resolveApiMediaUrl(trimmed);
  if (fromApi) return fromApi;
  if (trimmed.includes('/api/v1/vault/')) return trimmed;
  const id = trimmed.split('/').filter(Boolean).pop()?.split('?')[0];
  if (id && !id.includes('/')) {
    return `${API_V1}/vault/${encodeURIComponent(id)}/media`;
  }
  return `${API_V1}/vault/${encodeURIComponent(trimmed)}/media`;
}

/** Normalize chat message body to a fetchable media URL. */
export function resolveChatMessageMediaUrl(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return trimmed;

  const resolved = resolveApiMediaUrl(trimmed);
  if (resolved) return resolved;

  if (trimmed.includes('/chat/media/') || trimmed.includes('chat/media/')) {
    const id = trimmed.split('/').pop()?.split('?')[0];
    if (id) return `${API_V1}/chat/media/${encodeURIComponent(id)}`;
  }

  return trimmed;
}
