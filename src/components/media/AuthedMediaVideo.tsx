import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
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
}: Omit<Props, 'cacheKey'>) {
  const readyCalledRef = useRef(false);
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
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        onError?.();
        return;
      }
      if (status !== 'readyToPlay') return;
      // A tiny seek asks Android's decoder to paint a real frame while the
      // thumbnail player remains paused and muted.
      if (!controls && player.currentTime === 0 && player.duration > 0.1) {
        player.currentTime = Math.min(0.1, player.duration / 2);
      }
      if (!readyCalledRef.current) {
        readyCalledRef.current = true;
        onReady?.();
      }
    });
    return () => subscription.remove();
  }, [controls, onError, onReady, player]);

  return (
    <VideoView
      player={player}
      style={style}
      nativeControls={controls}
      contentFit={contentFit}
      fullscreenOptions={controls ? { enable: true } : { enable: false }}
      surfaceType="textureView"
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
}: Props) {
  const resolved = resolveApiMediaUrl(uri) ?? uri;
  const videoCacheKey = cacheKey.includes('video') ? cacheKey : `video-${cacheKey}`;
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

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
    setLocalUri(null);
    void load();
  }, [load]);

  if (failed) {
    return (
      <TouchableOpacity
        style={[style, styles.center]}
        onPress={() => void deleteCachedMediaUri(videoCacheKey).then(load)}
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
      uri={localUri}
      style={style}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      contentFit={contentFit}
      onReady={onReady}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
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
