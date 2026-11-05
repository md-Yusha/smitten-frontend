import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteAuthButtonContent, WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { authApi, uploadAvatar } from '@/src/services/api';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { persistAuthSession } from '@/src/services/session';
import { getPendingInviteCode } from '@/src/services/pendingInvite';
import { useAuthStore } from '@/src/store/useAuthStore';
import { formatIndianPhoneInput, INDIA_PHONE_MAX_LENGTH, isCompleteIndianPhone } from '@/src/utils/phoneNumber';
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
  const [phoneNumber, setPhoneNumber] = useState(formatIndianPhoneInput(''));
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailVerificationKey, setEmailVerificationKey] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  const normalizedEmail = email.trim().toLowerCase();

  const validateDateFormat = (dateStr: string): boolean => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateStr)) return false;
    const [day, month, year] = dateStr.split('/').map(Number);
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const calculateAge = (dateStr: string): number => {
    const [day, month, year] = dateStr.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age--;
    }
    return age;
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    setEmailCode('');
    setEmailVerificationKey('');
    setEmailVerified(false);
  };

  const onDateOfBirthChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = cleaned.slice(0, 2);
      if (cleaned.length > 2) {
        formatted += '/' + cleaned.slice(2, 4);
      }
      if (cleaned.length > 4) {
        formatted += '/' + cleaned.slice(4, 8);
      }
    }
    setDateOfBirth(formatted);
  };

  const onPhoneNumberChange = (value: string) => {
    setPhoneNumber(formatIndianPhoneInput(value));
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
    if (!acceptedTerms) {
      smittenAlert({
        title: 'Agreement required',
        message: 'Please agree to the Terms & Conditions and Privacy Policy before continuing.',
        tone: 'warning',
      });
      return;
    }
    if (!name.trim()) {
      smittenAlert({ title: 'First name needed', message: 'Enter your first name.', tone: 'warning' });
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
    if (!isCompleteIndianPhone(phoneNumber)) {
      smittenAlert({ title: 'Phone number needed', message: 'Enter a 10-digit phone number.', tone: 'warning' });
      return;
    }
    if (!dateOfBirth.trim()) {
      smittenAlert({ title: 'Date of birth needed', message: 'Enter your date of birth in dd/mm/yyyy format.', tone: 'warning' });
      return;
    }
    if (!validateDateFormat(dateOfBirth)) {
      smittenAlert({ title: 'Invalid date format', message: 'Use dd/mm/yyyy format (e.g., 15/03/1990).', tone: 'warning' });
      return;
    }
    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      smittenAlert({ title: 'Age requirement', message: 'You must be at least 18 years old to use Smittenz.', tone: 'warning' });
      return;
    }
    const [birthDay, birthMonth, birthYear] = dateOfBirth.split('/').map(Number);
    const dateOfBirthIso = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay)).toISOString();
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
        dateOfBirth: dateOfBirthIso,
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
      const pendingInviteCode = await getPendingInviteCode();
      router.replace(pendingInviteCode ? { pathname: '/auth/have-key', params: { code: pendingInviteCode } } : '/auth/connect');
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
    <WhiteAuthShell title="Create your account" subtitle="Start with your details, then choose how to connect." compact>
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

      <Input icon="person-outline" value={name} onChangeText={setName} placeholder="Full Name" autoCapitalize="words" compact />

      <View style={[whiteAuthStyles.inputRow, whiteAuthStyles.compactInputRow]}>
        <Ionicons name="mail-outline" size={19} color="#c1aeb5" />
        <TextInput
          value={email}
          onChangeText={onEmailChange}
          placeholder="Email address"
          placeholderTextColor="#c1aeb5"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!emailVerified}
          style={[whiteAuthStyles.input, whiteAuthStyles.compactInput]}
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

      <Input
        icon="call-outline"
        value={phoneNumber}
        onChangeText={onPhoneNumberChange}
        placeholder="+91 Phone number"
        keyboardType="phone-pad"
        maxLength={INDIA_PHONE_MAX_LENGTH}
        compact
      />

      <Input icon="calendar-outline" value={dateOfBirth} onChangeText={onDateOfBirthChange} placeholder="Date of birth (dd/mm/yyyy)" keyboardType="number-pad" maxLength={10} compact />

      <View style={[whiteAuthStyles.inputRow, whiteAuthStyles.compactInputRow]}>
        <Ionicons name="lock-closed-outline" size={19} color="#c1aeb5" />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (minimum 8 characters)"
          placeholderTextColor="#c1aeb5"
          secureTextEntry={!passwordVisible}
          style={[whiteAuthStyles.input, whiteAuthStyles.compactInput]}
        />
        <TouchableOpacity onPress={() => setPasswordVisible((visible) => !visible)} hitSlop={8}>
          <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#b89fa8" />
        </TouchableOpacity>
      </View>

      <View style={styles.termsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAcceptedTerms((current) => !current)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          style={styles.termsCheckbox}
        >
          <Ionicons
            name={acceptedTerms ? 'checkbox' : 'square-outline'}
            size={24}
            color={acceptedTerms ? UnMeColors.m7 : '#bca9b2'}
          />
        </TouchableOpacity>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text
            style={styles.termsLink}
            onPress={() => router.push('/terms-and-conditions')}
            accessibilityRole="link"
          >
            Terms & Conditions
          </Text>
          {' '}and{' '}
          <Text
            style={styles.termsLink}
            onPress={() => router.push('/privacy-policy')}
            accessibilityRole="link"
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => void createAccount()}
        disabled={creating}
        activeOpacity={0.88}
        style={[whiteAuthStyles.button, whiteAuthStyles.compactButton, creating && styles.disabled]}
      >
        <WhiteAuthButtonContent label="Proceed" loading={creating} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login')} style={styles.loginLink}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={whiteAuthStyles.link}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </WhiteAuthShell>
  );
}

type InputProps = React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap; compact?: boolean };

function Input({ icon, style, compact, ...props }: InputProps) {
  return (
    <View style={[whiteAuthStyles.inputRow, compact && whiteAuthStyles.compactInputRow]}>
      <Ionicons name={icon} size={19} color="#c1aeb5" />
      <TextInput placeholderTextColor="#c1aeb5" style={[whiteAuthStyles.input, compact && whiteAuthStyles.compactInput, style]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f4',
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 5,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 33 },
  cameraBadge: {
    position: 'absolute',
    right: -1,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UnMeColors.m7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoHint: {
    marginBottom: 12,
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
  inlineAction: { color: UnMeColors.m7, fontFamily: 'Inter_700Bold', fontSize: 12 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 9 },
  otpInput: {
    minHeight: 48,
    flex: 1,
    borderWidth: 1,
    borderColor: '#ecd4d9',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    color: UnMeColors.txDark,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    letterSpacing: 2,
  },
  verifyButton: { ...smittenGlassButton, minWidth: 82, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  verifyText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  verifiedText: { color: '#2e9b62', fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: -4, marginBottom: 9 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 4, marginBottom: 14, paddingHorizontal: 2 },
  termsCheckbox: { paddingTop: 1 },
  termsText: { flex: 1, color: UnMeColors.txMuted, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  termsLink: { color: UnMeColors.m7, fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' },
  loginLink: { alignItems: 'center', paddingVertical: 12 },
  loginText: { color: UnMeColors.txMuted, fontFamily: 'Inter_400Regular', fontSize: 14 },
  disabled: { opacity: 0.65 },
});
