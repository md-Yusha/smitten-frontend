import {
  getCachedMediaUriIfExists,
  resolveAuthedMediaUri,
} from '@/src/services/authedMediaCache';
import { resolveApiMediaUrl } from '@/src/services/mediaUrl';
import { loadNativeVideoTools } from '@/src/services/nativeVideoTools';

const thumbnails = new Map<string, Promise<string | null>>();

function ensureFileUri(uri: string): string {
  return uri.startsWith('/') ? `file://${uri}` : uri;
}

/** Download encrypted-route video once, then extract a lightweight static chat frame. */
export function resolveVideoThumbnail(uri: string, cacheKey: string): Promise<string | null> {
  const existing = thumbnails.get(cacheKey);
  if (existing) return existing;

  const pending = (async () => {
    try {
      const resolved = resolveApiMediaUrl(uri) ?? uri;
      const videoCacheKey = cacheKey.includes('video') ? cacheKey : `video-${cacheKey}`;
      const localVideo =
        (await getCachedMediaUriIfExists(videoCacheKey)) ??
        (await resolveAuthedMediaUri(resolved, videoCacheKey));
      if (!localVideo) return null;

      const tools = loadNativeVideoTools();
      const { outputPath } = await tools.getFrameAt(localVideo, {
        time: 100,
        format: 'jpeg',
        quality: 82,
        maxWidth: 560,
        maxHeight: 420,
      });
      return ensureFileUri(outputPath);
    } catch (error) {
      console.warn('[videoThumbnail] could not extract frame', error);
      return null;
    }
  })();

  thumbnails.set(cacheKey, pending);
  return pending;
}

export function retryVideoThumbnail(cacheKey: string): void {
  thumbnails.delete(cacheKey);
}
