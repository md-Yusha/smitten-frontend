import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteAuthButtonContent, WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { useAuthNavigation } from '@/src/hooks/useAuthNavigation';
import { coupleApi } from '@/src/services/api';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HaveKeyScreen() {
  const apiUser = useAuthStore((state) => state.apiUser);
  const setSession = useAuthStore((state) => state.setSession);
  const navigateForUser = useAuthNavigation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const connectingRef = useRef(false);

  if (!apiUser) return <Redirect href="/login" />;

  const normalizedCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  const connect = async () => {
    if (connectingRef.current) return;
    if (normalizedCode.length !== 8) {
      smittenAlert({
        title: 'Enter your partner’s code',
        message: 'The invite code contains 8 letters and numbers.',
        tone: 'warning',
      });
      return;
    }

    connectingRef.current = true;
    setLoading(true);
    let navigationStarted = false;
    try {
      const validation = await coupleApi.validateKey(normalizedCode);
      if (!validation.valid) {
        smittenAlert({ title: 'Invalid code', message: 'Check the code your partner shared.', tone: 'error' });
        return;
      }
      const response = await coupleApi.join({ inviteCode: normalizedCode, name: apiUser.name });
      setSession(response.user, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigateForUser(response.user);
      navigationStarted = true;
    } catch (error) {
      smittenAlertFromError(error, 'Could not connect', 'error');
    } finally {
      if (!navigationStarted) {
        connectingRef.current = false;
        setLoading(false);
      }
    }
  };

  return (
    <WhiteAuthShell
      title="Connect with your partner"
      subtitle="Enter the invite code your partner shared."
      backFallback="/auth/connect"
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

      <View style={styles.codeCard}>
        <Text style={styles.label}>Partner’s invite code</Text>
        <View style={whiteAuthStyles.inputRow}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#c1aeb5" />
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.toUpperCase())}
            placeholder="AB12CD34"
            placeholderTextColor="#c1aeb5"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            style={[whiteAuthStyles.input, styles.codeInput]}
          />
        </View>

        <TouchableOpacity
          onPress={() => void connect()}
          disabled={loading}
          activeOpacity={0.88}
          style={[whiteAuthStyles.button, loading && styles.disabled]}
        >
          <WhiteAuthButtonContent label="Connect" loading={loading} />
        </TouchableOpacity>
      </View>
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
  codeCard: {
    borderRadius: 22,
    backgroundColor: '#fff',
    padding: 18,
    shadowColor: '#4b1c2d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  label: {
    marginBottom: 10,
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
  codeInput: { textAlign: 'center', letterSpacing: 4, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 21 },
  disabled: { opacity: 0.65 },
});
