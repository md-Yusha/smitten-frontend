import { GamesModal } from '@/components/games/GamesModal';
import { BUZZ_OPTIONS } from '@/constants/buzzAssets';
import { getShellGradients } from '@/constants/genderTheme';
import { UnMeColors } from '@/constants/smittenTheme';
import { WhiteHomeDashboard } from '@/src/components/home/WhiteHomeDashboard';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { SpringPressCard } from '@/src/components/ui/SpringPressCard';
import { UnMeLinearGradient } from '@/src/components/ui/UnMeLinearGradient';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { useHomeStats } from '@/src/hooks/useHomeStats';
import { useRefreshSessionOnFocus } from '@/src/hooks/useRefreshSessionOnFocus';
import { authApi, uploadAvatar } from '@/src/services/api';
import { coupleApi } from '@/src/services/coupleApi';
import { getGameNoticeBaseline, hasSeenGameNotice, markSeenGameNotice } from '@/src/services/gameNotificationState';
import { gamesApi, type LoveChallenge } from '@/src/services/gamesApi';
import { consumeNotificationIntent } from '@/src/services/notificationIntent';
import { formatDaysLeft } from '@/src/services/specialMoments';
import { useCoupleLoveStore } from '@/src/store/coupleLoveStore';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { getDisplaySelfName, getPartnerChatLabel, useAuthStore } from '@/src/store/useAuthStore';
import {
    unreadBuzzNotificationCount,
    unreadChatNotificationCount,
    unreadDiaryNotificationCount,
    unreadGameNotificationCount,
    unreadMemoryNotificationCount,
    unreadNotificationCount,
    unreadVaultNotificationCount,
    useNotificationInboxStore
} from '@/src/store/useNotificationInboxStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Easing,
    Modal,
    Platform,
    Pressable,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

const MOOD_OPTIONS = ['Happy 😊', 'Loving ❤️', 'Sleepy 😴', 'Busy 💼', 'Sad 😢', 'Excited 🎉'];

const PING_THEMES: Record<string, { icon: string; color: string; library: 'Ionicons' | 'MaterialCommunityIcons'; image: any }> =
  Object.fromEntries(BUZZ_OPTIONS.map((option) => [option.id, option])) as Record<
    string,
    { icon: string; color: string; library: 'Ionicons' | 'MaterialCommunityIcons'; image: any }
  >;

type FloatingHeartProps = {
  left: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  imageSource: number;
  imageScale?: number;
};

const FloatingHeart = ({ left, size, duration, delay, color, imageSource, imageScale = 1 }: FloatingHeartProps) => {
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(0.5)).current;
  const translateX = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const sway = Math.random() * 80 - 40;
    RNAnimated.sequence([
      RNAnimated.delay(delay),
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
        RNAnimated.timing(translateY, {
          toValue: -Dimensions.get('window').height - 100,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.timing(translateX, {
          toValue: sway,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const fadeTimer = setTimeout(() => {
      RNAnimated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, duration + delay - 400);
    return () => clearTimeout(fadeTimer);
  }, [delay, duration, opacity, scale, translateX, translateY]);

  return (
    <RNAnimated.View
      style={{
        position: 'absolute',
        bottom: -50,
        left: `${left}%`,
        transform: [{ translateY }, { translateX }, { scale }],
        opacity,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      }}
    >
      <ExpoImage
        source={imageSource}
        style={{ width: size * imageScale, height: size * imageScale }}
        contentFit="contain"
      />
    </RNAnimated.View>
  );
};

export default function HomeScreen() {
  useRefreshSessionOnFocus();
  const insets = useSafeAreaInsets();
  const { user, apiUser } = useAuthStore();
  const fetchPendingLove = useCoupleLoveStore((s) => s.fetchPending);
  const router = useRouter();
  const { themeColor, userType } = useTheme();
  const [showLoveSent, setShowLoveSent] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<
    (FloatingHeartProps & { id: number })[]
  >([]);
  const mainHeartScale = useRef(new RNAnimated.Value(0)).current;
  const mainHeartOpacity = useRef(new RNAnimated.Value(0)).current;
  const [customMood, setCustomMood] = useState('');
  const [moodExpanded, setMoodExpanded] = useState(false);
  const [buzzModalVisible, setBuzzModalVisible] = useState(false);
  const [gamesModalVisible, setGamesModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selectedBuzzOption, setSelectedBuzzOption] = useState('love');
  const [sentBuzzKind, setSentBuzzKind] = useState('love');
  const [incomingInvite, setIncomingInvite] = useState<{ inviteId?: string; senderId: string; senderName: string; gameType: string } | null>(null);
  const [initialGameToOpen, setInitialGameToOpen] = useState<'none' | 'love-challenge' | 'tictactoe'>('none');
  const [pendingChallenge, setPendingChallenge] = useState<any | null>(null);
  // 'new' = partner got a new challenge to answer, 'answered' = creator sees partner's answer
  const [challengePopupMode, setChallengePopupMode] = useState<'new' | 'answered'>('new');
  // track IDs we've already shown popups for — prevents duplicates on reconnect/re-render
  const shownChallengeIds = useRef<Set<string>>(new Set());
  const homeScrollRef = useRef<ScrollView>(null);

  const inboxItems = useNotificationInboxStore((s) => s.items);
  const hydrateInbox = useNotificationInboxStore((s) => s.hydrate);
  const markAllNotificationsRead = useNotificationInboxStore((s) => s.markAllRead);
  const markCategoryRead = useNotificationInboxStore((s) => s.markCategoryRead);
  const unreadCount = unreadNotificationCount(inboxItems);
  const unreadChatCount = unreadChatNotificationCount(inboxItems);
  const unreadMemoryCount = unreadMemoryNotificationCount(inboxItems);
  const unreadDiaryCount = unreadDiaryNotificationCount(inboxItems);
  const unreadVaultCount = unreadVaultNotificationCount(inboxItems);
  const unreadGameCount = unreadGameNotificationCount(inboxItems);
  const unreadBuzzCount = unreadBuzzNotificationCount(inboxItems);

  useEffect(() => {
    void hydrateInbox();
  }, [hydrateInbox]);

  const surfaceChallenge = useCallback(
    (challenge: LoveChallenge, mode: 'new' | 'answered') => {
      const key = `${mode}-${challenge.id}`;
      if (shownChallengeIds.current.has(key)) return false;
      shownChallengeIds.current.add(key);
      if (apiUser?.id) void markSeenGameNotice(apiUser.id, key);
      setChallengePopupMode(mode);
      setPendingChallenge(challenge);
      return true;
    },
    [apiUser?.id],
  );

  const scanMissedChallenges = useCallback(
    async (opts?: { openGame?: boolean }) => {
      if (!apiUser?.coupleId || !apiUser.partner) return;
      try {
        const state = await gamesApi.getState();
        const baseline = await getGameNoticeBaseline(apiUser.id);
        const isOlderThanBaseline = (challenge: LoveChallenge) => {
          const createdAt = Date.parse(challenge.createdAt);
          const baselineAt = Date.parse(baseline);
          return Number.isFinite(createdAt) && Number.isFinite(baselineAt) && createdAt < baselineAt;
        };
        const challengeToAnswer = (
          await Promise.all(
            state.loveChallenges
              .filter((c) => c.creatorId !== apiUser.id && c.answeredIdx === null)
              .map(async (c) => ({
                challenge: c,
                seen:
                  (await hasSeenGameNotice(apiUser.id, `new-${c.id}`)) ||
                  isOlderThanBaseline(c),
              })),
          )
        ).find((item) => !item.seen)?.challenge;
        if (challengeToAnswer) {
          surfaceChallenge(challengeToAnswer, 'new');
          if (opts?.openGame) {
            setInitialGameToOpen('love-challenge');
            setGamesModalVisible(true);
          }
          return;
        }

        const answeredMine = (
          await Promise.all(
            state.loveChallenges
              .filter((c) => c.creatorId === apiUser.id && c.answeredIdx !== null)
              .map(async (c) => ({
                challenge: c,
                seen:
                  (await hasSeenGameNotice(apiUser.id, `answered-${c.id}`)) ||
                  isOlderThanBaseline(c),
              })),
          )
        ).find((item) => !item.seen)?.challenge;
        if (answeredMine) {
          surfaceChallenge(answeredMine, 'answered');
          if (opts?.openGame) {
            setInitialGameToOpen('love-challenge');
            setGamesModalVisible(true);
          }
        }
      } catch {
        /* offline or games unavailable */
      }
    },
    [apiUser?.coupleId, apiUser?.id, apiUser?.partner, surfaceChallenge],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      requestAnimationFrame(() => {
        homeScrollRef.current?.scrollTo({ y: 0, animated: false });
      });
      void (async () => {
        const intent = await consumeNotificationIntent();
        if (!active) return;
        if (apiUser?.coupleId) await fetchPendingLove();
        if (intent?.type === 'love_challenge') {
          await scanMissedChallenges({ openGame: true });
        } else if (intent?.type === 'love_ping') {
          await scanMissedChallenges();
        } else {
          await scanMissedChallenges();
        }
      })();
      return () => {
        active = false;
        setMoodExpanded(false);
        setBuzzModalVisible(false);
        setGamesModalVisible(false);
        setNotificationsVisible(false);
      };
    }, [apiUser?.coupleId, fetchPendingLove, scanMissedChallenges]),
  );

  useEffect(() => {
    if (apiUser?.mood && !MOOD_OPTIONS.includes(apiUser.mood)) {
      // Populate the field so user can see their existing custom mood
      setCustomMood(apiUser.mood);
    } else if (!apiUser?.mood || MOOD_OPTIONS.includes(apiUser.mood ?? '')) {
      // If standard mood selected or cleared, clear the custom field
      setCustomMood('');
    }
  }, [apiUser?.mood]);

  useEffect(() => {
    let active = true;
    let cleanups: (() => void)[] = [];

    if (apiUser?.coupleId) {
      const { ensureCoupleSocket, subscribeCoupleSocket } = require('@/src/services/coupleSocket');
      void ensureCoupleSocket(apiUser.coupleId).then(() => {
        if (!active) return;
        
        // Only the PARTNER (not the sender) receives the game invite popup + notification
        const unsubInvite = subscribeCoupleSocket('games:invite_received', (data: any) => {
          // If I am the one who sent the invite, ignore completely
          if (!data?.senderId || data.senderId === apiUser?.id) return;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const partnerName = user ? getPartnerChatLabel(user) : (apiUser.partner?.name || 'Partner');
          setIncomingInvite({
            inviteId: data.inviteId,
            senderId: data.senderId,
            senderName: partnerName,
            gameType: data.gameType,
          });
          useNotificationInboxStore.getState().add({
            id: `invite-${Date.now()}`,
            title: 'Game Invite',
            message: `${partnerName} invited you to play ${data.gameType === 'love-challenge' ? 'Love Challenge' : data.gameType}.`,
            createdAt: new Date().toISOString(),
            category: 'game',
          });
          const { showLocalMessageNotification } = require('@/src/services/pushNotifications');
          const gameLabel = data.gameType === 'love-challenge' ? 'Love Challenge' : data.gameType;
          void showLocalMessageNotification('Game Invite 🎮', `${partnerName} invited you to play ${gameLabel}!`);
        });

        const unsubDeclined = subscribeCoupleSocket('games:invite_declined', (data: any) => {
          if (!data?.senderId || data.senderId === apiUser?.id) return;
          smittenAlert({
            title: 'Invite Declined',
            message: `${user ? getPartnerChatLabel(user) : (apiUser.partner?.name || 'Partner')} is busy right now.`,
            tone: 'info',
          });
          useNotificationInboxStore.getState().add({
            id: `declined-${Date.now()}`,
            title: 'Invite Declined',
            message: `${user ? getPartnerChatLabel(user) : (apiUser.partner?.name || 'Partner')} is busy right now.`,
            createdAt: new Date().toISOString(),
            category: 'game',
          });
        });

        const unsubAccepted = subscribeCoupleSocket('games:invite_accepted', (data: any) => {
          if (!data?.senderId || data.senderId === apiUser?.id) return;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const gameType = data.gameType;
          useNotificationInboxStore.getState().add({
            id: `accepted-${Date.now()}`,
            title: 'Invite Accepted',
            message: `${user ? getPartnerChatLabel(user) : (apiUser.partner?.name || 'Partner')} accepted your game invite.`,
            createdAt: new Date().toISOString(),
            category: 'game',
          });
          setInitialGameToOpen(gameType === 'tictactoe' ? 'tictactoe' : 'love-challenge');
          setGamesModalVisible(true);
        });

        const unsubChallenge = subscribeCoupleSocket('games:challenge_updated', (data: any) => {
          if (!data?.id) return;
          const selfId = apiUser.id;
          const partnerName = user ? getPartnerChatLabel(user) : (apiUser.partner?.name || 'Partner');

          if (data.creatorId !== selfId && data.answeredIdx === null) {
            // New challenge created by partner — show popup to ME (the partner) ONCE
            if (surfaceChallenge(data, 'new')) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              useNotificationInboxStore.getState().add({
                id: `challenge-new-${data.id}`,
                title: 'New Love Challenge',
                message: `${partnerName} sent you a new challenge.`,
                createdAt: new Date().toISOString(),
                category: 'game',
              });
              const { showLocalMessageNotification } = require('@/src/services/pushNotifications');
              void showLocalMessageNotification('New Challenge 🎯', `${partnerName} sent you a new Love Challenge!`);
            }
          } else if (data.creatorId === selfId && data.answeredIdx !== null) {
            // Partner answered MY challenge — show popup + local notification (push sent by backend if offline)
            if (surfaceChallenge(data, 'answered')) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              useNotificationInboxStore.getState().add({
                id: `challenge-answered-${data.id}`,
                title: 'Challenge Answered',
                message:
                  data.answeredIdx === data.correctIdx
                    ? `${partnerName} answered your challenge correctly.`
                    : `${partnerName} answered your challenge.`,
                createdAt: new Date().toISOString(),
                category: 'game',
              });
              const { showLocalMessageNotification } = require('@/src/services/pushNotifications');
              const resultEmoji = data.answeredIdx === data.correctIdx ? '🎉' : '😅';
              void showLocalMessageNotification(
                `${partnerName} answered your quiz! ${resultEmoji}`,
                data.answeredIdx === data.correctIdx
                  ? 'They got it right! Open to see the result.'
                  : 'They got it wrong. Open to see the result.'
              );
            }
          }
        });

        cleanups.push(unsubInvite, unsubDeclined, unsubAccepted, unsubChallenge);
      });
    }

    return () => {
      active = false;
      cleanups.forEach((fn) => fn());
    };
  }, [apiUser?.coupleId, apiUser?.id, user, apiUser?.partner?.name, surfaceChallenge]);



  const handleUpdateMood = (newMood: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentUser = useAuthStore.getState().apiUser;
    if (currentUser) {
      useAuthStore.getState().setSession({
        ...currentUser,
        mood: newMood || null,
      });
    }
    setMoodExpanded(false);
    if (!newMood) setCustomMood('');

    void authApi.updateProfile({ mood: newMood }).catch((err) => {
      if (currentUser) {
        useAuthStore.getState().setSession(currentUser);
      }
      smittenAlertFromError(err, 'Failed to update mood');
    });
  };

  const declineIncomingInvite = useCallback(async () => {
    const invite = incomingInvite;
    if (!invite) return;
    setIncomingInvite(null);
    if (invite.gameType === 'tictactoe' && invite.inviteId) {
      await gamesApi.declineTicTacToeInvite(invite.inviteId).catch(() => {});
    }
  }, [incomingInvite]);

  const acceptIncomingInvite = useCallback(async () => {
    const invite = incomingInvite;
    if (!invite) return;
    setIncomingInvite(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (invite.gameType === 'tictactoe' && invite.inviteId) {
      try {
        await gamesApi.acceptTicTacToeInvite(invite.inviteId);
      } catch (e) {
        smittenAlertFromError(e, 'Tic Tac Toe', 'error');
        return;
      }
    }
    setInitialGameToOpen(invite.gameType === 'tictactoe' ? 'tictactoe' : 'love-challenge');
    setGamesModalVisible(true);
  }, [incomingInvite]);

  const pickAvatarFromHome = async () => {
    Haptics.selectionAsync();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    useAppLockStore.getState().setSystemOverlayActive(true);
    try {
      const mediaTypes: Array<'images'> = ['images'];
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        quality: 1,
        allowsMultipleSelection: false,
      });
      if (res.canceled || !res.assets[0]?.uri) return;

      const uri = res.assets[0].uri;
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().updateUser({ avatarSelf: uri });
      }
      setAvatarUploading(true);
      try {
        const { user: updated } = await uploadAvatar(uri);
        useAuthStore.getState().setSession(updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        smittenAlertFromError(e, 'Photo upload failed', 'error');
      } finally {
        setAvatarUploading(false);
      }
    } finally {
      useAppLockStore.getState().setSystemOverlayActive(false);
    }
  };

  const triggerSendLove = (buzzKind: string) => {
    if (!apiUser?.coupleId || !apiUser?.partner) {
      smittenAlert({
        title: 'Link your partner first',
        message: 'Send Buzz works once you are both connected.',
        tone: 'info',
      });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setSentBuzzKind(buzzKind);
    setShowLoveSent(true);
    void coupleApi.sendLove(buzzKind).catch((e) => {
      smittenAlertFromError(e, 'Send Buzz failed', 'error');
    });

    const theme = PING_THEMES[buzzKind] || PING_THEMES.love;
    const isProminentBuzz = ['anger', 'hug', 'please'].includes(buzzKind);
    const newHearts = Array.from({ length: 18 }, (_, index) => ({
      id: Date.now() + index,
      left: 10 + Math.random() * 80,
      size: Math.random() * (isProminentBuzz ? 30 : 22) + (isProminentBuzz ? 18 : 12),
      duration: Math.random() * 1500 + 1500,
      delay: Math.random() * 400,
      color: theme.color,
      imageSource: theme.image,
      imageScale: isProminentBuzz ? 1.7 : 1.2,
    }));
    setFloatingHearts(newHearts);
    mainHeartScale.setValue(0);
    mainHeartOpacity.setValue(0);

    RNAnimated.sequence([
      RNAnimated.parallel([
        RNAnimated.spring(mainHeartScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        RNAnimated.timing(mainHeartOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      RNAnimated.delay(1800),
      RNAnimated.parallel([
        RNAnimated.timing(mainHeartScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
        RNAnimated.timing(mainHeartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setShowLoveSent(false);
      setFloatingHearts([]);
      mainHeartScale.setValue(0);
      mainHeartOpacity.setValue(0);
    });
  };

  const partner = getPartnerChatLabel(user);
  const me = getDisplaySelfName(user);
  const selfAvatar = user?.avatarSelf || '';
  const { specialMoments } = useHomeStats();
  const shellGrad = getShellGradients(userType);
  const tabContentBottomPadding = (Platform.OS === 'ios' ? 72 : 62) + Math.max(insets.bottom, 12) + 18;

  return (
    <View className="flex-1 bg-cream">
      {false ? (
        <>
      <LinearGradient colors={[...shellGrad]} style={StyleSheet.absoluteFill} />

      <ScrollView
        ref={homeScrollRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: tabContentBottomPadding, paddingTop: 0 }}
      >
        {/* Top overscroll bounce background */}
        <View style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: '#0d0005' }} />

        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <UnMeLinearGradient variant="welcomeHero" style={StyleSheet.absoluteFill} />
          <UnMeLinearGradient variant="welcomeHeroFade" style={StyleSheet.absoluteFill} />
          <View style={styles.heroContent}>
            <View className="flex-1 pr-3" style={{ minWidth: 0 }}>
              <Text style={styles.heroEyebrow}>Home</Text>
              <Text
                style={styles.heroTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                <Text style={styles.heroEm}>{me}</Text> ❤️ {' '}
                <Text style={styles.heroEm}>{partner}</Text>
              </Text>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.notificationButton, { borderColor: `${themeColor}26` }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setNotificationsVisible(true);
                  markAllNotificationsRead();
                }}
              >
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadCount > 0 ? (
                  <View style={[styles.notificationBadge, { backgroundColor: UnMeColors.heroEmphasis }]}>
                    <Text style={styles.avatarBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              <SpringPressCard
                shrink={0.94}
                className="overflow-hidden rounded-full border-2 border-white bg-white"
                style={[styles.avatarRing, { borderColor: `${themeColor}55` }]}
                onPress={() => {
                  void pickAvatarFromHome();
                }}
              >
                <View>
                  <UserAvatar uri={selfAvatar} size={56} />
                  {avatarUploading ? (
                    <View style={styles.avatarUploadingOverlay}>
                      <Text style={styles.avatarUploadingText}>...</Text>
                    </View>
                  ) : null}
                </View>
              </SpringPressCard>
            </View>
          </View>

          <View style={styles.moodContainer}>
            {apiUser?.partner?.mood ? (
              <View style={styles.partnerMoodRow}>
                <Ionicons name="sparkles" size={14} color="#FFF0ED" />
                <Text style={styles.partnerMoodText}>
                  {partner}: <Text style={{ fontWeight: 'bold' }}>{apiUser?.partner?.mood}</Text>
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setMoodExpanded((value) => !value)}
              style={styles.moodHeader}
            >
              <Text style={styles.moodPrompt}>Share your Mood</Text>
              <Ionicons name={moodExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#fff" />
            </TouchableOpacity>

            {moodExpanded ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.moodScrollContent}
                >
                  {MOOD_OPTIONS.map((opt) => {
                    const isSelected = apiUser?.mood === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => handleUpdateMood(isSelected ? null : opt)}
                        style={[
                          styles.moodPill,
                          isSelected && { backgroundColor: 'white', borderColor: 'white' }
                        ]}
                      >
                        <Text
                          style={[
                            styles.moodPillText,
                            isSelected && { color: themeColor, fontWeight: '700' }
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.customMoodInputWrapper}>
                  <TextInput
                    value={customMood}
                    onChangeText={setCustomMood}
                    placeholder="Type a custom mood..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    style={styles.customMoodTextInput}
                    onSubmitEditing={() => {
                      if (customMood.trim()) {
                        handleUpdateMood(customMood.trim());
                        setCustomMood('');
                      }
                    }}
                  />
                  {(customMood.trim() || apiUser?.mood) ? (
                    <TouchableOpacity
                      onPress={() => {
                        if (customMood.trim()) {
                          handleUpdateMood(customMood.trim());
                          setCustomMood('');
                        } else {
                          handleUpdateMood(null);
                        }
                      }}
                      style={styles.moodActionBtn}
                    >
                      <Ionicons
                        name={customMood.trim() ? "checkmark-circle" : "close-circle"}
                        size={22}
                        color="white"
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </View>

        <View className="px-5 pt-6">
          <View className="flex-row flex-wrap justify-between mb-8">
            {[
              { icon: 'message-circle', label: 'Chat', sub: 'Message & GIFs', iconLib: 'Feather' },
              { icon: 'image', label: 'Memories', sub: 'Capture now', iconLib: 'Feather' },
              { icon: 'lock', label: 'Vault', sub: 'Secure', iconLib: 'Feather' },
              { icon: 'heart', label: 'Send Buzz', sub: 'Tap to send', iconLib: 'Feather' },
              { icon: 'game-controller-outline', label: 'Couple Games', sub: 'Play together', iconLib: 'Ionicons' },
            ].map((action, index) => (
              <Animated.View
                key={action.label}
                entering={FadeInDown.delay(140 + index * 65).springify().damping(17).stiffness(200)}
                className="mb-4 w-[48%]"
                style={action.label === 'Couple Games' ? styles.coupleGamesTile : undefined}
              >
                <SpringPressCard
                  style={{ width: '100%' }}
                  onPress={() => {
                    if (action.label === 'Memories') router.push('/calendar');
                    else if (action.label === 'Vault') router.push('/vault');
                    else if (action.label === 'Chat') router.push('/chat');
                    else if (action.label === 'Send Buzz') setBuzzModalVisible(true);
                    else if (action.label === 'Couple Games') setGamesModalVisible(true);
                  }}
                >
                  <View
                    className="rounded-[24px] border bg-white p-4 overflow-hidden"
                    style={{
                      aspectRatio: action.label === 'Couple Games' ? 2.75 : 1.34,
                      borderColor: `${themeColor}16`,
                      shadowColor: themeColor,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.08,
                      shadowRadius: 14,
                      elevation: 3,
                    }}
                  >
                    <LinearGradient
                      colors={['rgba(116,17,42,0.12)', 'rgba(255,255,255,0)', 'rgba(116,17,42,0.08)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View
                      className="h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${themeColor}18` }}
                    >
                      {action.iconLib === 'Ionicons' ? (
                        <Ionicons name={action.icon as any} size={28} color={themeColor} style={{ fontWeight: '700' }} />
                      ) : (
                        <Feather name={action.icon as any} size={28} color={themeColor} style={{ fontWeight: '700' }} />
                      )}
                    </View>
                    <View className="mt-3">
                      <Text
                        className="text-ink font-sans-semibold text-[18px] leading-[23px]"
                        style={{ letterSpacing: 0.1 }}
                      >
                        {action.label}
                      </Text>
                      <Text className="text-muted text-[13.5px] font-sans leading-5">{action.sub}</Text>
                    </View>
                  </View>
                </SpringPressCard>
              </Animated.View>
            ))}
          </View>

          <View className="mb-3 mt-1 flex-row items-end justify-between">
            <Text className="text-ink font-serif text-2xl">Offers for you!</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(520).springify().damping(17).stiffness(200)}>
            <SpringPressCard onPress={() => Haptics.selectionAsync()}>
              <GlassCard className="overflow-hidden px-6 py-5">
                <View className="items-center justify-center py-2">
                  <View
                    className="mb-3 h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${themeColor}18` }}
                  >
                    <Ionicons name="pricetag-outline" size={26} color={themeColor} />
                  </View>
                  <View 
                    className="mb-3 rounded-full border px-3.5 py-1"
                    style={{ backgroundColor: `${themeColor}14`, borderColor: `${themeColor}40` }}
                  >
                    <Text className="text-[11px] font-sans-bold uppercase tracking-widest" style={{ color: themeColor }}>
                      Coming Soon
                    </Text>
                  </View>
                  <Text className="text-center font-serif text-xl text-ink">Coupons & Exciting Features</Text>
                  <Text className="mt-2 text-center font-sans text-sm text-muted leading-5 px-4">
                    Special couple coupons, sweet surprises, and exciting new experiences are on the way for the two of you.
                  </Text>
                </View>
              </GlassCard>
            </SpringPressCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(560).springify().damping(18).stiffness(220)} className="mt-4">
            <Text className="mb-3 font-serif text-2xl text-ink">
              Our special moments
            </Text>
            <GlassCard className="p-6">
              {specialMoments.length === 0 ? (
                <View className="rounded-2xl border border-dashed border-stone-200 bg-cream/80 px-4 py-5">
                  <Text className="text-center font-sans text-sm leading-5 text-muted">
                    On Calendar, tap ★ on a date to add anniversaries & birthdays — no photo needed.
                  </Text>
                  <Pressable
                    onPress={() => router.push('/calendar')}
                    className="mt-3 items-center"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <Text className="font-sans-semibold text-sm" style={{ color: themeColor }}>
                      Open calendar
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View className="gap-2.5">
                  {specialMoments.map((moment, index) => {
                    const featured = index === 0;
                    const daysLabel = formatDaysLeft(moment.daysLeft);
                    return (
                      <View
                        key={moment.id}
                        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${featured ? 'border-stone-200' : 'border-stone-200/80 bg-white'
                          }`}
                        style={
                          featured
                            ? { backgroundColor: `${themeColor}12`, borderColor: `${themeColor}30` }
                            : { borderLeftWidth: 3, borderLeftColor: themeColor }
                        }
                      >
                        <Text
                          className={`flex-1 pr-3 font-sans-semibold text-ink ${featured ? 'text-[16px]' : 'text-[15px]'}`}
                          numberOfLines={2}
                        >
                          {moment.title}
                        </Text>
                        <Text
                          className={`font-sans-bold ${featured ? 'text-[15px]' : 'text-sm'}`}
                          style={{ color: themeColor }}
                        >
                          {daysLabel}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </GlassCard>
          </Animated.View>
        </View>
      </ScrollView>
        </>
      ) : (
        <WhiteHomeDashboard
          topInset={insets.top}
          bottomInset={insets.bottom}
          selfName={me}
          partnerName={partner}
          selfAvatar={selfAvatar}
          partnerAvatar={user?.avatarPartner || ''}
          partnerMood={apiUser?.partner?.mood}
          togetherSince={apiUser?.partnerKnownSince ?? apiUser?.partner?.partnerKnownSince ?? apiUser?.coupleCreatedAt}
          upcoming={specialMoments}
          onOpenCalendar={() => router.navigate({ pathname: '/(tabs)/memories', params: { view: 'upcoming' } })}
          onOpenSelfProfile={() => router.push('/self-profile')}
          unreadChatCount={unreadChatCount}
          unreadMemoryCount={unreadMemoryCount}
          unreadDiaryCount={unreadDiaryCount}
          unreadVaultCount={unreadVaultCount}
          unreadGameCount={unreadGameCount}
          unreadBuzzCount={unreadBuzzCount}
          carouselOwnerId={apiUser?.id ?? 'anonymous'}
          onTile={(id) => {
            void Haptics.selectionAsync();
            if (id === 'memories') {
              markCategoryRead('memory');
              router.navigate({ pathname: '/(tabs)/memories', params: { filter: 'all', view: 'timeline' } });
            } else if (id === 'chat') {
              markCategoryRead('chat');
              router.navigate('/(tabs)/chat');
            } else if (id === 'diary') {
              markCategoryRead('diary');
              router.navigate('/(tabs)/diary');
            } else if (id === 'vault') {
              markCategoryRead('vault');
              router.navigate('/(tabs)/vault');
            } else if (id === 'buzz') {
              markCategoryRead('buzz');
              router.navigate('/(tabs)/buzz');
            } else if (id === 'games') {
              markCategoryRead('game');
              setGamesModalVisible(true);
            }
          }}
        />
      )}

      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.inviteBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNotificationsVisible(false)} />
          <View
            style={[styles.inviteCard, styles.notificationsCard]}
          >
            <Text style={[styles.inviteTitle, { marginBottom: 16 }]}>Notifications</Text>
            <ScrollView
              style={styles.notificationsList}
              contentContainerStyle={styles.notificationsListContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {inboxItems.length === 0 ? (
                <Text style={styles.emptyNotificationText}>No notifications yet.</Text>
              ) : (
                inboxItems.map((item) => (
                  <View key={item.id} style={styles.notificationRow}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setNotificationsVisible(false)}
              style={[styles.inviteAcceptBtn, { backgroundColor: themeColor, marginTop: 16 }]}
            >
              <Text style={styles.inviteAcceptText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showLoveSent && (() => {
        const theme = PING_THEMES[sentBuzzKind] || { icon: 'heart', color: themeColor, library: 'Ionicons' };
        const isProminentBuzz = ['anger', 'hug', 'please'].includes(sentBuzzKind);
        const sentBuzzImageStyle = isProminentBuzz ? { width: 150, height: 150 } : styles.sentBuzzImage;
        return (
          <View className="absolute inset-0 z-50" style={{ elevation: 100 }} pointerEvents="none">
            <RNAnimated.View style={{ opacity: mainHeartOpacity }} className="absolute inset-0 bg-ink/25" />

            <View className="absolute inset-0 items-center justify-center px-6">
              <RNAnimated.View
                style={{ transform: [{ scale: mainHeartScale }], opacity: mainHeartOpacity }}
                className="w-full max-w-[340px] items-center"
              >
                <View
                  className="w-full items-center rounded-[32px] border border-stone-200 bg-white px-8 py-8"
                  style={styles.toastShadow}
                >
                  <View
                    className="mb-4 rounded-full border-2"
                    style={{ backgroundColor: `${theme.color}18`, borderColor: `${theme.color}44` }}
                  >
                    <ExpoImage source={theme.image} style={sentBuzzImageStyle} contentFit="contain" />
                  </View>
                  <Text className="text-center font-serif text-2xl text-ink">Buzz sent!</Text>
                  <Text className="mt-2 text-center text-sm font-sans-semibold" style={{ color: theme.color }}>
                    Your partner will feel it.
                  </Text>
                </View>
              </RNAnimated.View>
            </View>

            {floatingHearts.map((heart) => (
              <FloatingHeart
                key={heart.id}
                left={heart.left}
                size={heart.size}
                duration={heart.duration}
                delay={heart.delay}
                color={heart.color}
                imageSource={heart.imageSource}
                imageScale={heart.imageScale}
              />
            ))}

          </View>
        );
      })()}

      {/* Buzz Selector Bottom Sheet Modal */}
      <Modal
        visible={buzzModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBuzzModalVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setBuzzModalVisible(false)}>
          <View style={styles.sheetContent} onStartShouldSetResponder={() => true} onTouchEnd={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Send a Buzz to Partner</Text>
              <TouchableOpacity onPress={() => setBuzzModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsGrid}>
              {BUZZ_OPTIONS.map((opt) => {
                const isOptSelected = selectedBuzzOption === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setSelectedBuzzOption(opt.id)}
                    style={[
                      styles.optCard,
                      isOptSelected && { backgroundColor: `${opt.color}08`, borderColor: opt.color },
                    ]}
                  >
                    <View style={[styles.buzzImageTile, { backgroundColor: `${opt.color}12` }]}>
                      <ExpoImage
                        source={opt.image}
                        style={['anger', 'hug', 'please'].includes(opt.id) ? { width: 62, height: 62 } : styles.buzzImage}
                        contentFit="contain"
                      />
                    </View>
                    <Text style={[styles.optLabel, isOptSelected && { color: opt.color, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Send Button */}
            <TouchableOpacity
              onPress={() => {
                setBuzzModalVisible(false);
                triggerSendLove(selectedBuzzOption);
              }}
              style={[
                styles.sendBtn,
                { backgroundColor: PING_THEMES[selectedBuzzOption]?.color || themeColor },
              ]}
            >
              <Text style={styles.sendBtnText}>Send Buzz</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Game Invite Popup Modal */}
      <Modal
        visible={incomingInvite !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void declineIncomingInvite();
        }}
      >
        <Pressable 
          style={styles.inviteBackdrop} 
          onPress={() => {
            void declineIncomingInvite();
          }}
        >
          <Animated.View 
            entering={FadeInDown.springify().damping(18)}
            style={styles.inviteCard}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={[styles.inviteIconCircle, { backgroundColor: `${themeColor}15` }]}>
              <Ionicons name="game-controller" size={36} color={themeColor} />
            </View>

            <Text style={styles.inviteTitle}>Game Invite! 🎮</Text>
            
            <Text style={styles.inviteMessage}>
              <Text style={{ fontWeight: 'bold' }}>{incomingInvite?.senderName}</Text> is inviting you to play{' '}
              <Text style={{ fontWeight: 'bold', color: themeColor }}>
                {incomingInvite?.gameType === 'love-challenge' ? 'Love Challenge' : 'Tic-Tac-Toe'}
              </Text>
              ! Ready to join?
            </Text>

            <View style={styles.inviteActions}>
              <TouchableOpacity
                onPress={() => {
                  void declineIncomingInvite();
                }}
                style={styles.inviteDeclineBtn}
              >
                <Text style={styles.inviteDeclineText}>Not now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void acceptIncomingInvite();
                }}
                style={[styles.inviteAcceptBtn, { backgroundColor: themeColor }]}
              >
                <Text style={styles.inviteAcceptText}>Let&apos;s Play!</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Love Challenge Notification Popup */}
      <Modal
        visible={pendingChallenge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingChallenge(null)}
      >
        <Pressable
          style={styles.inviteBackdrop}
          onPress={() => setPendingChallenge(null)}
        >
          <Animated.View
            entering={FadeInDown.springify().damping(18)}
            style={styles.inviteCard}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {challengePopupMode === 'new' ? (
              // ── Partner: new challenge to answer ──
              <>
                <View style={[styles.inviteIconCircle, { backgroundColor: `${themeColor}15` }]}>
                  <Ionicons name="help-circle" size={36} color={themeColor} />
                </View>
                <Text style={styles.inviteTitle}>New Love Challenge! 🧠</Text>
                <Text style={styles.inviteMessage}>
                  Your partner created a new quiz for you:{' '}
                  <Text style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                    &quot;{pendingChallenge?.question}&quot;
                  </Text>
                  . Ready to answer?
                </Text>
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    onPress={() => setPendingChallenge(null)}
                    style={styles.inviteDeclineBtn}
                  >
                    <Text style={styles.inviteDeclineText}>Maybe Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setPendingChallenge(null);
                      setInitialGameToOpen('love-challenge');
                      setGamesModalVisible(true);
                    }}
                    style={[styles.inviteAcceptBtn, { backgroundColor: themeColor }]}
                  >
                    <Text style={styles.inviteAcceptText}>Answer Now</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // ── Creator: partner answered my challenge ──
              <>
                <View style={[styles.inviteIconCircle, { backgroundColor: '#2ecc7118' }]}>
                  <Ionicons
                    name={
                      pendingChallenge?.answeredIdx === pendingChallenge?.correctIdx
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={36}
                    color={
                      pendingChallenge?.answeredIdx === pendingChallenge?.correctIdx
                        ? '#2ecc71'
                        : '#e74c3c'
                    }
                  />
                </View>
                <Text style={styles.inviteTitle}>
                  {pendingChallenge?.answeredIdx === pendingChallenge?.correctIdx
                    ? '🎉 They got it right!'
                    : '😅 They got it wrong!'}
                </Text>
                <Text style={styles.inviteMessage}>
                  {user ? getPartnerChatLabel(user) : 'Your partner'} answered your challenge:{' '}
                  <Text style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                    &quot;{pendingChallenge?.question}&quot;
                  </Text>
                </Text>
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    onPress={() => setPendingChallenge(null)}
                    style={[styles.inviteAcceptBtn, { backgroundColor: themeColor, flex: 1 }]}
                  >
                    <Text style={styles.inviteAcceptText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </Pressable>
      </Modal>

      <GamesModal
        visible={gamesModalVisible}
        initialGame={initialGameToOpen}
        onClose={() => {
          setGamesModalVisible(false);
          setInitialGameToOpen('none');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarRing: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  toastShadow: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 20,
    fontFamily: 'serif',
    color: 'rgba(255, 255, 255, 1)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 32,
    flexShrink: 1,
  },
  heroEm: {
    color: UnMeColors.heroEmphasis,
    fontWeight: '700',
  },
  moodContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  partnerMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  partnerMoodText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 6,
  },
  moodPrompt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  moodScrollContent: {
    paddingRight: 10,
    gap: 8,
    marginBottom: 12,
    paddingTop: 12,
  },
  moodPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  moodPillText: {
    color: '#fff',
    fontSize: 13,
  },
  customMoodInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  customMoodTextInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    paddingVertical: 0,
  },
  moodActionBtn: {
    padding: 4,
    marginLeft: 6,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    backgroundColor: 'rgba(26, 26, 26, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUploadingText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  coupleGamesTile: {
    alignSelf: 'center',
    width: '100%',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sheetCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    gap: 6,
  },
  catLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6B7280',
    marginBottom: 10,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  optCard: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buzzImageTile: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  buzzImage: {
    width: 46,
    height: 46,
  },
  sentBuzzImage: {
    width: 118,
    height: 118,
  },
  optLabel: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  sendBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  inviteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 0, 5, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  inviteCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 26, 26, 0.08)',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  notificationsCard: {
    maxWidth: 360,
    maxHeight: '76%',
    alignItems: 'stretch',
  },
  notificationsList: {
    maxHeight: Dimensions.get('window').height * 0.48,
    width: '100%',
  },
  notificationsListContent: {
    paddingBottom: 4,
  },
  inviteIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#1a0010',
    marginBottom: 10,
    textAlign: 'center',
  },
  inviteMessage: {
    fontSize: 14,
    color: '#5a2030',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  inviteDeclineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(26, 26, 26, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
  },
  inviteDeclineText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  inviteAcceptBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteAcceptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  notificationRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 26, 26, 0.08)',
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a0010',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#5a2030',
    lineHeight: 18,
  },
  emptyNotificationText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 18,
  },
});
