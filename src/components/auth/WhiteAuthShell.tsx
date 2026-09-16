import { UnMeColors } from '@/constants/smittenTheme';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
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
  compact?: boolean;
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
  compact = false,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const focusScrollTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  const scrollFocusedInputIntoView = React.useCallback(() => {
    for (const timer of focusScrollTimers.current) clearTimeout(timer);
    focusScrollTimers.current = [80, 260].map((delay) => setTimeout(() => {
      const focusedInput = TextInput.State.currentlyFocusedInput();
      const nodeHandle = focusedInput
        ? findNodeHandle(
            focusedInput as unknown as Parameters<typeof findNodeHandle>[0],
          )
        : null;
      if (nodeHandle == null) return;
      scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(nodeHandle, 120, true);
    }, delay));
  }, []);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(Math.max(0, Math.round(event.endCoordinates.height)));
      scrollFocusedInputIntoView();
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
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
            compact && styles.compactContent,
            {
              paddingBottom:
                Math.max(insets.bottom, 24) + 18 +
                (Platform.OS === 'android' && keyboardVisible ? keyboardHeight : 0),
            },
            contentStyle,
            keyboardVisible && styles.keyboardContent,
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          onFocus={scrollFocusedInputIntoView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={[
              styles.topRow,
              compact && styles.compactTopRow,
              keyboardVisible && (showBack ? styles.keyboardTopRow : styles.keyboardTopRowHidden),
            ]}
          >
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
            ) : !keyboardVisible ? (
              <View style={styles.backButton} />
            ) : null}
          </View>

          {headerAccessory && !keyboardVisible ? <View style={styles.accessory}>{headerAccessory}</View> : null}

          <View
            style={[
              styles.heading,
              compact && styles.compactHeading,
              headerAccessory ? styles.centeredHeading : null,
              keyboardVisible && styles.keyboardHeading,
            ]}
          >
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
  compactInputRow: {
    minHeight: 48,
    marginBottom: 9,
    borderRadius: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: UnMeColors.txDark,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  compactInput: {
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    ...smittenGlassButton,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  compactButton: {
    minHeight: 48,
    borderRadius: 14,
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
  compactContent: {
    paddingHorizontal: 24,
  },
  topRow: {
    minHeight: 54,
    justifyContent: 'center',
  },
  compactTopRow: {
    minHeight: 42,
  },
  keyboardTopRow: { minHeight: 44 },
  keyboardTopRowHidden: { minHeight: 0, height: 0 },
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
  compactHeading: {
    marginTop: 2,
    marginBottom: 14,
  },
  keyboardContent: {
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  keyboardHeading: {
    marginTop: 0,
    marginBottom: 16,
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
