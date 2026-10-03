import { ImageCropModal } from '@/src/components/media/ImageCropModal';
import { smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { authApi, uploadAvatar } from '@/src/services/api';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNotificationInboxStore } from '@/src/store/useNotificationInboxStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MOODS = ['Happy 😊', 'Loving ❤️', 'Missing you ☁️', 'Sleepy 😴', 'Busy 💼', 'Sad 😢', 'Excited 🎉'];

export default function SelfProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const apiUser = useAuthStore((s) => s.apiUser);
  const user = useAuthStore((s) => s.user);
  const items = useNotificationInboxStore((s) => s.items);
  const hydrate = useNotificationInboxStore((s) => s.hydrate);
  const [uploading, setUploading] = useState(false);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [savingMood, setSavingMood] = useState(false);

  useEffect(() => { void hydrate(); }, [hydrate]);

  const changePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    useAppLockStore.getState().setSystemOverlayActive(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      const uri = result.assets?.[0]?.uri;
      if (result.canceled || !uri) return;
      setCropUri(uri);
    } catch (error) {
      smittenAlertFromError(error, 'Photo upload failed', 'error');
    } finally {
      setUploading(false);
      useAppLockStore.getState().setSystemOverlayActive(false);
    }
  };

  const changeMood = async (mood: string) => {
    const previous = useAuthStore.getState().apiUser;
    if (!previous || savingMood) return;
    setSavingMood(true);
    useAuthStore.getState().setSession({ ...previous, mood });
    try {
      const { user: updated } = await authApi.updateProfile({ mood });
      useAuthStore.getState().setSession(updated);
      void Haptics.selectionAsync();
    } catch (error) {
      useAuthStore.getState().setSession(previous);
      smittenAlertFromError(error, 'Failed to update mood', 'error');
    } finally {
      setSavingMood(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={23} color="#302a42" /></TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <UserAvatar uri={user?.avatarSelf} size={88} borderColor="#fff" />
          <TouchableOpacity onPress={() => void changePhoto()} disabled={uploading} style={styles.photoButton} accessibilityRole="button" accessibilityLabel="Update profile photo">
            {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="pencil" size={15} color="#fff" />}
          </TouchableOpacity>
          <Text style={styles.name}>{user?.nicknameSelf || apiUser?.name || 'You'}</Text>
        </View>

        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <Text style={styles.sectionSub}>Your mood appears on your partner&apos;s home screen.</Text>
        <View style={styles.moods}>
          {MOODS.map((mood) => {
            const active = apiUser?.mood === mood;
            return <TouchableOpacity key={mood} disabled={savingMood} onPress={() => void changeMood(mood)} style={[styles.mood, active && styles.moodActive]}><Text style={[styles.moodText, active && styles.moodTextActive]}>{mood}</Text></TouchableOpacity>;
          })}
        </View>

        <View style={styles.notificationsHeader}>
          <Text style={styles.sectionTitle}>Recent notifications</Text>
        </View>
        <View style={styles.notificationCard}>
          {items.length ? items.slice(0, 10).map((item, index) => (
            <View key={item.id} style={[styles.notification, index > 0 && styles.notificationBorder]}>
              <View style={[styles.notificationDot, item.read && styles.notificationDotRead]} />
              <View style={styles.notificationCopy}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
              </View>
            </View>
          )) : <Text style={styles.empty}>No notifications yet.</Text>}
        </View>
      </ScrollView>
      <ImageCropModal
        visible={!!cropUri}
        uri={cropUri}
        aspectRatio={1}
        onCancel={() => setCropUri(null)}
        onDone={(uri) => {
          setCropUri(null);
          setUploading(true);
          void uploadAvatar(uri)
            .then(({ user: updated }) => {
              useAuthStore.getState().setSession(updated);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            })
            .catch((error) => smittenAlertFromError(error, 'Photo upload failed', 'error'))
            .finally(() => setUploading(false));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f1e4e8' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#302a42', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22 },
  content: { paddingHorizontal: 22, paddingTop: 24 },
  identity: { alignItems: 'center', marginBottom: 28 },
  photoButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: -10, backgroundColor: '#e45d7c', borderWidth: 3, borderColor: '#fff' },
  name: { marginTop: 8, color: '#302a42', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24 },
  sectionTitle: { color: '#302a42', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 19 },
  sectionSub: { marginTop: 4, color: '#9e8e9c', fontFamily: 'Inter_400Regular', fontSize: 12 },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 30 },
  mood: { borderWidth: 1, borderColor: '#ecdfe3', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#fff' },
  moodActive: { borderColor: '#e45d7c', backgroundColor: '#f5f5f4' },
  moodText: { color: '#716473', fontFamily: 'Inter_500Medium', fontSize: 12 },
  moodTextActive: { color: '#c7395b', fontFamily: 'Inter_700Bold' },
  notificationsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  count: { color: '#b09da8', fontFamily: 'Inter_500Medium', fontSize: 11 },
  notificationCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#eee2e6', borderRadius: 20, backgroundColor: '#fff' },
  notification: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  notificationBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee2e6' },
  notificationDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, backgroundColor: '#e45d7c' },
  notificationDotRead: { backgroundColor: '#d9ced3' },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: '#302a42', fontFamily: 'Inter_700Bold', fontSize: 13 },
  notificationMessage: { marginTop: 3, color: '#958792', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  empty: { padding: 24, color: '#a4939d', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
});
