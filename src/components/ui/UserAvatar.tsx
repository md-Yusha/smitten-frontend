import React, { useState } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { resolveApiMediaUrl } from '@/src/services/mediaUrl';

type UserAvatarProps = {
  uri?: string | null;
  size?: number;
  borderColor?: string;
  style?: ViewStyle;
};

export const UserAvatar = React.memo(function UserAvatar({
  uri,
  size = 56,
  borderColor,
  style,
}: UserAvatarProps) {
  const { themeColor } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const rawUri = typeof uri === 'string' ? uri.trim() : '';
  const parsedUri = resolveAvatarUri(rawUri);
  // A failure belongs only to that exact URL. Avatar uploads use a new
  // cache-busting URL, which should be attempted immediately.
  const hasImage = Boolean(parsedUri) && failedUri !== parsedUri;

  if (hasImage) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: borderColor ? 2.5 : 0,
            borderColor,
          },
          style,
        ]}
      >
        <Ionicons name="person" size={size * 0.46} color={themeColor || '#ff85a2'} />
        <ExpoImage
          source={parsedUri}
          recyclingKey={parsedUri ?? undefined}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => setFailedUri(parsedUri)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderColor ? 2.5 : 0,
          borderColor,
        },
        style,
      ]}
    >
      <Ionicons name="person" size={size * 0.46} color={themeColor || '#ff85a2'} />
    </View>
  );
});

function resolveAvatarUri(uri: string): string | null {
  if (!uri || uri === 'null' || uri === 'undefined') return null;

  const resolved = resolveApiMediaUrl(uri) ?? uri;
  if (
    resolved.startsWith('file://') ||
    resolved.startsWith('content://') ||
    resolved.startsWith('ph://') ||
    resolved.startsWith('assets-library://') ||
    resolved.startsWith('data:image/')
  ) {
    return resolved;
  }

  try {
    const parsed = new URL(resolved);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#261820',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: '#261820',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
