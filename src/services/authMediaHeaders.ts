import { getAccessToken } from '@/src/services/tokenStorage';

let cached: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

export function peekAuthMediaHeaders(): Record<string, string> | null {
  return cached?.Authorization ? cached : null;
}

/** Warm cache after login so vault thumbnails skip the token round-trip. */
export function preloadAuthMediaHeaders(): void {
  void getAuthMediaHeaders();
}

export async function getAuthMediaHeaders(forceFresh = false): Promise<Record<string, string>> {
  if (forceFresh) {
    cached = null;
    inflight = null;
  }
  if (cached?.Authorization) return cached;
  if (!inflight) {
    inflight = getAccessToken().then((token): Record<string, string> => {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      if (token) cached = headers;
      return headers;
    }).then((headers) => {
      inflight = null;
      return headers;
    });
  }
  return inflight;
}

export function clearAuthMediaHeadersCache() {
  cached = null;
  inflight = null;
}
