import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as ScreenCapture from 'expo-screen-capture';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthedMediaImage } from '@/src/components/media/AuthedMediaImage';
import { AuthedMediaVideo } from '@/src/components/media/AuthedMediaVideo';
import { CircularCountdownBadge } from '@/src/components/media/CircularCountdownBadge';
import { apiFetchHeaders } from '@/src/services/apiConfig';

type Props = {
  visible: boolean;
  uri: string | null;
  /** Disk cache key (vault-*, chat-*). Defaults to recyclingKey. */
  mediaCacheKey?: string;
  recyclingKey?: string;
  onClose: () => void;
  onDelete?: () => void;
  blockScreenshots?: boolean;
  /** Giphy / external URLs — load directly so GIFs stay animated. */
  remote?: boolean;
  countdownExpiresAt?: string | null;
  countdownNow?: number;
  countdownTotalMs?: number;
  countdownColor?: string;
  onMediaError?: () => void;
  mediaType?: 'image' | 'video';
};

export function FullscreenMediaModal({
  visible,
  uri,
  mediaCacheKey,
  recyclingKey,
  onClose,
  onDelete,
  blockScreenshots = false,
  remote = false,
  countdownExpiresAt = null,
  countdownNow = Date.now(),
  countdownTotalMs = 30_000,
  countdownColor = '#B5174A',
  onMediaError,
  mediaType = 'image',
}: Props) {
  const insets = useSafeAreaInsets();
  const cacheKey = mediaCacheKey ?? recyclingKey;
  const [isLoading, setIsLoading] = useState(true);
  const remainingMs = countdownExpiresAt
    ? Math.max(0, new Date(countdownExpiresAt).getTime() - countdownNow)
    : null;
  const remainingSeconds = remainingMs === null ? null : Math.ceil(remainingMs / 1000);
  const progress = remainingMs === null ? 0 : Math.max(0, Math.min(1, remainingMs / countdownTotalMs));

  useEffect(() => {
    if (visible && uri) setIsLoading(true);
  }, [visible, uri]);

  useEffect(() => {
    if (!visible || !blockScreenshots) return;
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      if (process.env.EXPO_PUBLIC_DISABLE_SCREENSHOT_BLOCK === 'true') {
        void ScreenCapture.allowScreenCaptureAsync();
      }
    };
  }, [visible, blockScreenshots]);

  return (
    <Modal visible={visible && !!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={[styles.closeBtn, { top: Math.max(insets.top, 12) + 8 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
        {onDelete ? (
          <TouchableOpacity
            style={[styles.deleteBtn, { top: Math.max(insets.top, 12) + 8 }]}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete video"
          >
            <Feather name="trash-2" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
        {isLoading ? (
          <View style={[styles.loadingBadge, { top: Math.max(insets.top, 12) + 12 }]}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        ) : null}
        {remainingSeconds !== null ? (
          <View style={[styles.countdownCircle, { top: Math.max(insets.top, 12) + 62 }]}>
            <CircularCountdownBadge
              seconds={remainingSeconds}
              progress={progress}
              color={countdownColor}
              size={58}
            />
          </View>
        ) : null}
        <View style={styles.imageTap}>
          {uri ? mediaType === 'video' ? (
            <AuthedMediaVideo
              uri={uri}
              cacheKey={cacheKey ?? 'fullscreen-video'}
              style={styles.image}
              controls
              contentFit="contain"
              onReady={() => setIsLoading(false)}
              onError={onMediaError}
            />
          ) : (
            remote ? (
              <Image
                source={{ uri, headers: Object.fromEntries(apiFetchHeaders().entries()) }}
                style={styles.image}
                contentFit="contain"
                priority="high"
                cachePolicy="memory-disk"
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={onMediaError}
              />
            ) : (
              <AuthedMediaImage
                uri={uri}
                recyclingKey={recyclingKey ?? cacheKey}
                mediaCacheKey={cacheKey}
                priority="high"
                style={styles.image}
                contentFit="contain"
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={onMediaError}
              />
            )
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageTap: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  deleteBtn: {
    position: 'absolute',
    right: 76,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220,38,38,0.78)',
  },
  loadingBadge: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  countdownCircle: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
