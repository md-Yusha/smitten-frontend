import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SmittenColors } from '@/constants/smittenTheme';
import { formatApiError } from '@/src/services/formatApiError';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';

export type SmittenAlertTone = 'error' | 'warning' | 'info' | 'success';

export type SmittenAlertButton = {
  text: string;
  onPress?: () => void;
  primary?: boolean;
};

export type SmittenAlertOptions = {
  title: string;
  message: string;
  tone?: SmittenAlertTone;
  buttons?: SmittenAlertButton[];
  onDismiss?: () => void;
};

type AlertState = SmittenAlertOptions & { visible: boolean };

const defaultButtons: SmittenAlertButton[] = [{ text: 'OK', primary: true }];

const toneMeta: Record<
  SmittenAlertTone,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  error: { icon: 'close-circle', color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  warning: { icon: 'warning', color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  info: { icon: 'information-circle', color: SmittenColors.accent, bg: `${SmittenColors.accent}18` },
  success: { icon: 'checkmark-circle', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

type ShowFn = (options: SmittenAlertOptions) => void;

let externalShow: ShowFn | null = null;

/** Imperative alert — works anywhere after SmittenAlertProvider mounts. */
export function smittenAlert(options: SmittenAlertOptions): void {
  if (externalShow) {
    externalShow(options);
    return;
  }
  console.warn('[Smittenz] smittenAlert before provider:', options.title, options.message);
}

export function smittenAlertFromError(error: unknown, title: string, tone: SmittenAlertTone = 'error'): void {
  smittenAlert({ title, message: formatApiError(error), tone });
}

/** Drop-in replacement for Alert.alert(title, message?, buttons?). */
export function confirmDeleteItem(label: string, onDelete: () => void): void {
  smittenAlert({
    title: 'Delete this?',
    message: label,
    tone: 'warning',
    buttons: [
      { text: 'Cancel' },
      { text: 'Delete', primary: true, onPress: onDelete },
    ],
  });
}

export function showItemActions(opts: {
  canEdit: boolean;
  onEdit?: () => void;
  onDelete: () => void;
}): void {
  const buttons: SmittenAlertButton[] = [{ text: 'Cancel' }];
  if (opts.canEdit && opts.onEdit) {
    buttons.push({ text: 'Edit', onPress: opts.onEdit });
  }
  buttons.push({ text: 'Delete', primary: true, onPress: opts.onDelete });
  smittenAlert({
    title: 'Options',
    message: 'What would you like to do?',
    tone: 'info',
    buttons,
  });
}

export function showSmittenAlert(
  title: string,
  message?: string,
  buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }[],
): void {
  const mapped: SmittenAlertButton[] =
    buttons?.map((b) => ({
      text: b.text,
      onPress: b.onPress,
      primary: b.style !== 'cancel',
    })) ?? defaultButtons;

  smittenAlert({
    title,
    message: message ?? '',
    tone: 'info',
    buttons: mapped.length ? mapped : defaultButtons,
  });
}

const AlertContext = createContext<ShowFn | null>(null);

export function useSmittenAlert(): ShowFn {
  const ctx = useContext(AlertContext);
  return ctx ?? smittenAlert;
}

export function SmittenAlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState | null>(null);
  const onCloseRef = useRef<(() => void) | null>(null);

  const show = useCallback((options: SmittenAlertOptions) => {
    const tone = options.tone ?? 'info';
    if (tone === 'error' || tone === 'warning') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setState({
      ...options,
      tone: options.tone ?? 'info',
      buttons: options.buttons?.length ? options.buttons : defaultButtons,
      visible: true,
    });
  }, []);

  useEffect(() => {
    externalShow = show;
    return () => {
      externalShow = null;
    };
  }, [show]);

  const hide = useCallback(() => {
    setState((s) => (s ? { ...s, visible: false } : null));
    setTimeout(() => setState(null), 220);
  }, []);

  const dismiss = useCallback(() => {
    state?.onDismiss?.();
    hide();
  }, [hide, state]);

  const onPressButton = useCallback(
    (btn: SmittenAlertButton) => {
      hide();
      onCloseRef.current = () => btn.onPress?.();
      setTimeout(() => {
        onCloseRef.current?.();
        onCloseRef.current = null;
      }, 240);
    },
    [hide],
  );

  if (!state) {
    return <AlertContext.Provider value={show}>{children}</AlertContext.Provider>;
  }

  const tone = state.tone ?? 'info';
  const meta = toneMeta[tone];
  const buttons = state.buttons ?? defaultButtons;

  return (
    <AlertContext.Provider value={show}>
      {children}
      <Modal visible={state.visible} transparent animationType="fade" onRequestClose={dismiss}>
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={36} color={meta.color} />
            </View>
            <Text className="text-center font-serif text-2xl text-ink">{state.title}</Text>
            <Text className="mt-3 text-center font-sans text-[15px] leading-[22px] text-muted">
              {state.message}
            </Text>
            <View className="mt-6 w-full gap-2">
              {buttons.map((btn, i) => {
                const primary = btn.primary ?? i === buttons.length - 1;
                return (
                  <TouchableOpacity
                    key={`${btn.text}-${i}`}
                    activeOpacity={0.88}
                    onPress={() => onPressButton(btn)}
                    className="items-center justify-center rounded-full py-3.5 px-6"
                    style={primary ? [smittenGlassButton, styles.primaryBtn] : styles.secondaryBtn}
                  >
                    <Text
                      className={`font-sans-bold text-[16px] ${primary ? 'text-white' : 'text-ink'}`}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  } as ViewStyle,
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    minHeight: 50,
  },
  secondaryBtn: {
    backgroundColor: '#FDF2F0',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.1)',
  },
});
