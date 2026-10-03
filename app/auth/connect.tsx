import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ConnectChoiceScreen() {
  const router = useRouter();
  const apiUser = useAuthStore((state) => state.apiUser);

  if (!apiUser) return <Redirect href="/login" />;

  return (
    <WhiteAuthShell
      title="Connect with your partner"
      subtitle="Two accounts, one shared space."
      contentStyle={styles.content}
    >
      <View style={styles.coupleVisual}>
        <UserAvatar uri={apiUser.avatarUrl} size={72} borderColor="#fff" />
        <View style={styles.connectionLine} />
        <Ionicons name="heart" size={22} color={UnMeColors.m7} />
        <View style={styles.connectionLine} />
        <View style={styles.partnerPlaceholder}>
          <Ionicons name="person-outline" size={30} color="#c8b7bf" />
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push('/auth/payment')}
        style={styles.option}
      >
        <View style={styles.optionIcon}>
          <Ionicons name="key-outline" size={24} color={UnMeColors.m7} />
        </View>
        <View style={styles.optionCopy}>
          <Text style={styles.optionTitle}>Get a key</Text>
          <Text style={styles.optionText}>Choose a plan, complete payment and receive your invite code.</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={UnMeColors.m7} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push('/auth/have-key')}
        style={styles.option}
      >
        <View style={styles.optionIcon}>
          <Ionicons name="link-outline" size={24} color={UnMeColors.m7} />
        </View>
        <View style={styles.optionCopy}>
          <Text style={styles.optionTitle}>I have a key</Text>
          <Text style={styles.optionText}>Enter the code your partner shared and connect your accounts.</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={UnMeColors.m7} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login')} style={styles.loginLink}>
        <Text style={styles.loginText}>
          Use another account? <Text style={whiteAuthStyles.link}>Log in</Text>
        </Text>
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
  connectionLine: {
    width: 22,
    height: 1,
    backgroundColor: '#dfb7c3',
    marginHorizontal: 5,
  },
  partnerPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cfbdc5',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ead8dd',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 20,
    marginBottom: 18,
    backgroundColor: '#fff',
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f4',
  },
  optionCopy: { flex: 1, paddingHorizontal: 16 },
  optionTitle: {
    color: UnMeColors.txDark,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  optionText: {
    marginTop: 6,
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
  },
  loginLink: { alignItems: 'center', marginTop: 8, paddingVertical: 20 },
  loginText: { color: UnMeColors.txMuted, fontFamily: 'Inter_400Regular', fontSize: 14 },
});
