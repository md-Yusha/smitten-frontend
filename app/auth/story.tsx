import { INDIAN_CITIES } from '@/constants/indianCities';
import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { useAuthNavigation } from '@/src/hooks/useAuthNavigation';
import { authApi, type ApiGender } from '@/src/services/api';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const IDENTITIES: { value: ApiGender; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'female', label: 'Female', icon: 'female' },
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'other', label: 'Other', icon: 'person' },
];

function validDate(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === trimmed;
}

export default function StoryScreen() {
  const apiUser = useAuthStore((state) => state.apiUser);
  const setSession = useAuthStore((state) => state.setSession);
  const navigateForUser = useAuthNavigation();
  const [dateOfBirth, setDateOfBirth] = useState(apiUser?.dateOfBirth?.slice(0, 10) ?? '');
  const [partnerKnownSince, setPartnerKnownSince] = useState(apiUser?.partnerKnownSince?.slice(0, 10) ?? '');
  const [city, setCity] = useState(apiUser?.city ?? '');
  const [citySuggestionsVisible, setCitySuggestionsVisible] = useState(false);
  const [gender, setGender] = useState<ApiGender | null>(apiUser?.profileSetupComplete ? apiUser.gender : null);
  const [genderIdentity, setGenderIdentity] = useState(apiUser?.genderIdentity ?? '');
  const [saving, setSaving] = useState(false);

  const cityMatches = useMemo(() => {
    const query = city.trim().toLowerCase();
    if (!query) return [];
    return INDIAN_CITIES.filter((item) => item.toLowerCase().includes(query)).slice(0, 6);
  }, [city]);

  if (!apiUser) return <Redirect href="/login" />;
  if (!apiUser.coupleId && !apiUser.isCoupleOwner) return <Redirect href="/auth/connect" />;

  const saveStory = async () => {
    if (!validDate(dateOfBirth)) {
      smittenAlert({ title: 'Date of birth needed', message: 'Use YYYY-MM-DD format.', tone: 'warning' });
      return;
    }
    if (!validDate(partnerKnownSince)) {
      smittenAlert({ title: 'Partner date needed', message: 'Enter when you first knew your partner using YYYY-MM-DD.', tone: 'warning' });
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

    setSaving(true);
    try {
      const response = await authApi.completeStory({
        city: city.trim(),
        dateOfBirth: `${dateOfBirth.trim()}T00:00:00.000Z`,
        partnerKnownSince: `${partnerKnownSince.trim()}T00:00:00.000Z`,
        gender,
        genderIdentity: gender === 'other' ? genderIdentity.trim() || undefined : undefined,
      });
      setSession(response.user, true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigateForUser(response.user);
    } catch (error) {
      smittenAlertFromError(error, 'Could not save your story', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WhiteAuthShell
      title="Tell us your story"
      subtitle="Just a little more, so we can make this space yours."
      showBack={false}
    >
      <Input
        icon="calendar-outline"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="Date of birth · YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      <Input
        icon="heart-outline"
        value={partnerKnownSince}
        onChangeText={setPartnerKnownSince}
        placeholder="Date you knew your partner"
        keyboardType="numbers-and-punctuation"
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
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={whiteAuthStyles.buttonText}>Continue to dashboard</Text>}
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
