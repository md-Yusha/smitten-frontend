import { API_V1, apiFetchHeaders } from './apiConfig';
import { clearAuthMediaHeadersCache, preloadAuthMediaHeaders } from './authMediaHeaders';
import { getRefreshToken, saveTokens } from './tokenStorage';

let refreshInFlight: Promise<string | null> | null = null;

/** Share one refresh request across every API/upload request that receives a 401. */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    let res: Response;
    try {
      res = await fetch(`${API_V1}/auth/refresh`, {
        method: 'POST',
        headers: apiFetchHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      // A connection failure says nothing about whether the refresh token is
      // valid. Let callers keep the current session and retry later.
      throw error instanceof Error ? error : new Error('Token refresh unavailable');
    }

    // Only an explicit auth rejection proves that the saved session expired.
    // Treat server/proxy failures as temporary so they cannot log the user out.
    if (res.status === 400 || res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new Error(`Token refresh unavailable (${res.status})`);

    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken || !data.refreshToken) {
      throw new Error('Token refresh returned an invalid response');
    }
    clearAuthMediaHeadersCache();
    await saveTokens(data.accessToken, data.refreshToken);
    preloadAuthMediaHeaders();
    return data.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
