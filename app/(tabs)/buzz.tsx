import { BUZZ_OPTIONS, buzzImageFor, normalizeBuzzKind } from '@/constants/buzzAssets';
import { UnMeColors } from '@/constants/smittenTheme';
import { smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { coupleApi, type LovePing } from '@/src/services/coupleApi';
import { getPartnerChatLabel, useAuthStore } from '@/src/store/useAuthStore';
import { useCoupleLoveStore } from '@/src/store/coupleLoveStore';
import { useNotificationInboxStore } from '@/src/store/useNotificationInboxStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BUZZES = BUZZ_OPTIONS.map((item) => ({
  ...item,
  background: `${item.color}16`,
}));
const BUZZ_PARTICLES = [
  { left: '8%', offset: -30, delay: 0, size: 34 },
  { left: '14%', offset: 24, delay: 290, size: 24 },
  { left: '20%', offset: 20, delay: 130, size: 42 },
  { left: '27%', offset: -34, delay: 390, size: 28 },
  { left: '34%', offset: -18, delay: 250, size: 30 },
  { left: '41%', offset: 30, delay: 470, size: 22 },
  { left: '48%', offset: 28, delay: 70, size: 38 },
  { left: '55%', offset: -32, delay: 360, size: 27 },
  { left: '62%', offset: -24, delay: 210, size: 44 },
  { left: '69%', offset: 34, delay: 440, size: 23 },
  { left: '75%', offset: 16, delay: 330, size: 32 },
  { left: '81%', offset: -28, delay: 520, size: 26 },
  { left: '87%', offset: -20, delay: 150, size: 40 },
  { left: '93%', offset: 18, delay: 410, size: 25 },
] as const;
function timeLabel(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function BuzzScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [selected, setSelected] = useState<(typeof BUZZES)[number]['id']>('love');
  const [history, setHistory] = useState<LovePing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentCelebration, setSentCelebration] = useState<{
    image: number;
    label: string;
    color: string;
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.4)).current;
  const particleProgress = useRef(new Animated.Value(0)).current;
  const celebrationAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const fetchPendingLove = useCoupleLoveStore((state) => state.fetchPending);
  const markLoveRead = useCoupleLoveStore((state) => state.markRead);
  const markBuzzCategoryRead = useNotificationInboxStore((state) => state.markCategoryRead);

  const loadHistory = useCallback(async () => {
    try {
      const response = await coupleApi.getLoveHistory();
      setHistory(response.loves);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
      void loadHistory();
      // Fetch pending buzzes and mark notifications as read when opening buzz screen
      void fetchPendingLove();
      markBuzzCategoryRead('buzz');
      // Mark all pending buzzes as read without making the focus effect depend on the live queue.
      useCoupleLoveStore.getState().pending.forEach((buzz) => {
        void markLoveRead(buzz.id);
      });
    }, [loadHistory, fetchPendingLove, markBuzzCategoryRead, markLoveRead]),
  );

  const active = useMemo(() => BUZZES.find((item) => item.id === selected) ?? BUZZES[0], [selected]);
  const partner = getPartnerChatLabel(user);
  const bottomSpace = (Platform.OS === 'ios' ? 92 : 82) + insets.bottom;

  const playSentCelebration = useCallback(
    (buzz: (typeof BUZZES)[number]) => {
      celebrationOpacity.setValue(0);
      celebrationScale.setValue(0.4);
      particleProgress.setValue(0);
      setSentCelebration({ image: buzz.image, label: buzz.label, color: buzz.color });

      requestAnimationFrame(() => {
        celebrationAnimationRef.current?.stop();
        const animation = Animated.parallel([
          Animated.sequence([
            Animated.parallel([
              Animated.timing(celebrationOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
              }),
              Animated.spring(celebrationScale, {
                toValue: 1,
                damping: 9,
                stiffness: 180,
                mass: 0.7,
                useNativeDriver: true,
              }),
            ]),
            Animated.delay(1_050),
            Animated.timing(celebrationOpacity, {
              toValue: 0,
              duration: 280,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(particleProgress, {
            toValue: 1,
            duration: 1_650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);
        celebrationAnimationRef.current = animation;
        animation.start(({ finished }) => {
          if (finished && celebrationAnimationRef.current === animation) {
            celebrationAnimationRef.current = null;
            setSentCelebration(null);
          }
        });
      });
    },
    [celebrationOpacity, celebrationScale, particleProgress],
  );

  const send = async () => {
    setSending(true);
    try {
      await coupleApi.sendLove(selected);
      playSentCelebration(active);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadHistory();
    } catch (error) {
      smittenAlertFromError(error, 'Could not send Buzz', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      {sentCelebration ? (
        <View pointerEvents="none" style={styles.celebrationHost}>
          <Animated.View
            style={[
              styles.celebrationDim,
              {
                opacity: celebrationOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.18],
                }),
              },
            ]}
          />
          {BUZZ_PARTICLES.map((particle, index) => {
            const start = Math.max(0.01, particle.delay / 1_650);
            return (
              <Animated.View
                key={`${particle.left}-${index}`}
                style={[
                  styles.celebrationParticle,
                  {
                    left: particle.left,
                    opacity: particleProgress.interpolate({
                      inputRange: [0, start, Math.min(0.82, start + 0.12), 1],
                      outputRange: [0, 0, 1, 0],
                    }),
                    transform: [
                      {
                        translateY: particleProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [80, -Dimensions.get('window').height * 0.72],
                        }),
                      },
                      {
                        translateX: particleProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, particle.offset],
                        }),
                      },
                      {
                        scale: particleProgress.interpolate({
                          inputRange: [0, 0.18, 1],
                          outputRange: [0.55, 1, 0.8],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  source={sentCelebration.image}
                  style={{ width: particle.size, height: particle.size }}
                  contentFit="contain"
                />
              </Animated.View>
            );
          })}
          <Animated.View
            style={[
              styles.celebrationCard,
              {
                opacity: celebrationOpacity,
                transform: [{ scale: celebrationScale }],
                borderColor: `${sentCelebration.color}40`,
              },
            ]}
          >
            <Image source={sentCelebration.image} style={styles.celebrationImage} contentFit="contain" />
          </Animated.View>
        </View>
      ) : null}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={22} color={UnMeColors.txDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buzz</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCircle}>
          <Image source={active.image} style={[styles.heroImage, { width: 142 * ((active as any).size ?? 1), height: 142 * ((active as any).size ?? 1) }]} contentFit="contain" />
        </View>
        <Text style={styles.title}>Tap to send a Buzz</Text>
        <Text style={styles.subtitle}>Send {partner} a small nudge to let them know they are on your mind.</Text>

        <View style={styles.options}>
          {BUZZES.map((item) => {
            const sizeScale = (item as any).size ?? 1;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelected(item.id)}
                style={[styles.option, selected === item.id && { borderColor: item.color, backgroundColor: item.background }]}
              >
                <Image source={item.image} style={[styles.optionImage, { width: 60 * sizeScale, height: 60 * sizeScale }]} contentFit="contain" />
                <Text style={[styles.optionText, selected === item.id && { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={() => void send()} disabled={sending} style={[styles.sendButton, { backgroundColor: active.color }, sending && styles.disabled]}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send {active.label} Buzz</Text>}
        </TouchableOpacity>

        <Text style={styles.recentTitle}>Recent</Text>
        {loading ? (
          <ActivityIndicator color={UnMeColors.m7} style={{ marginTop: 24 }} />
        ) : history.length === 0 ? (
          <Text style={styles.empty}>Your Buzz history will appear here.</Text>
        ) : (
          history.slice(0, 5).map((item) => {
            const theme = BUZZES.find((buzz) => buzz.id === normalizeBuzzKind(item.kind)) ?? BUZZES[0];
            const sent = item.direction === 'sent';
            const sizeScale = (theme as any).size ?? 1;
            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={[styles.historyIcon, { backgroundColor: theme.background }]}>
                  <Image
                    source={buzzImageFor(item.kind, sent ? 'sent' : 'received')}
                    style={[styles.historyImage, { width: 38 * sizeScale, height: 38 * sizeScale }]}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.historyCopy}>
                  <Text style={styles.historyTitle}>{sent ? `You buzzed ${partner}` : `${partner} buzzed you`}</Text>
                  <Text style={styles.historyTime}>{timeLabel(item.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 74, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  headerButton: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25, lineHeight: 36, paddingTop: 2 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28, alignItems: 'stretch' },
  heroCircle: { width: 152, height: 152, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: 142, height: 142 },
  title: { marginTop: 24, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24, textAlign: 'center' },
  subtitle: { marginTop: 8, color: '#9b8792', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24 },
  option: { width: '48%', minHeight: 64, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f0e2e6', borderRadius: 17, paddingHorizontal: 12, backgroundColor: '#fff' },
  optionImage: { width: 42, height: 42 },
  optionText: { marginLeft: 8, color: '#9b8792', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  sendButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 17, marginTop: 16 },
  sendText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  disabled: { opacity: 0.65 },
  recentTitle: { marginTop: 32, marginBottom: 12, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  historyCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingHorizontal: 13, marginBottom: 10, backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 13, elevation: 2 },
  historyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  historyImage: { width: 38, height: 38 },
  historyCopy: { flex: 1, paddingLeft: 13 },
  historyTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15 },
  historyTime: { marginTop: 4, color: '#ae99a3', fontFamily: 'Inter_400Regular', fontSize: 11 },
  empty: { color: '#a48f99', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', paddingVertical: 28 },
  celebrationHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#21151B',
  },
  celebrationParticle: {
    position: 'absolute',
    bottom: 30,
  },
  celebrationCard: {
    width: 250,
    minHeight: 270,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    backgroundColor: '#fff',
    shadowColor: '#301923',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
  },
  celebrationImage: { width: 150, height: 150 },
  celebrationTitle: {
    marginTop: 5,
    color: UnMeColors.txDark,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 23,
  },
  celebrationText: {
    marginTop: 6,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
});
