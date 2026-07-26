import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoThumbnail } from 'expo-video';
import {
  deleteCachedMediaUri,
  getCachedMediaUriIfExists,
  resolveAuthedMediaUri,
} from '@/src/services/authedMediaCache';
import { resolveApiMediaUrl } from '@/src/services/mediaUrl';

type Props = {
  uri: string;
  cacheKey: string;
  style?: any;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  contentFit?: 'contain' | 'cover' | 'fill';
  onReady?: () => void;
  onError?: () => void;
  onVideoSize?: (width: number, height: number) => void;
};

function VideoSurface({
  uri,
  style,
  controls,
  autoPlay,
  muted,
  contentFit,
  onReady,
  onError,
  onVideoSize,
}: Omit<Props, 'cacheKey'>) {
  const readyCalledRef = useRef(false);
  const thumbnailRequestedRef = useRef(false);
  const [thumbnail, setThumbnail] = useState<VideoThumbnail | null>(null);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = !controls;
  });

  useEffect(() => {
    player.muted = muted ?? !controls;
  }, [controls, muted, player]);

  useEffect(() => {
    if (autoPlay) player.play();
  }, [autoPlay, player]);

  useEffect(() => {
    let active = true;
    const handleReady = () => {
      if (!controls && !thumbnailRequestedRef.current) {
        thumbnailRequestedRef.current = true;
        const previewTime = Math.min(3, Math.max(0.5, player.duration * 0.1));
        void player
          .generateThumbnailsAsync(previewTime, { maxWidth: 560, maxHeight: 560 })
          .then(([next]) => {
            if (!active || !next) return;
            setThumbnail(next);
            if (next.width > 0 && next.height > 0) {
              onVideoSize?.(next.width, next.height);
            }
          })
          .catch((error) => {
            console.warn('[AuthedMediaVideo] could not create preview frame:', error);
            player.currentTime = Math.min(previewTime, player.duration / 2);
          });
      }
      if (!readyCalledRef.current) {
        readyCalledRef.current = true;
        onReady?.();
      }
    };
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        onError?.();
        return;
      }
      if (status === 'readyToPlay') handleReady();
    });
    if (player.status === 'readyToPlay') handleReady();
    return () => {
      active = false;
      subscription.remove();
    };
  }, [controls, onError, onReady, onVideoSize, player]);

  useEffect(() => {
    const subscription = player.addListener('sourceLoad', ({ availableVideoTracks }) => {
      const size = availableVideoTracks[0]?.size;
      if (!size) return;
      if (size.width > 0 && size.height > 0) {
        onVideoSize?.(size.width, size.height);
      }
    });
    return () => subscription.remove();
  }, [onVideoSize, player]);

  if (!controls && thumbnail) {
    return <Image source={thumbnail} style={style} contentFit={contentFit} />;
  }

  return (
    <VideoView
      player={player}
      style={style}
      nativeControls={controls}
      contentFit={contentFit}
      fullscreenOptions={controls ? { enable: true } : { enable: false }}
      surfaceType="textureView"
      pointerEvents={controls ? 'auto' : 'none'}
    />
  );
}

/** Downloads private media with auth, then plays the local encrypted-route response. */
export function AuthedMediaVideo({
  uri,
  cacheKey,
  style,
  controls = false,
  autoPlay = false,
  muted,
  contentFit = 'contain',
  onReady,
  onError,
  onVideoSize,
}: Props) {
  const resolved = resolveApiMediaUrl(uri) ?? uri;
  const videoCacheKey = cacheKey.includes('video') ? cacheKey : `video-${cacheKey}`;
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [playerRevision, setPlayerRevision] = useState(0);
  const recoveryAttemptRef = useRef(0);

  const load = useCallback(async () => {
    setFailed(false);
    const cached = await getCachedMediaUriIfExists(videoCacheKey);
    const next = cached ?? (await resolveAuthedMediaUri(resolved, videoCacheKey));
    if (next) setLocalUri(next);
    else {
      setFailed(true);
      onError?.();
    }
  }, [onError, resolved, videoCacheKey]);

  useEffect(() => {
    recoveryAttemptRef.current = 0;
    setPlayerRevision(0);
    setLocalUri(null);
    void load();
  }, [load]);

  const handlePlaybackError = useCallback(() => {
    if (recoveryAttemptRef.current === 0) {
      recoveryAttemptRef.current = 1;
      setPlayerRevision((current) => current + 1);
      return;
    }
    if (recoveryAttemptRef.current === 1) {
      recoveryAttemptRef.current = 2;
      setLocalUri(null);
      void deleteCachedMediaUri(videoCacheKey).then(load);
      return;
    }
    setFailed(true);
    onError?.();
  }, [load, onError, videoCacheKey]);

  if (failed) {
    return (
      <TouchableOpacity
        style={[style, styles.center]}
        onPress={() => {
          recoveryAttemptRef.current = 0;
          setPlayerRevision((current) => current + 1);
          void deleteCachedMediaUri(videoCacheKey).then(load);
        }}
      >
        <Ionicons name="alert-circle-outline" size={26} color="#ef4444" />
      </TouchableOpacity>
    );
  }

  if (!localUri) {
    return (
      <View style={[style, styles.center]}>
        <ActivityIndicator color="#9ca3af" />
      </View>
    );
  }

  return (
    <VideoSurface
      key={`${localUri}-${playerRevision}`}
      uri={localUri}
      style={style}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      contentFit={contentFit}
      onReady={onReady}
      onError={handlePlaybackError}
      onVideoSize={onVideoSize}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
});
