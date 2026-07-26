import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { authStyles } from './AuthShell';

type ProfileFieldsProps = {
  name: string;
  onNameChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  partnerPetName?: string;
  onPartnerPetNameChange?: (v: string) => void;
  showEmail?: boolean;
  showPassword?: boolean;
  showPartnerPetName?: boolean;
};

export function ProfileFields({
  name,
  onNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  partnerPetName = '',
  onPartnerPetNameChange,
  showEmail = true,
  showPassword = true,
  showPartnerPetName = true,
}: ProfileFieldsProps) {
  return (
    <>
      <View className="mb-5">
        <Text className="text-muted text-xs font-sans-semibold uppercase tracking-widest mb-2 ml-1">Your name</Text>
        <TextInput
          value={name}
          onChangeText={onNameChange}
          placeholder="Alex"
          placeholderTextColor="#9ca3af"
          className="rounded-[22px] border border-stone-200 bg-white px-5 py-4 font-sans text-ink text-lg"
          style={authStyles.inputShadow}
        />
      </View>

      {showEmail ? (
        <View className="mb-5">
          <Text className="text-muted text-xs font-sans-semibold uppercase tracking-widest mb-2 ml-1">Email</Text>
          <TextInput
            value={email}
            onChangeText={onEmailChange}
            placeholder="you@email.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            className="rounded-[22px] border border-stone-200 bg-white px-5 py-4 font-sans text-ink text-lg"
            style={authStyles.inputShadow}
          />
        </View>
      ) : null}

      {showPassword ? (
        <View className="mb-5">
          <Text className="text-muted text-xs font-sans-semibold uppercase tracking-widest mb-2 ml-1">Password</Text>
          <TextInput
            value={password}
            onChangeText={onPasswordChange}
            placeholder="At least 8 characters"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            className="rounded-[22px] border border-stone-200 bg-white px-5 py-4 font-sans text-ink text-lg"
            style={authStyles.inputShadow}
          />
        </View>
      ) : null}

      {showPartnerPetName && onPartnerPetNameChange ? (
        <View className="mb-5">
          <Text className="text-muted text-xs font-sans-semibold uppercase tracking-widest mb-2 ml-1">
            What you call your partner
          </Text>
          <TextInput
            value={partnerPetName}
            onChangeText={onPartnerPetNameChange}
            placeholder="e.g. Lovebug (not your own name)"
            placeholderTextColor="#9ca3af"
            className="rounded-[22px] border border-stone-200 bg-white px-5 py-4 font-sans text-ink text-lg"
            style={authStyles.inputShadow}
          />
          <Text className="text-muted text-xs font-sans mt-2 ml-1">This is your partner&apos;s nickname in chat — not your name.</Text>
        </View>
      ) : null}
    </>
  );
}

export function validateProfileFields(
  fields: { name: string; email: string; password: string; partnerPetName?: string },
  options?: { requireEmail?: boolean; requirePassword?: boolean; requirePartnerPetName?: boolean },
): string | null {
  if (!fields.name.trim()) return 'Your name is required.';
  if (options?.requireEmail !== false && !fields.email.trim()) return 'Email is required.';
  if (options?.requirePassword !== false && fields.password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (options?.requirePartnerPetName !== false && !fields.partnerPetName?.trim()) {
    return 'Partner pet name is required.';
  }
  return null;
}
