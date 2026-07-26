import { resolveApiMediaUrl } from '@/src/services/mediaUrl';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function AvatarPreviewModal({
  visible,
  uri,
  name,
  onClose,
}: {
  visible: boolean;
  uri?: string | null;
  name: string;
  onClose: () => void;
}) {
  const resolved = uri ? (resolveApiMediaUrl(uri) ?? uri) : null;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={22} color="#302a42" />
            </TouchableOpacity>
          </View>
          {resolved ? (
            <Image source={{ uri: resolved }} style={styles.image} contentFit="cover" transition={180} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="person" size={80} color="#d95a79" />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26, backgroundColor: 'rgba(24,12,19,0.72)' },
  card: { width: '100%', maxWidth: 390, overflow: 'hidden', borderRadius: 26, backgroundColor: '#fff' },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 10 },
  name: { flex: 1, color: '#302a42', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20 },
  close: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#f8edf0' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
