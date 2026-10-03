import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WhiteAuthButtonContent, WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { authApi } from '@/src/services/api';
import { UnMeColors } from '@/constants/smittenTheme';

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
      smittenAlert({ title: 'Email needed', message: 'Enter the email address you used for Smittenz.', tone: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword({ email: normalizedEmail });
      setResetEmail(normalizedEmail);
      setCode('');
      setCodeSent(true);
      smittenAlert({
        title: 'Email sent',
        message: 'If your email is registered with us, you will receive a reset code shortly.',
        tone: 'success',
      });
    } catch (error) {
      smittenAlertFromError(error, 'Could not send code', 'error');
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
      await authApi.resetPassword({ email: emailForReset, code: code.trim(), password });
      smittenAlert({
        title: 'Password updated',
        message: 'You can now log in with your new password.',
        tone: 'success',
        buttons: [{ text: 'Log in', primary: true, onPress: () => router.replace('/login') }],
      });
    } catch (error) {
      smittenAlertFromError(error, 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WhiteAuthShell
      title={codeSent ? 'Create a new password' : 'Reset your password'}
      subtitle={codeSent ? 'Enter the code from your email, then choose a new password.' : 'We will send a short code to your email.'}
      backFallback="/login"
    >
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />

      {codeSent ? (
        <>
          <Field
            label="Reset code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />
          <TouchableOpacity disabled={loading} onPress={() => void resetPassword()} activeOpacity={0.88} style={[whiteAuthStyles.button, loading && styles.disabled]}>
            <WhiteAuthButtonContent label="Update password" loading={loading} />
          </TouchableOpacity>
          <TouchableOpacity disabled={loading} onPress={() => void sendCode()} style={styles.secondaryAction}>
            <Text style={styles.link}>Resend code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity disabled={loading} onPress={() => void sendCode()} activeOpacity={0.88} style={[whiteAuthStyles.button, loading && styles.disabled]}>
          <WhiteAuthButtonContent label="Send reset code" loading={loading} />
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.replace('/login')} style={styles.secondaryAction}>
        <Text style={styles.mutedText}>Remembered it? <Text style={styles.link}>Log in</Text></Text>
      </TouchableOpacity>
    </WhiteAuthShell>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };

function Field({ label, style, ...props }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#c1aeb5" style={[whiteAuthStyles.inputRow, whiteAuthStyles.input, styles.input, style]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { marginBottom: 7, marginLeft: 3, color: UnMeColors.txMuted, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  input: { minHeight: 56, flex: undefined, width: '100%', borderWidth: 1, borderColor: '#ecd4d9', borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 14, color: UnMeColors.txDark, fontSize: 15 },
  secondaryAction: { alignItems: 'center', paddingVertical: 15 },
  mutedText: { color: UnMeColors.txMuted, fontFamily: 'Inter_400Regular', fontSize: 13 },
  link: { color: UnMeColors.m7, fontFamily: 'Inter_700Bold', fontSize: 13 },
  disabled: { opacity: 0.6 },
});
