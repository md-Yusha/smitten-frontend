import { needsCachedMediaDownload, resolveAuthedMediaUri } from '@/src/services/authedMediaCache';
import { vaultItemMediaUrl, type VaultItem } from '@/src/services/vaultApi';
import { resolveApiMediaUrl, resolveChatMessageMediaUrl } from '@/src/services/mediaUrl';

const MAX_CONCURRENT = 4;
let queue: Promise<void> = Promise.resolve();
let active = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => {
    while (active >= MAX_CONCURRENT) {
      await new Promise((r) => setTimeout(r, 40));
    }
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
    }
  };
  const next = queue.then(run, run);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** Download vault thumbnails into the on-device media cache (background). */
export function prefetchVaultItems(items: VaultItem[], opts?: { partnerOnly?: boolean; mineOnly?: boolean; selfId?: string }) {
  let list = items;
  if (opts?.partnerOnly && opts.selfId) {
    list = items.filter((i) => i.uploaderId !== opts.selfId);
  } else if (opts?.mineOnly && opts.selfId) {
    list = items.filter((i) => i.uploaderId === opts.selfId);
  }
  for (const item of list.slice(0, 32)) {
    if (item.mediaType === 'video') continue;
    const url = vaultItemMediaUrl(item);
    void schedule(() => resolveAuthedMediaUri(url, `vault-${item.id}`));
  }
}

/** Warm chat GIF / upload URLs that require Authorization. */
export function prefetchChatMediaUrls(urls: string[]): void {
  for (const raw of urls.slice(-40)) {
    const url = resolveChatMessageMediaUrl(raw);
    if (!needsCachedMediaDownload(url)) continue;
    const key = url.includes('/chat/media/') ? `chat-${url.split('/chat/media/')[1]?.split('/')[0] ?? url}` : url;
    void schedule(() => resolveAuthedMediaUri(url, key));
  }
}

export function prefetchMemoryImages(
  memories: { id: string; imageUrl: string | null; mediaType?: 'image' | 'video'; updatedAt?: string }[],
): void {
  for (const m of memories) {
    if (!m.imageUrl) continue;
    if (m.mediaType === 'video') continue;
    const resolved = resolveApiMediaUrl(m.imageUrl) ?? m.imageUrl;
    const version = String(Date.parse(m.updatedAt ?? '') || m.updatedAt || m.id).replace(/[^a-zA-Z0-9]/g, '');
    const url = m.updatedAt ? `${resolved}${resolved.includes('?') ? '&' : '?'}v=${encodeURIComponent(m.updatedAt)}` : resolved;
    if (!needsCachedMediaDownload(url)) continue;
    void schedule(() => resolveAuthedMediaUri(url, `mem-${m.id}-${version}`));
  }
}
