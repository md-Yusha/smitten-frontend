import * as FileSystem from 'expo-file-system/legacy';
import { apiFetchHeaders, API_V1 } from '@/src/services/apiConfig';
import { clearAuthMediaHeadersCache, getAuthMediaHeaders } from '@/src/services/authMediaHeaders';
import {
  resolveApiMediaUrl,
  resolveChatMessageMediaUrl,
  resolveVaultMediaUrl,
} from '@/src/services/mediaUrl';

const inflight = new Map<string, Promise<string | null>>();
const AUTH_HEADER_WAIT_ATTEMPTS = 8;
const AUTH_HEADER_WAIT_MS = 120;

function cacheFilePath(cacheKey: string): string {
  const safe = cacheKey.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error('No cache directory');
  const extension = cacheKey.includes('video') ? 'mp4' : 'jpg';
  return `${dir}smitten-media-${safe}.${extension}`;
}

/** Vault / chat / memories need Authorization; /uploads/ needs ngrok-safe download. */
export function needsCachedMediaDownload(url: string): boolean {
  if (!url?.trim()) return false;
  if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('ph://')) {
    return false;
  }
  return url.includes('/vault/') || url.includes('/chat/media/') || url.includes('/memories/') || url.includes('/uploads/');
}

/** @deprecated use needsCachedMediaDownload */
export function isCoupleAuthedMediaUrl(url: string): boolean {
  return url.includes('/vault/') || url.includes('/chat/media/') || url.includes('/memories/');
}

export async function getCachedMediaUriIfExists(cacheKey: string): Promise<string | null> {
  try {
    const dest = cacheFilePath(cacheKey);
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists && (info.size ?? 0) > 200) return ensureFileUri(dest);
  } catch {
    /* ignore */
  }
  return null;
}

export async function deleteCachedMediaUri(cacheKey: string): Promise<void> {
  try {
    const dest = cacheFilePath(cacheKey);
    await FileSystem.deleteAsync(dest, { idempotent: true });
  } catch {
    /* best-effort */
  }
}

export async function seedCachedMediaUri(cacheKey: string, sourceUri: string): Promise<string | null> {
  try {
    const dest = cacheFilePath(cacheKey);
    const from = ensureFileUri(sourceUri);
    if (from === ensureFileUri(dest)) return ensureFileUri(dest);
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.copyAsync({ from, to: dest });
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists && (info.size ?? 0) > 200) return ensureFileUri(dest);
  } catch {
    /* best-effort */
  }
  return null;
}

function resolveDownloadUrl(uri: string): string {
  if (uri.includes('/vault/')) return resolveVaultMediaUrl(uri);
  if (uri.includes('/chat/media/')) return resolveChatMessageMediaUrl(uri);
  return resolveApiMediaUrl(uri) ?? uri;
}

function looksLikeMedia(bytes: Uint8Array, contentType: string): boolean {
  if (contentType.startsWith('image/') || contentType.startsWith('video/')) return bytes.length > 200;
  if (bytes.length < 4) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true; // webp
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return true; // mp4/mov
  return bytes.length > 500;
}

function ensureFileUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAuthMediaHeaders(forceFresh = false): Promise<Record<string, string>> {
  let headers = await getAuthMediaHeaders(forceFresh);
  if (headers.Authorization) return headers;

  for (let i = 0; i < AUTH_HEADER_WAIT_ATTEMPTS; i += 1) {
    await sleep(AUTH_HEADER_WAIT_MS);
    headers = await getAuthMediaHeaders(true);
    if (headers.Authorization) return headers;
  }

  return headers;
}

async function downloadViaFetch(resolved: string, dest: string, withAuth: boolean): Promise<string | null> {
  try {
    const fetchWithHeaders = async (forceFreshAuth = false) => {
      const auth = withAuth ? await waitForAuthMediaHeaders(forceFreshAuth) : {};
      if (withAuth && !auth.Authorization) {
        return null;
      }
      return fetch(resolved, { headers: apiFetchHeaders(auth) });
    };

    let res = await fetchWithHeaders(false);
    if (!res) return null;
    if (withAuth && res.status === 401) {
      clearAuthMediaHeadersCache();
      res = await fetchWithHeaders(true);
      if (!res) return null;
    }
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      console.error('[authedMediaCache] fetch fallback returned html/json instead of image');
      return null;
    }

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (!looksLikeMedia(bytes, contentType)) {
      console.error('[authedMediaCache] fetch fallback: response is not supported media, bytes length:', bytes.length);
      return null;
    }

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    await FileSystem.writeAsStringAsync(dest, btoa(binary), { encoding: FileSystem.EncodingType.Base64 });
    return ensureFileUri(dest);
  } catch (err) {
    console.error('[authedMediaCache] downloadViaFetch error:', err);
    return null;
  }
}

export async function resolveAuthedMediaUri(
  uri: string,
  cacheKey: string,
): Promise<string | null> {
  const resolved = resolveDownloadUrl(uri);
  if (!needsCachedMediaDownload(resolved)) return resolved;

  let dest: string;
  try {
    dest = cacheFilePath(cacheKey);
  } catch (err) {
    console.error('[authedMediaCache] cacheFilePath error:', err);
    return null;
  }

  try {
    const existing = await FileSystem.getInfoAsync(dest);
    if (existing.exists && (existing.size ?? 0) > 200) return ensureFileUri(dest);
  } catch {
    /* ignore */
  }

  const pending = inflight.get(dest);
  if (pending) return pending;

  const needsAuth = isCoupleAuthedMediaUrl(resolved);

  const task = (async () => {
    try {
      const attemptDownload = async (forceFreshAuth = false) => {
        const headers = needsAuth ? await waitForAuthMediaHeaders(forceFreshAuth) : {};
        if (needsAuth && !headers.Authorization) {
          return null;
        }
        return FileSystem.downloadAsync(resolved, dest, {
          headers: Object.fromEntries(apiFetchHeaders(headers).entries()),
        });
      };

      try {
        let result = await attemptDownload(false);
        if (!result) return null;
        if (needsAuth && result.status === 401) {
          clearAuthMediaHeadersCache();
          result = await attemptDownload(true);
          if (!result) return null;
        }
        if (result.status >= 200 && result.status < 300) {
          const info = await FileSystem.getInfoAsync(dest);
          if (info.exists && ((info as any).size ?? 0) > 200) {
            return ensureFileUri(result.uri);
          } else {
            console.warn('[authedMediaCache] downloadAsync file too small or non-existent, size:', info.exists ? (info as any).size : 'none');
          }
        }
      } catch (err) {
        console.error('[authedMediaCache] FileSystem.downloadAsync exception:', err);
      }

      try {
        await FileSystem.deleteAsync(dest, { idempotent: true });
      } catch {
        /* ignore */
      }

      return downloadViaFetch(resolved, dest, needsAuth);
    } catch (err) {
      console.error('[authedMediaCache] resolveAuthedMediaUri general error:', err);
      return null;
    }
  })();

  inflight.set(dest, task);
  try {
    return await task;
  } catch {
    return null;
  } finally {
    inflight.delete(dest);
  }
}

export function chatMediaUrl(mediaId: string): string {
  return `${API_V1}/chat/media/${encodeURIComponent(mediaId)}`;
}

export function isLocalDeviceMediaUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://')
  );
}

export async function clearAuthedMediaFileCache(): Promise<void> {
  try {
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!dir) return;
    const names = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      names
        .filter((n) => n.startsWith('smitten-media-'))
        .map((n) => FileSystem.deleteAsync(`${dir}${n}`, { idempotent: true })),
    );
  } catch {
    /* best-effort */
  }
}
