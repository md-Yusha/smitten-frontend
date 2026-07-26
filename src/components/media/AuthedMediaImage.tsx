import React, { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageContentFit } from 'expo-image';
import {
  resolveAuthedMediaUri,
  needsCachedMediaDownload,
  getCachedMediaUriIfExists,
  deleteCachedMediaUri,
} from '@/src/services/authedMediaCache';
import { resolveApiMediaUrl } from '@/src/services/mediaUrl';
import { apiFetchHeaders } from '@/src/services/apiConfig';

type Props = {
  uri: string;
  style?: any;
  contentFit?: ImageContentFit;
  recyclingKey?: string;
  mediaCacheKey?: string;
  priority?: 'low' | 'normal' | 'high';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onLoad?: (event: any) => void;
  onError?: () => void;
  blurRadius?: number;
};

function ensureFileUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
    return uri;
  }
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
}

function stableCacheKey(uri: string, recyclingKey?: string): string {
  const resolved = resolveApiMediaUrl(uri) ?? uri;
  if (recyclingKey) {
    if (resolved.includes('/vault/') && !recyclingKey.startsWith('vault-')) {
      return `vault-${recyclingKey}`;
    }
    if (resolved.includes('/chat/media/') && !recyclingKey.startsWith('chat-')) {
      return `chat-${recyclingKey}`;
    }
    if (resolved.includes('/memories/') && !recyclingKey.startsWith('mem-')) {
      return `mem-${recyclingKey}`;
    }
    if (resolved.includes('/uploads/') && !recyclingKey.startsWith('mem-')) {
      return `mem-${recyclingKey}`;
    }
    return recyclingKey;
  }
  if (resolved.includes('/vault/')) {
    const id = resolved.split('/vault/')[1]?.split('/')[0];
    return id ? `vault-${id}` : resolved;
  }
  if (resolved.includes('/chat/media/')) {
    const id = resolved.split('/chat/media/')[1]?.split('/')[0];
    return id ? `chat-${id}` : resolved;
  }
  if (resolved.includes('/memories/')) {
    const id = resolved.split('/memories/')[1]?.split('/')[0];
    return id ? `mem-${id}` : resolved;
  }
  if (resolved.includes('/uploads/')) {
    const tail = resolved.split('/uploads/')[1]?.split('?')[0] ?? resolved;
    return `mem-${tail.replace(/\//g, '_')}`;
  }
  return resolved;
}

/** Loads API media (vault, chat, memories/uploads) with auth + ngrok headers. */
export const AuthedMediaImage = memo(function AuthedMediaImage({
  uri,
  style,
  contentFit = 'cover',
  recyclingKey,
  mediaCacheKey,
  priority = 'normal',
  onLoadStart,
  onLoadEnd,
  onLoad,
  onError,
  blurRadius,
}: Props) {
  const resolved = resolveApiMediaUrl(uri) ?? uri;
  const cacheKey = mediaCacheKey ?? stableCacheKey(uri, recyclingKey);
  const useCache = needsCachedMediaDownload(resolved);
  const [localUri, setLocalUri] = useState<string | null>(useCache ? null : resolved);
  const [failed, setFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    setRetryNonce(0);
  }, [cacheKey, resolved]);

  const load = useCallback(async () => {
    if (!useCache) {
      setLocalUri(resolved);
      setFailed(false);
      return;
    }

    if (retryNonce === 0) {
      const cached = await getCachedMediaUriIfExists(cacheKey);
      if (cached) {
        setLocalUri(ensureFileUri(cached));
        setFailed(false);
        return;
      }
    }

    setLocalUri(null);
    setFailed(false);
    const fileUri = await resolveAuthedMediaUri(resolved, cacheKey);
    if (fileUri) {
      setLocalUri(ensureFileUri(fileUri));
    } else {
      setFailed(true);
      onError?.();
    }
  }, [resolved, cacheKey, onError, useCache, retryNonce]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleImageError = useCallback(() => {
    if (useCache && retryNonce === 0) {
      void deleteCachedMediaUri(cacheKey).finally(() => {
        setLocalUri(null);
        setFailed(false);
        setRetryNonce(1);
      });
      return;
    }
    setFailed(true);
    onError?.();
  }, [cacheKey, onError, retryNonce, useCache]);

  if (failed) {
    return (
      <TouchableOpacity
        style={[style, styles.placeholder, styles.loading]}
        onPress={() => {
          void load();
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
      </TouchableOpacity>
    );
  }

  if (!localUri) {
    return (
      <View style={[style, styles.placeholder, styles.loading]}>
        <ActivityIndicator color="#9ca3af" />
      </View>
    );
  }

  const displayUri = ensureFileUri(localUri);

  if (useCache || displayUri.startsWith('file://') || displayUri.startsWith('content://')) {
    return (
      <Image
        source={{ uri: displayUri }}
        style={style}
        contentFit={contentFit}
        recyclingKey={cacheKey}
        cachePolicy="memory-disk"
        priority={priority}
        transition={priority === 'high' ? 120 : 0}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onError={handleImageError}
        onLoad={onLoad}
        blurRadius={blurRadius}
      />
    );
  }

  return (
    <Image
      source={{ uri: localUri, headers: Object.fromEntries(apiFetchHeaders().entries()) }}
      style={style}
      contentFit={contentFit}
      recyclingKey={cacheKey}
      cachePolicy="memory-disk"
      priority={priority}
      transition={priority === 'high' ? 120 : 0}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onError={handleImageError}
      onLoad={onLoad}
      blurRadius={blurRadius}
    />
  );
});

const styles = StyleSheet.create({
  placeholder: { backgroundColor: '#f0eeec' },
  loading: { alignItems: 'center', justifyContent: 'center' },
});
