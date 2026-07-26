import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  resolveVideoThumbnail,
  retryVideoThumbnail,
} from '@/src/services/videoThumbnail';

type Props = {
  uri: string;
  cacheKey: string;
  style?: object;
};

export function AuthedVideoThumbnail({ uri, cacheKey, style }: Props) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const next = await resolveVideoThumbnail(uri, cacheKey);
    setThumbnailUri(next);
    setFailed(!next);
  }, [cacheKey, uri]);

  useEffect(() => {
    setThumbnailUri(null);
    void load();
  }, [load]);

  if (thumbnailUri) {
    return <Image source={{ uri: thumbnailUri }} style={style} contentFit="cover" />;
  }

  if (failed) {
    return (
      <TouchableOpacity
        style={[style, styles.center]}
        onPress={() => {
          retryVideoThumbnail(cacheKey);
          void load();
        }}
      >
        <Ionicons name="videocam" size={34} color="rgba(255,255,255,0.72)" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[style, styles.center]}>
      <ActivityIndicator color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#20242b',
  },
});
