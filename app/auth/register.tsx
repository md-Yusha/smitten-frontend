import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteAuthButtonContent, WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { authApi, uploadAvatar } from '@/src/services/api';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { persistAuthSession } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [avatarUri, setAvatarUri] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailVerificationKey, setEmailVerificationKey] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  const normalizedEmail = email.trim().toLowerCase();

  const onEmailChange = (value: string) => {
    setEmail(value);
    setEmailCode('');
    setEmailVerificationKey('');
    setEmailVerified(false);
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      smittenAlert({
        title: 'Photo access needed',
        message: 'Allow photo access to choose a profile picture.',
        tone: 'warning',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) setAvatarUri(result.assets[0].uri);
  };

  const requestOtp = async () => {
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      smittenAlert({ title: 'Enter your email', message: 'Enter a valid email address first.', tone: 'warning' });
      return;
    }
    setSendingOtp(true);
    try {
      await authApi.requestEmailVerification({ email: normalizedEmail });
      smittenAlert({ title: 'OTP sent', message: 'Check your email for the 6-digit code.', tone: 'success' });
    } catch (error) {
      smittenAlertFromError(error, 'Could not send OTP', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(emailCode.trim())) {
      smittenAlert({ title: 'Enter the OTP', message: 'Enter the 6-digit code sent to your email.', tone: 'warning' });
      return;
    }
    setVerifyingOtp(true);
    try {
      const response = await authApi.verifyEmailVerification({
        email: normalizedEmail,
        code: emailCode.trim(),
      });
      setEmailVerificationKey(response.verificationKey);
      setEmailVerified(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setEmailVerified(false);
      setEmailVerificationKey('');
      smittenAlertFromError(error, 'OTP verification failed', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const createAccount = async () => {
    if (creatingRef.current) return;
    if (!name.trim()) {
      smittenAlert({ title: 'Name needed', message: 'Enter your full name.', tone: 'warning' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      smittenAlert({ title: 'Email needed', message: 'Enter a valid email address.', tone: 'warning' });
      return;
    }
    if (!emailVerified || !emailVerificationKey) {
      smittenAlert({ title: 'Verify your email', message: 'Send and verify the email OTP before continuing.', tone: 'warning' });
      return;
    }
    if (!phoneNumber.trim()) {
      smittenAlert({ title: 'Phone number needed', message: 'Enter your phone number.', tone: 'warning' });
      return;
    }
    if (password.length < 8) {
      smittenAlert({ title: 'Password too short', message: 'Use at least 8 characters.', tone: 'warning' });
      return;
    }

    creatingRef.current = true;
    setCreating(true);
    let navigationStarted = false;
    try {
      const response = await authApi.register({
        name: name.trim(),
        email: normalizedEmail,
        emailVerificationKey,
        phoneNumber: phoneNumber.trim(),
        password,
      });
      await persistAuthSession(response);
      setSession(response.user, true);

      if (avatarUri) {
        try {
          const avatarResponse = await uploadAvatar(avatarUri);
          setSession(avatarResponse.user, true);
        } catch (error) {
          smittenAlertFromError(error, 'Account created, but the photo could not upload', 'warning');
        }
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/auth/connect');
      navigationStarted = true;
    } catch (error) {
      smittenAlertFromError(error, 'Registration failed', 'error');
    } finally {
      if (!navigationStarted) {
        creatingRef.current = false;
        setCreating(false);
      }
    }
  };

  return (
    <WhiteAuthShell title="Create your account" subtitle="Start with your details, then choose how to connect.">
      <TouchableOpacity onPress={() => void pickAvatar()} activeOpacity={0.85} style={styles.avatarButton}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <Ionicons name="person-outline" size={43} color="#bd9ca7" />
        )}
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={17} color="#fff" />
        </View>
      </TouchableOpacity>
      <Text style={styles.photoHint}>Add profile photo</Text>

      <Input icon="person-outline" value={name} onChangeText={setName} placeholder="Full name" />

      <View style={whiteAuthStyles.inputRow}>
        <Ionicons name="mail-outline" size={19} color="#c1aeb5" />
        <TextInput
          value={email}
          onChangeText={onEmailChange}
          placeholder="Email address"
          placeholderTextColor="#c1aeb5"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!emailVerified}
          style={whiteAuthStyles.input}
        />
        {emailVerified ? (
          <Ionicons name="checkmark-circle" size={22} color="#2e9b62" />
        ) : (
          <TouchableOpacity onPress={() => void requestOtp()} disabled={sendingOtp} hitSlop={6}>
            <Text style={styles.inlineAction}>{sendingOtp ? 'Sending…' : 'Send OTP'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!emailVerified ? (
        <View style={styles.otpRow}>
          <TextInput
            value={emailCode}
            onChangeText={(value) => setEmailCode(value.replace(/\D/g, ''))}
            placeholder="6-digit email OTP"
            placeholderTextColor="#c1aeb5"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.otpInput}
          />
          <TouchableOpacity onPress={() => void verifyOtp()} disabled={verifyingOtp} style={styles.verifyButton}>
            {verifyingOtp ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.verifyText}>Verify</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.verifiedText}>Email verified</Text>
      )}

      <Input icon="call-outline" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone number" keyboardType="phone-pad" />

      <View style={whiteAuthStyles.inputRow}>
        <Ionicons name="lock-closed-outline" size={19} color="#c1aeb5" />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (minimum 8 characters)"
          placeholderTextColor="#c1aeb5"
          secureTextEntry={!passwordVisible}
          style={whiteAuthStyles.input}
        />
        <TouchableOpacity onPress={() => setPasswordVisible((visible) => !visible)} hitSlop={8}>
          <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#b89fa8" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => void createAccount()}
        disabled={creating}
        activeOpacity={0.88}
        style={[whiteAuthStyles.button, creating && styles.disabled]}
      >
        <WhiteAuthButtonContent label="Create account" loading={creating} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login')} style={styles.loginLink}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={whiteAuthStyles.link}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </WhiteAuthShell>
  );
}

type InputProps = React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap };

function Input({ icon, style, ...props }: InputProps) {
  return (
    <View style={whiteAuthStyles.inputRow}>
      <Ionicons name={icon} size={19} color="#c1aeb5" />
      <TextInput placeholderTextColor="#c1aeb5" style={[whiteAuthStyles.input, style]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbe9e5',
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 7,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 46 },
  cameraBadge: {
    position: 'absolute',
    right: -1,
    bottom: 2,
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UnMeColors.m7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoHint: {
    marginBottom: 22,
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
  inlineAction: { color: UnMeColors.m7, fontFamily: 'Inter_700Bold', fontSize: 12 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  otpInput: {
    minHeight: 52,
    flex: 1,
    borderWidth: 1,
    borderColor: '#ecd4d9',
    borderRadius: 16,
    backgroundColor: '#fff7f8',
    paddingHorizontal: 16,
    color: UnMeColors.txDark,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    letterSpacing: 2,
  },
  verifyButton: { ...smittenGlassButton, minWidth: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  verifyText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  verifiedText: { color: '#2e9b62', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: -5, marginBottom: 12 },
  loginLink: { alignItems: 'center', paddingVertical: 20 },
  loginText: { color: UnMeColors.txMuted, fontFamily: 'Inter_400Regular', fontSize: 14 },
  disabled: { opacity: 0.65 },
});
