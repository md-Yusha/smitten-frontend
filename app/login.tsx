import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteAuthButtonContent, WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { useAuthNavigation } from '@/src/hooks/useAuthNavigation';
import { ApiError, authApi } from '@/src/services/api';
import { persistAuthSession } from '@/src/services/session';
import { getPendingInviteCode } from '@/src/services/pendingInvite';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

const LOGIN_LOGO = require('../assets/images/app_icon_square.png');

export default function LoginScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const setSession = useAuthStore((state) => state.setSession);
  const navigateForUser = useAuthNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const loginInFlightRef = useRef(false);

  const handleLogin = async () => {
    if (loginInFlightRef.current) return;
    if (!email.trim() || !password) {
      smittenAlert({
        title: 'Missing details',
        message: 'Enter your email and password to continue.',
        tone: 'warning',
      });
      return;
    }

    loginInFlightRef.current = true;
    setLoading(true);
    let navigationStarted = false;
    try {
      const response = await authApi.login({ email: email.trim(), password });
      await persistAuthSession(response);
      setSession(response.user, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const pendingInviteCode = await getPendingInviteCode();
      if (pendingInviteCode) router.replace({ pathname: '/auth/have-key', params: { code: pendingInviteCode } });
      else navigateForUser(response.user);
      navigationStarted = true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        smittenAlert({
          title: 'Could not log in',
          message: 'The email or password is incorrect.',
          tone: 'error',
        });
      } else {
        smittenAlertFromError(error, 'Login failed', 'error');
      }
    } finally {
      if (!navigationStarted) {
        loginInFlightRef.current = false;
        setLoading(false);
      }
    }
  };

  return (
    <WhiteAuthShell
      title="Welcome back"
      subtitle="Log in to continue your story"
      showBack={false}
      headerAccessory={
        <Image
          source={LOGIN_LOGO}
          defaultSource={LOGIN_LOGO}
          style={styles.logo}
          resizeMode="contain"
          fadeDuration={0}
        />
      }
      contentStyle={[
        styles.content,
        { paddingTop: Math.max(28, Math.min(52, windowHeight * 0.05)) },
      ]}
    >
      <View style={whiteAuthStyles.inputRow}>
        <Ionicons name="mail-outline" size={19} color="#c1aeb5" />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor="#c1aeb5"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={whiteAuthStyles.input}
        />
      </View>

      <View style={whiteAuthStyles.inputRow}>
        <Ionicons name="lock-closed-outline" size={19} color="#c1aeb5" />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#c1aeb5"
          secureTextEntry={!passwordVisible}
          autoComplete="password"
          style={whiteAuthStyles.input}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          onPress={() => setPasswordVisible((visible) => !visible)}
          hitSlop={8}
        >
          <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#b89fa8" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/auth/forgot-password',
            params: email.trim() ? { email: email.trim() } : undefined,
          })
        }
        style={styles.forgot}
      >
        <Text style={whiteAuthStyles.link}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.88}
        disabled={loading}
        onPress={() => void handleLogin()}
        style={[whiteAuthStyles.button, loading && styles.disabled]}
      >
        <WhiteAuthButtonContent label="Log In" loading={loading} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.createLink}>
        <Text style={styles.secondaryText}>
          New here? <Text style={whiteAuthStyles.link}>Create an account</Text>
        </Text>
      </TouchableOpacity>
    </WhiteAuthShell>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'flex-start' },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 24,
  },
  createLink: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  secondaryText: {
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  disabled: { opacity: 0.65 },
});
