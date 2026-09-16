import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WhiteAuthShell, whiteAuthStyles } from '@/src/components/auth/WhiteAuthShell';
import { TYPOGRAPHY_COLORS } from '@/src/utils/typography';

/**
 * Welcome Screen
 * Shows different messages based on whether user is account creator or partner
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const apiUser = useAuthStore((state) => state.apiUser);
  const user = useAuthStore((state) => state.user);

  // Determine if this user is the account creator (couple owner)
  const isAccountCreator = apiUser?.isCoupleOwner === true;
  const partnerName = user?.partnerName || 'your partner';
  const welcomeName = apiUser?.name || user?.name || 'there';

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <WhiteAuthShell
      title={isAccountCreator ? 'Ready to share' : 'Welcome!'}
      subtitle={
        isAccountCreator
          ? "Your account is set up. Share your couple key when you're ready."
          : `Hi ${welcomeName}, your account is now ready to use`
      }
      showBack={false}
    >
      <View style={styles.illustration}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={isAccountCreator ? 'share-social-outline' : 'checkmark-circle-outline'}
            size={48}
            color={TYPOGRAPHY_COLORS.brandRed}
          />
        </View>
      </View>

      <View style={styles.messageCard}>
        {isAccountCreator ? (
          <>
            <Text style={styles.messageTitle}>Invite your partner</Text>
            <Text style={styles.messageText}>
              Share your couple key with your partner so they can join Smittenz and connect with you.
            </Text>
            <Text style={styles.messageSubtext}>
              You can find your couple key in your Profile settings anytime.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.messageTitle}>Connected!</Text>
            <Text style={styles.messageText}>
              You&apos;re now connected with {partnerName}. Start sharing memories, chatting, and growing closer together.
            </Text>
            <Text style={styles.messageSubtext}>
              Your shared space is ready to explore.
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={handleContinue}
        activeOpacity={0.88}
        style={whiteAuthStyles.button}
      >
        <Text style={whiteAuthStyles.buttonText}>
          {isAccountCreator ? 'Go to Profile' : 'Start exploring'}
        </Text>
      </TouchableOpacity>

      {isAccountCreator && (
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.88}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </WhiteAuthShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(188, 20, 43, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#f0e1e5',
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TYPOGRAPHY_COLORS.text,
    marginBottom: 12,
    fontFamily: 'Inter_700Bold',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '400',
    color: TYPOGRAPHY_COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
  },
  messageSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: TYPOGRAPHY_COLORS.gray,
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ead8dd',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: TYPOGRAPHY_COLORS.brandRed,
    fontFamily: 'Inter_700Bold',
  },
});
