import { UnMeColors } from '@/constants/smittenTheme';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  backFallback?: Href;
  headerAccessory?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function WhiteAuthShell({
  title,
  subtitle,
  children,
  showBack = true,
  onBack,
  backFallback = '/login',
  headerAccessory,
  contentStyle,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const focusScrollTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const scrollFocusedInputIntoView = React.useCallback(() => {
    for (const timer of focusScrollTimers.current) clearTimeout(timer);
    focusScrollTimers.current = [80, 260].map((delay) => setTimeout(() => {
      const nodeHandle = TextInput.State.currentlyFocusedField();
      if (nodeHandle == null) return;
      scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(nodeHandle, 28, true);
    }, delay));
  }, []);

  React.useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const subscription = Keyboard.addListener(event, scrollFocusedInputIntoView);
    return () => {
      subscription.remove();
      for (const timer of focusScrollTimers.current) clearTimeout(timer);
    };
  }, [scrollFocusedInputIntoView]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(backFallback);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 24) + 18 },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          onFocus={scrollFocusedInputIntoView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.topRow}>
            {showBack ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={handleBack}
                style={styles.backButton}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={24} color={UnMeColors.txDark} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}
          </View>

          {headerAccessory ? <View style={styles.accessory}>{headerAccessory}</View> : null}

          <View style={[styles.heading, headerAccessory ? styles.centeredHeading : null]}>
            <Text style={[styles.title, headerAccessory ? styles.centeredText : null]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, headerAccessory ? styles.centeredText : null]}>{subtitle}</Text>
            ) : null}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const whiteAuthStyles = StyleSheet.create({
  inputRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ecd4d9',
    borderRadius: 16,
    backgroundColor: '#fbefef',
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: UnMeColors.txDark,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  button: {
    ...smittenGlassButton,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  link: {
    color: UnMeColors.m7,
    fontFamily: 'Inter_600SemiBold',
  },
});

export function WhiteAuthButtonContent({ label, loading = false }: { label: string; loading?: boolean }) {
  return (
    <View style={styles.buttonContent}>
      <Text style={whiteAuthStyles.buttonText}>{label}</Text>
      {loading ? <ActivityIndicator color="#fff" size="small" style={styles.buttonSpinner} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#fff' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 28,
  },
  topRow: {
    minHeight: 54,
    justifyContent: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  accessory: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  heading: {
    marginTop: 12,
    marginBottom: 28,
  },
  centeredHeading: {
    marginTop: 0,
    alignItems: 'center',
  },
  title: {
    color: UnMeColors.txDark,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    marginTop: 5,
    color: UnMeColors.txMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  centeredText: { textAlign: 'center' },
  buttonContent: {
    width: '100%',
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  buttonSpinner: {
    position: 'absolute',
    right: 18,
  },
});
