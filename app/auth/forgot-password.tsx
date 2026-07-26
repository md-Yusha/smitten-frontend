import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SmittenColors } from '@/constants/smittenTheme';
import { AuthShell, authStyles } from '@/src/components/auth/AuthShell';
import { GradientPrimaryButton } from '@/src/components/ui/GradientPrimaryButton';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { authApi } from '@/src/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const sendCode = async () => {
    if (!normalizedEmail) {
      smittenAlert({
        title: 'Email needed',
        message: 'Enter the email address you used for Smittenz.',
        tone: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword({ email: normalizedEmail });
      setResetEmail(normalizedEmail);
      setCode('');
      setCodeSent(true);
      smittenAlert({
        title: 'Check your email',
        message: 'If this email is registered, we sent a 6-digit reset code.',
        tone: 'success',
      });
    } catch (e) {
      smittenAlertFromError(e, 'Could not send code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const emailForReset = resetEmail || normalizedEmail;
    if (!emailForReset || code.trim().length !== 6 || password.length < 8) {
      smittenAlert({
        title: 'Check details',
        message: 'Enter your email, the 6-digit code, and a new password with at least 8 characters.',
        tone: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        email: emailForReset,
        code: code.trim(),
        password,
      });
      smittenAlert({
        title: 'Password updated',
        message: 'You can now log in with your new password.',
        tone: 'success',
        buttons: [{ text: 'Log in', primary: true, onPress: () => router.replace('/login') }],
      });
    } catch (e) {
      smittenAlertFromError(e, 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="We will send a short code to your email.">
      <View className="mb-5">
        <Text className="mb-2 ml-1 text-xs font-sans-semibold uppercase tracking-widest text-muted">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          className="rounded-[22px] border border-stone-200 bg-white px-5 py-4 font-sans text-lg text-ink"
          style={authStyles.inputShadow}
        />
      </View>

      {codeSent ? (
        <>
          <View className="mb-5">
            <Text className="mb-2 ml-1 text-xs font-sans-semibold uppercase tracking-widest text-muted">Reset code</Text>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={6}
              className="rounded-[22px] border border-stone-200 bg-white px-5 py-4 font-sans text-lg text-ink"
              style={authStyles.inputShadow}
            />
          </View>

          <View className="mb-7">
            <Text className="mb-2 ml-1 text-xs font-sans-semibold uppercase tracking-widest text-muted">New password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="rounded-[22px] border border-stone-200 bg-white px-5 py-4 font-sans text-lg text-ink"
              style={authStyles.inputShadow}
            />
          </View>

          <GradientPrimaryButton label="Update password" loading={loading} onPress={resetPassword} />

          <TouchableOpacity onPress={sendCode} className="mt-5 py-2">
            <Text className="text-center font-sans-semibold" style={{ color: SmittenColors.accentBrand }}>
              Send a new code
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <GradientPrimaryButton label="Send reset code" loading={loading} onPress={sendCode} />
      )}

      <TouchableOpacity onPress={() => router.replace('/login')} className="mt-5 py-2">
        <Text className="text-center font-sans text-muted">
          Remembered it? <Text style={{ color: SmittenColors.accentBrand }}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </AuthShell>
  );
}
