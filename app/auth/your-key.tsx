import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COUPLE_JOIN_BASE_URL = 'https://smitten.zelton.in/join';

export default function YourKeyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { refreshSession } = useTheme();
  const apiUser = useAuthStore((state) => state.apiUser);
  const inviteCode = apiUser?.inviteCode ?? (typeof params.code === 'string' ? params.code : '');
  useEffect(() => {
    const auth = useAuthStore.getState();
    if (!auth.signedOut && !auth.isSigningOut) void refreshSession();
  }, [refreshSession]);

  const shareKey = async () => {
    if (!inviteCode) return;
    try {
      const joinUrl = `${COUPLE_JOIN_BASE_URL}/${encodeURIComponent(inviteCode)}`;

      await Share.share({
        message: `Join me on Smittenz!\n\nUse my couple key: ${inviteCode}\n\nOpen this link to join: ${joinUrl}`,
        title: 'Join me on Smittenz',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* share dismissed */
    }
  };

  return (
    <WhiteAuthShell
      title="Connect with your partner"
      subtitle="Your key is ready. Complete your story before sharing it."
      showBack={false}
      contentStyle={styles.content}
    >
      <View style={styles.coupleVisual}>
        <UserAvatar uri={apiUser?.avatarUrl} size={72} borderColor="#fff" />
        <View style={styles.connectionLine} />
        <Ionicons name="heart" size={22} color={UnMeColors.m7} />
        <View style={styles.connectionLine} />
        <View style={styles.partnerPlaceholder}>
          <Ionicons name="person-outline" size={30} color="#c8b7bf" />
        </View>
      </View>

      <View style={styles.keyCard}>
        <Text style={styles.keyLabel}>Your invite code</Text>
        <Text selectable style={styles.key}>{inviteCode || '--------'}</Text>
      </View>

      <TouchableOpacity
        onPress={() => router.replace('/auth/story')}
        activeOpacity={0.88}
        style={whiteAuthStyles.button}
      >
        <Text style={whiteAuthStyles.buttonText}>Tell us your story</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => void shareKey()}
        activeOpacity={0.88}
        style={styles.shareButton}
      >
        <Ionicons name="share-outline" size={19} color={UnMeColors.m7} />
        <Text style={styles.shareText}>Share with partner</Text>
      </TouchableOpacity>
    </WhiteAuthShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 4 },
  coupleVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 48,
  },
  connectionLine: { width: 22, height: 1, backgroundColor: '#dfb7c3', marginHorizontal: 5 },
  partnerPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cfbdc5',
    backgroundColor: '#fbefef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCard: {
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingVertical: 30,
    marginBottom: 20,
    shadowColor: '#4b1c2d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  keyLabel: { color: UnMeColors.txMuted, fontFamily: 'Inter_500Medium', fontSize: 13 },
  key: {
    marginTop: 12,
    color: UnMeColors.txDark,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 29,
    letterSpacing: 5,
  },
  shareButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ead8dd',
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: '#fff',
  },
  shareText: {
    color: UnMeColors.m7,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
});
