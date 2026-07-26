import { FlipRevealIntro } from '@/src/components/launch/SmittenLaunchAnimations';
import { smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AccountDeletedScreen() {
  const router = useRouter();
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const started = useRef(false);
  const [deleted, setDeleted] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void deleteAccount()
      .then(() => setDeleted(true))
      .catch((error) => {
        setFailed(true);
        smittenAlertFromError(error, 'Could not delete account', 'error');
      });
  }, [deleteAccount]);

  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => router.replace('/login'), 3600);
    return () => clearTimeout(timer);
  }, [deleted, router]);

  if (deleted) return <FlipRevealIntro />;

  return (
    <View style={styles.screen}>
      {failed ? (
        <>
          <Text style={styles.title}>Deletion wasn’t completed</Text>
          <Text style={styles.copy}>Your account is still available. Please check your connection and try again.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)/profile')}>
            <Text style={styles.buttonText}>Return to Profile</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#c9102e" />
          <Text style={styles.copy}>Deleting your account securely…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#fff7f8' },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 25, color: '#250716', textAlign: 'center' },
  copy: { marginTop: 15, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, color: '#9b6b75', textAlign: 'center' },
  button: { ...smittenGlassButton, marginTop: 24, minHeight: 52, paddingHorizontal: 24, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
});
