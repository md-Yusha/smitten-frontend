import { INDIAN_CITIES } from '@/constants/indianCities';
import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteAuthButtonContent, WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { useAuthNavigation } from '@/src/hooks/useAuthNavigation';
import { authApi, type ApiGender } from '@/src/services/api';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const IDENTITIES: { value: ApiGender; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'female', label: 'Female', icon: 'female' },
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'other', label: 'Other', icon: 'person' },
];

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function parseDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  return date.toISOString().slice(0, 10) === `${match[3]}-${match[2]}-${match[1]}` ? date : null;
}

export default function StoryScreen() {
  const apiUser = useAuthStore((state) => state.apiUser);
  const params = useLocalSearchParams<{ newPartner?: string }>();
  const isNewPartnerStory = params.newPartner === 'true';
  const setSession = useAuthStore((state) => state.setSession);
  const navigateForUser = useAuthNavigation();
  const [dateOfBirth, setDateOfBirth] = useState(() => {
    const value = apiUser?.dateOfBirth?.slice(0, 10);
    return value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '';
  });
  const [partnerKnownSince, setPartnerKnownSince] = useState(() => {
    const value = apiUser?.partnerKnownSince?.slice(0, 10);
    return value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '';
  });
  const [city, setCity] = useState(apiUser?.city ?? '');
  const [citySuggestionsVisible, setCitySuggestionsVisible] = useState(false);
  const [gender, setGender] = useState<ApiGender | null>(apiUser?.profileSetupComplete ? apiUser.gender : null);
  const [genderIdentity, setGenderIdentity] = useState(apiUser?.genderIdentity ?? '');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const cityMatches = useMemo(() => {
    const query = city.trim().toLowerCase();
    if (!query) return [];
    return INDIAN_CITIES.filter((item) => item.toLowerCase().includes(query)).slice(0, 6);
  }, [city]);

  if (!apiUser) return <Redirect href="/login" />;
  if (!apiUser.coupleId && !apiUser.isCoupleOwner) return <Redirect href="/auth/connect" />;

  const saveStory = async () => {
    if (savingRef.current) return;
    const birthDate = parseDate(dateOfBirth);
    const relationshipDate = parseDate(partnerKnownSince);
    if (!birthDate) {
      smittenAlert({ title: 'Date of birth needed', message: 'Use dd/mm/yyyy format.', tone: 'warning' });
      return;
    }
    if (!relationshipDate) {
      smittenAlert({ title: 'Partner date needed', message: 'Enter the date you knew your partner using dd/mm/yyyy.', tone: 'warning' });
      return;
    }
    if (relationshipDate <= birthDate) {
      smittenAlert({ title: 'Check your dates', message: 'The date you knew your partner must be after your date of birth.', tone: 'warning' });
      return;
    }
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    if (today.getUTCMonth() < birthDate.getUTCMonth() || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate())) age -= 1;
    if (age < 16) {
      smittenAlert({ title: 'Age requirement', message: 'You must be at least 16 years old to use Smittenz.', tone: 'warning' });
      return;
    }
    if (!city.trim()) {
      smittenAlert({ title: 'City needed', message: 'Enter your city.', tone: 'warning' });
      return;
    }
    if (!gender) {
      smittenAlert({ title: 'How do you identify?', message: 'Select Female, Male, or Other.', tone: 'warning' });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    let navigationStarted = false;
    try {
      const response = await authApi.completeStory({
        city: city.trim(),
        dateOfBirth: birthDate.toISOString(),
        partnerKnownSince: relationshipDate.toISOString(),
        gender,
        genderIdentity: gender === 'other' ? genderIdentity.trim() || undefined : undefined,
      });
      setSession(response.user, true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigateForUser(response.user);
      navigationStarted = true;
    } catch (error) {
      smittenAlertFromError(error, 'Could not save your story', 'error');
    } finally {
      if (!navigationStarted) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  };

  return (
    <WhiteAuthShell
      title={isNewPartnerStory ? 'Set up your new partner story' : 'Tell us your story'}
      subtitle={isNewPartnerStory ? 'Choose the date you first knew your new partner.' : 'Just a little more, so we can make this space yours.'}
      showBack={false}
    >
      {apiUser.dateOfBirth ? (
        <View style={styles.savedDate}>
          <Ionicons name="checkmark-circle" size={19} color="#2e9b62" />
          <Text style={styles.savedDateText}>Date of birth saved</Text>
        </View>
      ) : (
        <Input
          icon="calendar-outline"
          value={dateOfBirth}
          onChangeText={(value) => setDateOfBirth(formatDateInput(value))}
          placeholder="Date of birth · dd/mm/yyyy"
          keyboardType="number-pad"
          maxLength={10}
        />
      )}

      <Input
        icon="heart-outline"
        value={partnerKnownSince}
        onChangeText={(value) => setPartnerKnownSince(formatDateInput(value))}
        placeholder={`${isNewPartnerStory ? 'Date you knew your new partner' : 'Date you knew your partner'} · dd/mm/yyyy`}
        keyboardType="number-pad"
        maxLength={10}
      />

      <Input
        icon="location-outline"
        value={city}
        onChangeText={(value) => {
          setCity(value);
          setCitySuggestionsVisible(true);
        }}
        onFocus={() => setCitySuggestionsVisible(true)}
        placeholder="City"
      />
      {citySuggestionsVisible && cityMatches.length ? (
        <View style={styles.cityList}>
          {cityMatches.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => {
                setCity(item);
                setCitySuggestionsVisible(false);
              }}
              style={styles.cityItem}
            >
              <Text style={styles.cityText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>How do you identify?</Text>
      <View style={styles.identityRow}>
        {IDENTITIES.map((identity) => {
          const selected = gender === identity.value;
          return (
            <TouchableOpacity
              key={identity.value}
              onPress={() => {
                setGender(identity.value);
                if (identity.value !== 'other') setGenderIdentity('');
              }}
              style={[styles.identity, selected && styles.identitySelected]}
            >
              <Ionicons name={identity.icon} size={22} color={selected ? UnMeColors.m7 : '#a9939d'} />
              <Text style={[styles.identityText, selected && styles.identityTextSelected]}>{identity.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {gender === 'other' ? (
        <Input icon="sparkles-outline" value={genderIdentity} onChangeText={setGenderIdentity} placeholder="Identity (optional)" />
      ) : null}

      <TouchableOpacity
        onPress={() => void saveStory()}
        disabled={saving}
        activeOpacity={0.88}
        style={[whiteAuthStyles.button, saving && styles.disabled]}
      >
        <WhiteAuthButtonContent label="Continue to dashboard" loading={saving} />
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
  savedDate: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#d7eadf', borderRadius: 16, backgroundColor: '#f3fbf5' },
  savedDateText: { color: '#2e9b62', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  cityList: { marginTop: -6, marginBottom: 14, borderWidth: 1, borderColor: '#ecd4d9', borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
  cityItem: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ead8dd' },
  cityText: { color: UnMeColors.txDark, fontFamily: 'Inter_500Medium', fontSize: 14 },
  sectionLabel: { marginTop: 8, marginBottom: 12, color: UnMeColors.txDark, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  identityRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  identity: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#ead8dd', borderRadius: 16, backgroundColor: '#fff' },
  identitySelected: { borderColor: UnMeColors.m7, backgroundColor: '#fff1f4' },
  identityText: { color: '#8c7881', fontFamily: 'Inter_500Medium', fontSize: 12 },
  identityTextSelected: { color: UnMeColors.m7, fontFamily: 'Inter_700Bold' },
  disabled: { opacity: 0.65 },
});
