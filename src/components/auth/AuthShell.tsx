import { UnMeColors } from '@/constants/smittenTheme';
import { UnMeLinearGradient } from '@/src/components/ui/UnMeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
};

export function AuthShell({ title, subtitle, children, showBack = true }: AuthShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/login');
  };

  return (
    <View className="flex-1 bg-white">
      <View style={[styles.heroBand, { paddingTop: insets.top + 12 }]}>
        <UnMeLinearGradient variant="screenHeader" style={StyleSheet.absoluteFill} />
        <UnMeLinearGradient variant="welcomeHeroFade" style={StyleSheet.absoluteFill} />
        
        {/* Top Header Row for back button */}
        <View style={styles.headerRow}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backBtn}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backSpacer} />
          )}
        </View>

        {/* Title and Subtitle at the bottom of the band */}
        <View style={styles.titleContainer}>
          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  softShadow: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputShadow: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ctaShadow: {},
});

const styles = StyleSheet.create({
  heroBand: {
    minHeight: 190,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    zIndex: 3,
  },
  backSpacer: {
    height: 44,
  },
  titleContainer: {
    marginTop: 12,
    zIndex: 2,
  },
  heroTitle: {
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 36,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.78)',
  },
  scrollBody: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 36,
    backgroundColor: UnMeColors.white,
  },
});
