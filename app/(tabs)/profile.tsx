import AsyncStorage from '@react-native-async-storage/async-storage';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DISAPPEARING_MESSAGE_OPTIONS, formatDisappearingLabel } from '@/constants/disappearingMessages';
import { SmittenColors } from '@/constants/smittenTheme';
import { PinSetupModal } from '@/src/components/ui/PinSetupModal';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { useHomeStats } from '@/src/hooks/useHomeStats';
import { useRefreshSessionOnFocus } from '@/src/hooks/useRefreshSessionOnFocus';
import { authApi, uploadAvatar } from '@/src/services/api';
import { appIconService, type AppIconType } from '@/src/services/appIcon';
import { chatApi } from '@/src/services/chatApi';
import { notesApi } from '@/src/services/notesApi';
import { notificationsApi, type NotificationSettings } from '@/src/services/notificationsApi';
import { registerPushTokenWithBackend } from '@/src/services/pushNotifications';
import { vaultApi } from '@/src/services/vaultApi';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { getPartnerChatLabel, useAuthStore } from '@/src/store/useAuthStore';
import { useTheme } from '../../context/ThemeContext';

type Page = 'main' | 'account' | 'notifications' | 'privacy' | 'subscription' | 'help';
type TimerTarget = 'chat' | 'vault';
type Plan = 'monthly' | 'quarterly' | 'yearly';

const CRIMSON = SmittenColors.accentBrand;
const INK = '#250716';
const MUTED = '#9b8791';
const BLUSH = '#fff6f7';
const BORDER = '#eddde2';
const HELP_WHATSAPP_NUMBER = '919880512345';
const HELP_ISSUES = [
  { title: 'Login or account access', message: 'Hi Smittenz Support, I need help logging in or accessing my account.' },
  { title: 'Connect or manage partner', message: 'Hi Smittenz Support, I need help connecting or managing my partner account.' },
  { title: 'Subscription or payment', message: 'Hi Smittenz Support, I need help with a subscription or payment issue.' },
  { title: 'Chat or notifications', message: 'Hi Smittenz Support, I need help with chats or app notifications.' },
  { title: 'Memories, Vault or privacy', message: 'Hi Smittenz Support, I need help with Memories, Vault, or a privacy setting.' },
] as const;
const EMPTY_NOTIFICATIONS: NotificationSettings = {
  enabled: true,
  chat: true,
  buzz: true,
  memories: true,
  diary: true,
  games: true,
  registered: false,
};

const notificationRows: { key: keyof Pick<NotificationSettings, 'chat' | 'buzz' | 'memories' | 'diary' | 'games'>; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'chat', title: 'Chat', subtitle: 'New messages from your partner', icon: 'chatbubble-outline' },
  { key: 'buzz', title: 'Buzz', subtitle: 'Little nudges and love pings', icon: 'flash-outline' },
  { key: 'memories', title: 'Memories & Vault', subtitle: 'Shared memories, dates and vault items', icon: 'images-outline' },
  { key: 'diary', title: 'Shared diary', subtitle: 'New pages shared with you', icon: 'book-outline' },
  { key: 'games', title: 'Couple Games', subtitle: 'Invites, turns and results', icon: 'game-controller-outline' },
];

function daysTogether(date?: string | null) {
  if (!date) return 0;
  const start = new Date(date).getTime();
  return Number.isFinite(start) ? Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1) : 0;
}

function Header({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.headerButton} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={25} color={INK} />
        </TouchableOpacity>
      ) : <View style={styles.headerButton} />}
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerButton} />
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return <Text style={[styles.sectionTitle, danger && { color: '#c64e55' }]}>{children}</Text>;
}

function MenuRow({ icon, title, subtitle, onPress, last, danger, right }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} activeOpacity={0.72} style={[styles.menuRow, !last && styles.rowBorder]}>
      <View style={[styles.menuIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={19} color={danger ? '#c64e55' : CRIMSON} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, danger && { color: '#c64e55' }]}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#c9b8bf" /> : null)}
    </TouchableOpacity>
  );
}

function ProfileMenuRow({ icon, title, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.76}
      style={styles.profileMenuRow}
    >
      <Ionicons name={icon} size={17} color="#a995a0" />
      <Text style={styles.profileMenuText}>{title}</Text>
      <Ionicons name="chevron-forward" size={17} color="#cdbfc5" />
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = 'sentences' }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#baa9b0"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.field}
      />
    </View>
  );
}

function PrimaryButton({ title, onPress, loading, disabled, danger, icon }: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.84} style={[styles.primaryButton, danger && styles.deleteButton, (disabled || loading) && { opacity: 0.5 }]}>
      {loading ? <ActivityIndicator color="#fff" /> : (
        <View style={styles.inline}>
          {icon ? <Ionicons name={icon} size={20} color="#fff" /> : null}
          <Text style={styles.primaryButtonText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ToggleRow({ icon, title, subtitle, value, onChange, last }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  return <MenuRow icon={icon} title={title} subtitle={subtitle} last={last} right={<Switch value={value} onValueChange={onChange} trackColor={{ false: '#e8dde1', true: '#e3607c' }} thumbColor="#fff" />} />;
}

export default function ProfileScreen() {
  useRefreshSessionOnFocus();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { signOut } = useTheme();
  const apiUser = useAuthStore((s) => s.apiUser);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const updateUser = useAuthStore((s) => s.updateUser);
  const chatTimer = useAuthStore((s) => s.chatDisappearingAfterMs);
  const setChatTimer = useAuthStore((s) => s.setChatDisappearingAfterMs);
  const { memoryCount } = useHomeStats();

  const lockEnabled = useAppLockStore((s) => s.enabled);
  const lockHasPin = useAppLockStore((s) => s.hasPin);
  const setLockEnabled = useAppLockStore((s) => s.setEnabled);
  const savePin = useAppLockStore((s) => s.savePin);

  const [page, setPage] = useState<Page>('main');
  const [diaryCount, setDiaryCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [helpText, setHelpText] = useState('');
  const [helpIssuesExpanded, setHelpIssuesExpanded] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [nickname, setNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notificationSettings, setNotificationSettings] = useState(EMPTY_NOTIFICATIONS);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [vaultTimer, setVaultTimer] = useState<number | null>(null);
  const [timerTarget, setTimerTarget] = useState<TimerTarget>('chat');
  const [customVisible, setCustomVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState('1');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [camouflage, setCamouflage] = useState(false);
  const [appIcon, setAppIcon] = useState<AppIconType>('default');
  const [plan, setPlan] = useState<Plan>('monthly');

  useFocusEffect(useCallback(() => {
    setPage('main');
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, []));

  useEffect(() => {
    if (Platform.OS !== 'android' || page === 'main') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      openPage('main');
      return true;
    });
    return () => subscription.remove();
  }, [page]);

  useEffect(() => {
    setName(apiUser?.name ?? '');
    setEmail(apiUser?.email ?? '');
    setPhone(apiUser?.phoneNumber ?? '');
    setCity(apiUser?.city ?? '');
    setNickname(apiUser?.nicknameSelf ?? '');
    setVaultTimer(apiUser?.vaultDisappearingAfterMs ?? 30_000);
  }, [apiUser]);

  useEffect(() => {
    const currentPlan = apiUser?.subscriptionPlan ?? apiUser?.coupleSubscriptionPlan;
    if (currentPlan) setPlan(currentPlan);
  }, [apiUser?.coupleSubscriptionPlan, apiUser?.subscriptionPlan]);

  useEffect(() => {
    void notesApi.list().then((result) => setDiaryCount(result.notes.length)).catch(() => {});
    void notificationsApi.getSettings().then(setNotificationSettings).catch(() => {});
    void Promise.all([AsyncStorage.getItem('@camouflage_enabled'), AsyncStorage.getItem('@camouflage_icon')]).then(([enabled, icon]) => {
      setCamouflage(enabled === 'true');
      if (icon === 'calculator' || icon === 'clock') setAppIcon(icon);
    }).catch(() => {});
  }, [apiUser?.id]);

  const partnerName = user ? getPartnerChatLabel(user) : apiUser?.partner?.name ?? 'Partner';
  const together = daysTogether(apiUser?.partnerKnownSince ?? apiUser?.coupleCreatedAt);
  const allNotifications = notificationRows.every(({ key }) => notificationSettings[key]);
  const bottomPadding = 88 + Math.max(insets.bottom, 12);

  const openPage = (next: Page) => {
    Haptics.selectionAsync();
    setPage(next);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    useAppLockStore.getState().setSystemOverlayActive(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      const uri = result.canceled ? null : result.assets[0]?.uri;
      if (!uri) return;
      setAvatarBusy(true);
      updateUser({ avatarSelf: uri });
      const response = await uploadAvatar(uri);
      setSession(response.user);
    } catch (error) {
      smittenAlertFromError(error, 'Photo upload failed', 'error');
    } finally {
      setAvatarBusy(false);
      useAppLockStore.getState().setSystemOverlayActive(false);
    }
  };

  const saveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      smittenAlert({ title: 'Missing details', message: 'Name and email are required.', tone: 'warning' });
      return;
    }
    setBusy(true);
    try {
      const response = await authApi.updateProfile({
        name: name.trim(), email: email.trim(), phoneNumber: phone.trim() || null,
        city: city.trim() || null, nicknameSelf: nickname.trim(),
      });
      setSession(response.user);
      smittenAlert({ title: 'Profile updated', message: 'Your account details have been saved.', tone: 'success' });
    } catch (error) {
      smittenAlertFromError(error, 'Could not save profile', 'error');
    } finally { setBusy(false); }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      smittenAlert({ title: 'Password too short', message: 'Use at least 8 characters.', tone: 'warning' });
      return;
    }
    if (newPassword !== confirmPassword) {
      smittenAlert({ title: 'Passwords do not match', message: 'Re-enter the same new password.', tone: 'warning' });
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      smittenAlert({ title: 'Password changed', message: 'Use your new password the next time you log in.', tone: 'success' });
    } catch (error) { smittenAlertFromError(error, 'Could not change password', 'error'); }
    finally { setBusy(false); }
  };

  const saveNotifications = async (patch: Partial<NotificationSettings>) => {
    const previous = notificationSettings;
    const next = { ...notificationSettings, ...patch };
    setNotificationSettings(next);
    setNotificationsLoading(true);
    try {
      const updated = await notificationsApi.updateSettings({
        enabled: next.enabled, chat: next.chat, buzz: next.buzz,
        memories: next.memories, diary: next.diary, games: next.games,
      });
      setNotificationSettings(updated);
      if (updated.enabled) await registerPushTokenWithBackend();
    } catch (error) {
      setNotificationSettings(previous);
      smittenAlertFromError(error, 'Could not update notifications', 'error');
    } finally { setNotificationsLoading(false); }
  };

  const saveTimer = async (target: TimerTarget, value: number | null) => {
    setBusy(true);
    try {
      if (target === 'chat') {
        const response = await chatApi.updateSettings({ chatDisappearingAfterMs: value });
        setSession(response.user);
        setChatTimer(response.user.chatDisappearingAfterMs);
      } else {
        await vaultApi.updateSettings({ vaultDisappearingAfterMs: value });
        const response = await authApi.me();
        setSession(response.user);
        setVaultTimer(response.user.vaultDisappearingAfterMs);
      }
    } catch (error) { smittenAlertFromError(error, 'Could not update timer', 'error'); }
    finally { setBusy(false); }
  };

  const saveCustomTimer = () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const multiplier = customUnit === 'minutes' ? 60_000 : customUnit === 'hours' ? 3_600_000 : 86_400_000;
    setCustomVisible(false);
    void saveTimer(timerTarget, Math.round(amount * multiplier));
  };

  const changeCamouflage = async (next: boolean) => {
    setCamouflage(next);
    await AsyncStorage.setItem('@camouflage_enabled', String(next));
    if (!next && appIcon !== 'default') await applyAppIcon('default');
  };

  const applyAppIcon = async (icon: AppIconType) => {
    try {
      await appIconService.changeIcon(icon);
      await AsyncStorage.setItem('@camouflage_icon', icon);
      setAppIcon(icon);
      if (Platform.OS === 'android') setTimeout(() => BackHandler.exitApp(), 500);
    } catch (error) { smittenAlertFromError(error, 'Could not change app icon', 'error'); }
  };

  const openHelp = async (presetMessage?: string) => {
    const message = presetMessage || helpText.trim() || 'Hi Smittenz Support, I need help with my account.';
    try { await Linking.openURL(`https://wa.me/${HELP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`); }
    catch { smittenAlert({ title: 'Could not open WhatsApp', message: 'Please try again after installing WhatsApp.', tone: 'error' }); }
  };

  const doLogout = async () => {
    setBusy(true);
    try { await signOut(); } finally { setBusy(false); setLogoutVisible(false); }
  };

  const doDelete = async () => {
    if (deleteText !== 'DELETE') return;
    setDeleteVisible(false);
    router.replace('/account-deleted');
  };

  const renderMain = () => (
    <>
      <Header title="Profile" />
      <View style={styles.profileHero}>
        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
          <UserAvatar uri={user?.avatarSelf ?? ''} size={92} borderColor="#fff" />
          <View style={styles.avatarEdit}><Ionicons name="pencil" size={13} color="#fff" /></View>
          {avatarBusy ? <View style={styles.avatarLoading}><ActivityIndicator color="#fff" /></View> : null}
        </TouchableOpacity>
        <Text style={styles.coupleName}>{apiUser?.name ?? 'You'} & {partnerName}</Text>
        <Text style={styles.memberLine}>Smittenz since {new Date(apiUser?.memberSince ?? Date.now()).getFullYear()}</Text>
        <View style={styles.statsRow}>
          {[[memoryCount, 'Memories'], [together, 'Days'], [diaryCount, 'Diary entries']].map(([value, label]) => (
            <View key={String(label)} style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
          ))}
        </View>
      </View>
      <View style={styles.profileMenu}>
        <ProfileMenuRow icon="person-outline" title="Account settings" onPress={() => openPage('account')} />
        <ProfileMenuRow icon="notifications-outline" title="Notifications" onPress={() => openPage('notifications')} />
        <ProfileMenuRow icon="lock-closed-outline" title="Privacy & Vault" onPress={() => openPage('privacy')} />
        <ProfileMenuRow icon="diamond-outline" title="Subscription — Plus" onPress={() => openPage('subscription')} />
        <ProfileMenuRow icon="heart-outline" title="Help & Support" onPress={() => openPage('help')} />
      </View>
      <Text style={styles.version}>Smittenz v1.0</Text>
    </>
  );

  const renderAccount = () => (
    <>
      <Header title="Account settings" subtitle="Your details and account access" onBack={() => openPage('main')} />
      <SectionTitle>Edit profile</SectionTitle>
      <Card style={styles.formCard}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
        <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone number" />
        <Field label="City" value={city} onChangeText={setCity} placeholder="Your city" />
        <Field label="Nickname" value={nickname} onChangeText={setNickname} placeholder="What your partner calls you" />
        <PrimaryButton title="Save profile" onPress={saveProfile} loading={busy} />
      </Card>
      <SectionTitle>Change password</SectionTitle>
      <Card style={styles.formCard}>
        <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />
        <Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" />
        <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
        <PrimaryButton title="Change password" onPress={changePassword} loading={busy} disabled={!currentPassword || !newPassword || !confirmPassword} />
      </Card>
      <SectionTitle>Linked account</SectionTitle>
      <Card><MenuRow icon="people-outline" title={`Linked partner — ${partnerName}`} subtitle="Your shared Smittenz space" last /></Card>
      <SectionTitle danger>Danger zone</SectionTitle>
      <Card>
        <MenuRow icon="log-out-outline" title="Log out" onPress={() => setLogoutVisible(true)} danger />
        <MenuRow icon="trash-outline" title="Delete account" subtitle="Permanently remove your account and shared data" onPress={() => { setDeleteText(''); setDeleteVisible(true); }} danger last />
      </Card>
    </>
  );

  const renderNotifications = () => (
    <>
      <Header title="Notifications" subtitle="Only hear about what matters" onBack={() => openPage('main')} />
      <Card>
        <ToggleRow icon="checkmark-circle-outline" title="Select all" subtitle="Receive every Smittenz notification" value={allNotifications && notificationSettings.enabled} onChange={(value) => void saveNotifications({ enabled: value, chat: value, buzz: value, memories: value, diary: value, games: value })} last />
      </Card>
      <SectionTitle>Notification types</SectionTitle>
      <Card>
        {notificationRows.map((row, index) => <ToggleRow key={row.key} icon={row.icon} title={row.title} subtitle={row.subtitle} value={notificationSettings.enabled && notificationSettings[row.key]} onChange={(value) => void saveNotifications({ enabled: true, [row.key]: value })} last={index === notificationRows.length - 1} />)}
      </Card>
      {notificationsLoading ? <ActivityIndicator style={{ marginTop: 18 }} color={CRIMSON} /> : null}
      <Text style={styles.note}>You can change these choices anytime. Essential account and security notices may still appear.</Text>
    </>
  );

  const TimerCard = ({ target, value }: { target: TimerTarget; value: number | null }) => (
    <Card style={styles.timerCard}>
      <View style={styles.timerHeading}>
        <View style={styles.menuIcon}><Ionicons name={target === 'chat' ? 'chatbubble-ellipses-outline' : 'eye-off-outline'} size={19} color={CRIMSON} /></View>
        <View style={{ flex: 1 }}><Text style={styles.menuTitle}>{target === 'chat' ? 'Chat messages' : 'Vault shares'}</Text><Text style={styles.menuSubtitle}>Currently {formatDisappearingLabel(value)}</Text></View>
      </View>
      <View style={styles.pillWrap}>
        {(target === 'vault'
          ? DISAPPEARING_MESSAGE_OPTIONS.filter((option) => option.ttlMs !== null)
          : DISAPPEARING_MESSAGE_OPTIONS
        ).slice(0, 4).map((option) => {
          const selected = value === option.ttlMs;
          return <TouchableOpacity key={option.id} onPress={() => void saveTimer(target, option.ttlMs)} style={[styles.timerPill, selected && styles.timerPillActive]}><Text style={[styles.timerPillText, selected && styles.timerPillTextActive]}>{option.label}</Text></TouchableOpacity>;
        })}
        <TouchableOpacity onPress={() => { setTimerTarget(target); setCustomVisible(true); }} style={[styles.timerPill, !DISAPPEARING_MESSAGE_OPTIONS.some((o) => o.ttlMs === value) && value !== null && styles.timerPillActive]}><Text style={[styles.timerPillText, !DISAPPEARING_MESSAGE_OPTIONS.some((o) => o.ttlMs === value) && value !== null && styles.timerPillTextActive]}>Custom</Text></TouchableOpacity>
      </View>
    </Card>
  );

  const renderPrivacy = () => (
    <>
      <Header title="Privacy & Vault" subtitle="Private by design, controlled by you" onBack={() => openPage('main')} />
      <SectionTitle>Disappearing content</SectionTitle>
      <TimerCard target="chat" value={chatTimer} />
      <TimerCard target="vault" value={vaultTimer} />
      <SectionTitle>App security</SectionTitle>
      <Card>
        <ToggleRow icon="lock-closed-outline" title="App lock" subtitle={lockEnabled ? 'PIN required when Smittenz opens' : 'Protect Smittenz with a PIN'} value={lockEnabled} onChange={(value) => { if (value && !lockHasPin) setPinVisible(true); else void setLockEnabled(value); }} />
        <ToggleRow icon="eye-off-outline" title="Camouflage" subtitle="Disguise the app icon on this device" value={camouflage} onChange={(value) => void changeCamouflage(value)} last />
      </Card>
      {camouflage ? (
        <Card style={styles.iconChooser}>
          <Text style={styles.fieldLabel}>Choose app appearance</Text>
          <View style={styles.planTabs}>
            {(['default', 'calculator', 'clock'] as AppIconType[]).map((icon) => <TouchableOpacity key={icon} onPress={() => void applyAppIcon(icon)} style={[styles.planTab, appIcon === icon && styles.planTabActive]}><Ionicons name={icon === 'default' ? 'heart' : icon === 'calculator' ? 'calculator' : 'time'} size={18} color={appIcon === icon ? '#fff' : MUTED} /><Text style={[styles.planTabText, appIcon === icon && { color: '#fff' }]}>{icon === 'default' ? 'Smittenz' : icon[0].toUpperCase() + icon.slice(1)}</Text></TouchableOpacity>)}
          </View>
        </Card>
      ) : null}
      <SectionTitle>Encryption</SectionTitle>
      <Card><MenuRow icon="shield-checkmark-outline" title="End-to-end encrypted" subtitle="Chats and private content are encrypted so your shared space stays yours." last /></Card>
    </>
  );

  const plans = {
    monthly: { price: '99', suffix: '/month', note: 'Billed every month', discount: null },
    quarterly: { price: '199', suffix: '/quarter', note: 'Billed every 3 months', discount: 33 },
    yearly: { price: '599', suffix: '/year', note: 'Billed once a year', discount: 50 },
  } as const;

  const currentPlan = apiUser?.subscriptionPlan ?? apiUser?.coupleSubscriptionPlan ?? null;
  const currentPlanExpiry = apiUser?.subscriptionExpiresAt ?? apiUser?.coupleSubscriptionExpiresAt ?? null;
  const includedWithPartnerPlan = Boolean(apiUser?.coupleHasActiveSubscription && !apiUser?.isCoupleOwner && currentPlan);

  const renderSubscription = () => (
    <>
      <Header title="Subscription" onBack={() => openPage('main')} />
      <View style={styles.plusHero}>
        <View style={styles.plusIcon}><Ionicons name="diamond-outline" size={28} color={CRIMSON} /></View>
        <Text style={styles.plusTitle}>Smittenz Plus</Text>
        <Text style={styles.plusSubtitle}>Unlimited memories, a bigger Vault, and an ad-free space for the two of you.</Text>
      </View>
      {apiUser?.coupleHasActiveSubscription && currentPlan ? (
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanIcon}><Ionicons name="checkmark" size={18} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentPlanLabel}>{includedWithPartnerPlan ? 'Current shared plan' : 'Current plan'}</Text>
            <Text style={styles.currentPlanName}>{currentPlan[0].toUpperCase() + currentPlan.slice(1)} · Active</Text>
            {includedWithPartnerPlan ? <Text style={styles.currentPlanOwner}>Included with {apiUser?.partner?.name ?? partnerName}&apos;s plan</Text> : null}
            {currentPlanExpiry ? <Text style={styles.currentPlanExpiry}>Active until {new Date(currentPlanExpiry).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text> : null}
          </View>
        </View>
      ) : (
        <View style={styles.noPlanCard}>
          <Text style={styles.currentPlanLabel}>Current plan</Text>
          <Text style={styles.noPlanText}>No active subscription</Text>
        </View>
      )}
      <View style={styles.planTabs}>
        {(['monthly', 'quarterly', 'yearly'] as Plan[]).map((id) => <TouchableOpacity key={id} onPress={() => setPlan(id)} style={[styles.planTab, plan === id && styles.planTabActive]}><Text style={[styles.planTabText, plan === id && { color: '#fff' }]}>{id[0].toUpperCase() + id.slice(1)}</Text></TouchableOpacity>)}
      </View>
      <View style={{ gap: 12 }}>
        {(['monthly', 'quarterly', 'yearly'] as Plan[]).map((id) => {
          const selected = plan === id;
          return <TouchableOpacity key={id} onPress={() => setPlan(id)} activeOpacity={0.82} style={[styles.priceCard, selected && styles.priceCardActive]}>
            {plans[id].discount ? <Text style={styles.discountBadge}>{plans[id].discount}% OFF</Text> : null}
            <View><Text style={styles.priceName}>{id[0].toUpperCase() + id.slice(1)}</Text><Text style={styles.priceNote}>{plans[id].note}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={styles.price}>{plans[id].price}</Text><Text style={styles.priceNote}>{plans[id].suffix}</Text></View>
          </TouchableOpacity>;
        })}
      </View>
      <Card style={styles.benefits}>
        {['Unlimited memory storage', 'Expanded, extra-secure Vault', 'No ads, ever', 'All Couple Games, unlocked'].map((benefit) => <View key={benefit} style={styles.benefitRow}><Ionicons name="checkmark" size={18} color="#4caf78" /><Text style={styles.benefitText}>{benefit}</Text></View>)}
      </Card>
      <PrimaryButton
        title={includedWithPartnerPlan
          ? `Included with ${apiUser?.partner?.name ?? partnerName}'s plan`
          : apiUser?.coupleHasActiveSubscription
            ? 'View or renew your plan'
            : `Start Smittenz Plus — ${plans[plan].price}${plans[plan].suffix}`}
        icon={includedWithPartnerPlan ? 'checkmark-circle' : 'heart'}
        disabled={includedWithPartnerPlan}
        onPress={() => router.push({ pathname: '/auth/payment', params: { plan } })}
      />
      <Text style={styles.note}>Cancel anytime. Renews automatically.</Text>
    </>
  );

  const renderHelp = () => (
    <>
      <Header title="Help & Support" subtitle="We’re here when you need us" onBack={() => openPage('main')} />
      <Card>
        <MenuRow icon="document-text-outline" title="Privacy policy" subtitle="How we handle your account and private data" onPress={() => router.push('/privacy-policy')} />
        <MenuRow
          icon="help-circle-outline"
          title="Help centre"
          subtitle="Choose an issue to chat with support"
          onPress={() => setHelpIssuesExpanded((expanded) => !expanded)}
          right={<Ionicons name={helpIssuesExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#c9b8bf" />}
          last={!helpIssuesExpanded}
        />
        {helpIssuesExpanded ? (
          <View style={styles.helpIssues}>
            {HELP_ISSUES.map((issue, index) => (
              <TouchableOpacity
                key={issue.title}
                activeOpacity={0.72}
                onPress={() => void openHelp(issue.message)}
                style={[styles.helpIssueRow, index > 0 && styles.helpIssueBorder]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={17} color={CRIMSON} />
                <Text style={styles.helpIssueText}>{issue.title}</Text>
                <Ionicons name="logo-whatsapp" size={18} color="#25a765" />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </Card>
      <SectionTitle>Tell us what happened</SectionTitle>
      <Card style={styles.formCard}>
        <TextInput value={helpText} onChangeText={setHelpText} multiline placeholder="Describe your question or issue…" placeholderTextColor="#baa9b0" textAlignVertical="top" style={[styles.field, styles.helpInput]} />
        <PrimaryButton title="Open help centre" icon="chatbubble-ellipses-outline" onPress={() => void openHelp()} />
      </Card>
      <Card style={styles.supportNote}><Ionicons name="heart-outline" size={22} color={CRIMSON} /><Text style={styles.supportText}>For account safety, support will never ask for your password or Vault PIN.</Text></Card>
    </>
  );

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 6, paddingHorizontal: 20, paddingBottom: bottomPadding }}>
        {page === 'main' ? renderMain() : page === 'account' ? renderAccount() : page === 'notifications' ? renderNotifications() : page === 'privacy' ? renderPrivacy() : page === 'subscription' ? renderSubscription() : renderHelp()}
      </ScrollView>

      <PinSetupModal visible={pinVisible} onDismiss={() => setPinVisible(false)} onComplete={(pin) => { void savePin(pin); setPinVisible(false); }} />

      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setLogoutVisible(false)}>
          <Pressable style={styles.confirmSheet} onPress={() => {}}>
            <View style={styles.confirmIcon}><Ionicons name="log-out-outline" size={26} color={INK} /></View>
            <Text style={styles.confirmTitle}>Log out?</Text>
            <Text style={styles.confirmCopy}>You’ll need to log back in to see your shared memories, chats and plans.</Text>
            <PrimaryButton title="Log out" onPress={() => void doLogout()} loading={busy} />
            <TouchableOpacity onPress={() => setLogoutVisible(false)} style={styles.cancelLink}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setDeleteVisible(false)}>
          <Pressable style={styles.confirmSheet} onPress={() => {}}>
            <View style={[styles.confirmIcon, { backgroundColor: '#ffe3e3' }]}><Ionicons name="trash-outline" size={26} color="#c64e55" /></View>
            <Text style={styles.confirmTitle}>Delete your account?</Text>
            <Text style={styles.confirmCopy}>This permanently deletes all memories, chats and shared data for both partners. This can’t be undone.</Text>
            <TextInput value={deleteText} onChangeText={setDeleteText} autoCapitalize="characters" placeholder="Type DELETE to confirm" placeholderTextColor="#baa9b0" style={styles.field} />
            <PrimaryButton title="Delete Account" onPress={() => void doDelete()} loading={busy} disabled={deleteText !== 'DELETE'} danger />
            <TouchableOpacity onPress={() => setDeleteVisible(false)} style={styles.cancelLink}><Text style={styles.cancelText}>Cancel, keep my account</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={customVisible} transparent animationType="fade" onRequestClose={() => setCustomVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setCustomVisible(false)}>
          <Pressable style={styles.customSheet} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Custom timer</Text>
            <Text style={styles.confirmCopy}>Choose how long new {timerTarget === 'chat' ? 'messages' : 'vault shares'} remain available.</Text>
            <TextInput value={customAmount} onChangeText={setCustomAmount} keyboardType="number-pad" style={styles.field} />
            <View style={styles.planTabs}>{(['minutes', 'hours', 'days'] as const).map((unit) => <TouchableOpacity key={unit} onPress={() => setCustomUnit(unit)} style={[styles.planTab, customUnit === unit && styles.planTabActive]}><Text style={[styles.planTabText, customUnit === unit && { color: '#fff' }]}>{unit}</Text></TouchableOpacity>)}</View>
            <PrimaryButton title="Save timer" onPress={saveCustomTimer} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fffafb' },
  header: { minHeight: 82, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, lineHeight: 38, color: INK, textAlign: 'center' },
  headerSubtitle: { marginTop: 2, fontFamily: 'Inter_400Regular', fontSize: 13, color: MUTED, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 23, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#6c2038', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.055, shadowRadius: 13, elevation: 2, marginBottom: 18 },
  profileHero: { alignItems: 'center', marginBottom: 22 },
  avatarWrap: { width: 98, height: 98, alignItems: 'center', justifyContent: 'center', borderRadius: 49, backgroundColor: '#fff', shadowColor: CRIMSON, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
  avatarEdit: { position: 'absolute', right: 2, bottom: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: CRIMSON, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0005', borderRadius: 49, alignItems: 'center', justifyContent: 'center' },
  coupleName: { marginTop: 13, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 23, color: INK, textAlign: 'center' },
  memberLine: { marginTop: 3, fontFamily: 'Inter_400Regular', fontSize: 12, color: CRIMSON },
  statsRow: { flexDirection: 'row', width: '100%', gap: 9, marginTop: 21 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f2e5e8', borderRadius: 18 },
  statValue: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 19, color: INK },
  statLabel: { marginTop: 3, fontFamily: 'Inter_400Regular', fontSize: 10, color: MUTED, textAlign: 'center' },
  profileMenu: { gap: 10, marginBottom: 18 },
  profileMenuRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 17, borderRadius: 22, borderWidth: 1, borderColor: '#f5edf0', backgroundColor: '#fff', shadowColor: '#5d2639', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.055, shadowRadius: 11, elevation: 2 },
  profileMenuText: { flex: 1, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: INK },
  menuRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 11, gap: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  menuIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#fdebef', alignItems: 'center', justifyContent: 'center' },
  dangerIcon: { backgroundColor: '#fff0ef' },
  menuTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: INK },
  menuSubtitle: { marginTop: 3, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, color: MUTED },
  sectionTitle: { marginTop: 8, marginBottom: 9, marginLeft: 4, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED },
  formCard: { padding: 16, overflow: 'visible' },
  fieldWrap: { marginBottom: 13 },
  fieldLabel: { marginBottom: 7, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.25, textTransform: 'uppercase', color: MUTED },
  field: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: BLUSH, paddingHorizontal: 16, fontFamily: 'Inter_400Regular', fontSize: 15, color: INK },
  primaryButton: { ...smittenGlassButton, minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 },
  deleteButton: { backgroundColor: '#c95555' },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff', textAlign: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  note: { marginHorizontal: 12, marginTop: 5, marginBottom: 20, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: MUTED, textAlign: 'center' },
  timerCard: { padding: 15 },
  timerHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerPill: { minHeight: 37, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 19, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  timerPillActive: { backgroundColor: CRIMSON, borderColor: CRIMSON },
  timerPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: MUTED },
  timerPillTextActive: { color: '#fff' },
  iconChooser: { padding: 15 },
  planTabs: { flexDirection: 'row', gap: 7, padding: 5, borderRadius: 18, backgroundColor: '#faeff1', marginBottom: 17 },
  planTab: { flex: 1, minHeight: 40, paddingHorizontal: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  planTabActive: { backgroundColor: '#e3607c' },
  planTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: MUTED, textTransform: 'capitalize' },
  plusHero: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 },
  plusIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#fbdde3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  plusTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: INK },
  plusSubtitle: { marginTop: 7, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: MUTED, textAlign: 'center' },
  currentPlanCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, marginBottom: 17, borderRadius: 20, borderWidth: 1, borderColor: '#bfe6ce', backgroundColor: '#effaf3' },
  currentPlanIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4caf78' },
  currentPlanLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED },
  currentPlanName: { marginTop: 3, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17, color: INK },
  currentPlanOwner: { marginTop: 3, fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#4f7d62' },
  currentPlanExpiry: { marginTop: 3, fontFamily: 'Inter_400Regular', fontSize: 11, color: '#648572' },
  noPlanCard: { padding: 16, marginBottom: 17, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  noPlanText: { marginTop: 4, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: INK },
  priceCard: { minHeight: 82, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'visible' },
  priceCardActive: { borderColor: '#e3607c', backgroundColor: '#fff0f3' },
  discountBadge: { position: 'absolute', top: -9, right: 12, backgroundColor: '#e3607c', color: '#fff', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontFamily: 'Inter_700Bold', fontSize: 8 },
  priceName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17, color: INK },
  price: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17, color: INK },
  priceNote: { marginTop: 4, fontFamily: 'Inter_400Regular', fontSize: 10, color: MUTED },
  benefits: { padding: 17, marginTop: 20 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 7 },
  benefitText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: INK },
  helpInput: { height: 130, paddingTop: 15, marginBottom: 13 },
  helpIssues: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, paddingLeft: 58 },
  helpIssueRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 15 },
  helpIssueBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  helpIssueText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12, color: INK },
  supportNote: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 17, backgroundColor: '#fff7f8' },
  supportText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: MUTED },
  version: { marginVertical: 6, textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 11, color: '#c6b7bd' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#18081099' },
  confirmSheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 34, alignItems: 'stretch' },
  customSheet: { backgroundColor: '#fff', borderRadius: 26, padding: 22, margin: 20, alignSelf: 'stretch' },
  confirmIcon: { width: 54, height: 54, borderRadius: 27, alignSelf: 'center', backgroundColor: '#faeceb', alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { marginTop: 13, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 23, color: INK, textAlign: 'center' },
  confirmCopy: { marginVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: MUTED, textAlign: 'center' },
  cancelLink: { alignItems: 'center', paddingVertical: 15 },
  cancelText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#d64b70' },
});
