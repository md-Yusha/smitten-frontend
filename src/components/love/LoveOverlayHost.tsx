import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated as RNAnimated,
  Easing,
  Dimensions,
  AppState,
  Vibration,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useCoupleLoveStore } from '@/src/store/coupleLoveStore';
import { buzzImageFor, normalizeBuzzKind } from '@/constants/buzzAssets';

type PingTheme = {
  icon: string;
  color: string;
  title: string;
  sub: string;
  vibrate: number[];
  fallingIcon: string;
  image: any;
};

const PING_THEMES: Record<string, PingTheme> = {
  love: {
    icon: 'heart',
    color: '#EF4444',
    title: 'sent Love! ❤️',
    sub: 'Sending warm love to your heart.',
    vibrate: [0, 150, 100, 150, 100, 300],
    fallingIcon: 'heart',
    image: buzzImageFor('love', 'received'),
  },
  hug: {
    icon: 'accessibility',
    color: '#8B5CF6',
    title: 'sent a Hug! 🤗',
    sub: 'A warm hug is coming your way.',
    vibrate: [0, 100, 50, 100, 50, 100],
    fallingIcon: 'heart',
    image: buzzImageFor('hug', 'received'),
  },
  anger: {
    icon: 'flame',
    color: '#DC2626',
    title: 'sent Anger! 💢',
    sub: 'A little fire, a little feeling.',
    vibrate: [0, 80, 40, 80, 40, 80, 40, 80, 40, 120],
    fallingIcon: 'heart',
    image: buzzImageFor('anger', 'received'),
  },
  please: {
    icon: 'hand-left',
    color: '#10B981',
    title: 'says Please... 🥺',
    sub: 'Pretty please with a cherry on top?',
    vibrate: [0, 150, 250, 150],
    fallingIcon: 'heart',
    image: buzzImageFor('please', 'received'),
  },
  kiss: {
    icon: 'heart',
    color: '#E14D76',
    title: 'sent a Kiss! 💋',
    sub: 'A kiss is coming your way.',
    vibrate: [0, 120, 80, 180],
    fallingIcon: 'heart',
    image: buzzImageFor('kiss', 'received'),
  },
  sorry: {
    icon: 'heart',
    color: '#4D8FC8',
    title: 'says Sorry',
    sub: 'A soft little apology for you.',
    vibrate: [0, 160, 120, 160],
    fallingIcon: 'heart',
    image: buzzImageFor('sorry', 'received'),
  },
};

PING_THEMES.love_heart = PING_THEMES.love;
PING_THEMES.love_kiss = PING_THEMES.kiss;
PING_THEMES.love_cuddle = PING_THEMES.hug;
PING_THEMES.anger_mad = PING_THEMES.anger;
PING_THEMES.anger_hate = PING_THEMES.anger;
PING_THEMES.please_beg = PING_THEMES.please;

const DEFAULT_THEME: PingTheme = {
  icon: 'heart',
  color: '#EF4444',
  title: 'sent love!',
  sub: 'Someone is thinking of you.',
  vibrate: [0, 150, 100, 150, 100, 300],
  fallingIcon: 'heart',
  image: buzzImageFor('love', 'received'),
};

const FallingIcon = ({
  left,
  size,
  duration,
  delay,
  iconName,
  color,
  imageSource,
  imageScale = 1,
}: {
  left: number;
  size: number;
  duration: number;
  delay: number;
  iconName: string;
  color: string;
  imageSource?: any;
  imageScale?: number;
}) => {
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
          toValue: Dimensions.get('window').height + 150,
          duration,
          easing: Easing.out(Easing.quad),
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
    setTimeout(() => {
      RNAnimated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, duration + delay - 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount burst
  }, []);

  return (
    <RNAnimated.View
      style={{
        position: 'absolute',
        top: -100,
        left: `${left}%`,
        transform: [{ translateY }, { translateX }, { scale }],
        opacity,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 9,
      }}
    >
      {imageSource ? (
        <ExpoImage source={imageSource} style={{ width: size * imageScale, height: size * imageScale }} contentFit="contain" />
      ) : (
        <Ionicons name={iconName as any} size={size} color={color} />
      )}
    </RNAnimated.View>
  );
};

export function LoveOverlayHost() {
  const apiUser = useAuthStore((s) => s.apiUser);
  const pendingLoves = useCoupleLoveStore((s) => s.pending);
  const fetchPendingLove = useCoupleLoveStore((s) => s.fetchPending);
  const markLoveRead = useCoupleLoveStore((s) => s.markRead);

  const [visible, setVisible] = useState(false);
  const [fromName, setFromName] = useState('');
  const [activeTheme, setActiveTheme] = useState<PingTheme>(DEFAULT_THEME);
  const [activeKind, setActiveKind] = useState<string>('love');
  const [fallingIcons, setFallingIcons] = useState<
    {
      id: number;
      left: number;
      size: number;
      duration: number;
      delay: number;
      imageSource?: any;
      imageScale?: number;
    }[]
  >([]);
  
  const cardTranslateY = useRef(new RNAnimated.Value(-600)).current;
  const mainOpacity = useRef(new RNAnimated.Value(0)).current;
  const showingRef = useRef(false);
  const queueRef = useRef<string[]>([]);

  const canReceive = Boolean(apiUser?.coupleId && apiUser?.partner);

  const refreshPending = useCallback(() => {
    if (canReceive) void fetchPendingLove();
  }, [canReceive, fetchPendingLove]);

  useEffect(() => {
    refreshPending();
    const retryTimers = [800, 2000, 5000].map((ms) => setTimeout(refreshPending, ms));
    const pollTimer = setInterval(() => {
      if (AppState.currentState === 'active') refreshPending();
    }, 15_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPending();
        [800, 2000, 5000].forEach((ms) => setTimeout(refreshPending, ms));
      }
    });
    return () => {
      retryTimers.forEach(clearTimeout);
      clearInterval(pollTimer);
      sub.remove();
    };
  }, [refreshPending]);

  const playReceived = useCallback(
    (senderName: string, kind: string, onDone: () => void) => {
      const normalizedKind = normalizeBuzzKind(kind);
      const theme = PING_THEMES[normalizedKind] ?? DEFAULT_THEME;
      setActiveTheme(theme);
      setActiveKind(normalizedKind);
      setFromName(senderName);
      setVisible(true);
      const isProminent = ['anger', 'hug', 'please'].includes(normalizedKind);
      setFallingIcons(
        Array.from({ length: 25 }).map((_, i) => ({
          id: Date.now() + i,
          left: 5 + Math.random() * 90,
          size: Math.random() * (isProminent ? 36 : 25) + (isProminent ? 28 : 20),
          duration: Math.random() * 1200 + 1300,
          delay: Math.random() * 500,
          imageSource: theme.image,
          imageScale: isProminent ? 1.6 : 1.2,
        })),
      );
      
      cardTranslateY.setValue(-600);
      mainOpacity.setValue(0);
      
      // Intense, customized vibration pattern based on selection
      Vibration.vibrate(theme.vibrate);

      RNAnimated.sequence([
        RNAnimated.parallel([
          RNAnimated.spring(cardTranslateY, { toValue: 0, friction: 6, tension: 35, useNativeDriver: true }),
          RNAnimated.timing(mainOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]),
        RNAnimated.delay(2600),
        RNAnimated.parallel([
          RNAnimated.timing(cardTranslateY, { 
            toValue: Dimensions.get('window').height + 150, 
            duration: 450, 
            easing: Easing.in(Easing.back(1.7)), 
            useNativeDriver: true 
          }),
          RNAnimated.timing(mainOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      ]).start(() => {
        setVisible(false);
        setFallingIcons([]);
        cardTranslateY.setValue(-600);
        mainOpacity.setValue(0);
        onDone();
      });
    },
    [mainOpacity, cardTranslateY],
  );

  const drainQueue = useCallback(() => {
    const nextId = queueRef.current.shift();
    if (!nextId) {
      showingRef.current = false;
      return;
    }
    const ping = useCoupleLoveStore.getState().pending.find((p) => p.id === nextId);
    if (!ping) {
      drainQueue();
      return;
    }
    playReceived(ping.senderName, ping.kind || 'love', () => {
      void markLoveRead(ping.id).then(drainQueue);
    });
  }, [markLoveRead, playReceived]);

  const showNext = useCallback(() => {
    if (!canReceive || showingRef.current || visible) return;
    const pending = useCoupleLoveStore.getState().pending;
    if (!pending.length) return;
    showingRef.current = true;
    queueRef.current = pending.map((p) => p.id);
    drainQueue();
  }, [canReceive, drainQueue, visible]);

  useEffect(() => {
    showNext();
  }, [canReceive, pendingLoves, showNext, visible]);

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <RNAnimated.View style={[styles.dim, { opacity: mainOpacity }]} />
      <View style={styles.center}>
        <RNAnimated.View style={{ transform: [{ translateY: cardTranslateY }], opacity: mainOpacity, width: '100%', alignItems: 'center' }}>
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: `${activeTheme.color}15`, borderColor: `${activeTheme.color}45` }]}>
              {(() => {
                const isProminent = ['anger', 'hug', 'please'].includes(activeKind || '');
                const imageStyle = isProminent ? { width: 150, height: 150 } : styles.buzzImage;
                return <ExpoImage source={activeTheme.image} style={imageStyle} contentFit="contain" />;
              })()}
            </View>
            <Text style={styles.title}>{fromName} {activeTheme.title}</Text>
            <Text style={[styles.sub, { color: activeTheme.color }]}>{activeTheme.sub}</Text>
          </View>
        </RNAnimated.View>
      </View>
      {fallingIcons.map((h) => (
        <FallingIcon 
          key={h.id} 
          left={h.left} 
          size={h.size} 
          duration={h.duration} 
          delay={h.delay} 
          iconName={activeTheme.fallingIcon}
          color={activeTheme.color}
          imageSource={h.imageSource}
          imageScale={h.imageScale}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 200 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,26,0.3)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 32,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: { marginBottom: 16, borderRadius: 999, borderWidth: 2, padding: 12 },
  buzzImage: { width: 118, height: 118 },
  title: { fontSize: 22, color: '#1A1A1A', textAlign: 'center', fontWeight: '700' },
  sub: { marginTop: 8, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
