import { SmittenColors } from '@/constants/smittenTheme';
import { useTheme } from '@/context/ThemeContext';
import { AuthedMediaImage } from '@/src/components/media/AuthedMediaImage';
import { smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { useContentPrefetch } from '@/src/hooks/useContentPrefetch';
import { goToLanding } from '@/src/services/authNavigation';
import { resolveApiMediaUrl } from '@/src/services/mediaUrl';
import { memoriesApi, type ApiMemory } from '@/src/services/memoriesApi';
import { canAccessApp } from '@/src/services/session';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { Redirect, Tabs } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Share, StatusBar as NativeStatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

function CustomTabBar({ state, navigation, onCenterPress, centerActive, centerOverlay }: any) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { themeColor } = useTheme();
  const tabBarBottomPadding = Math.max(insets.bottom, 12);
  const tabBarHeight = (Platform.OS === 'ios' ? 72 : 62) + tabBarBottomPadding;
  const tabItemWidth = Math.max(52, Math.min(72, (screenWidth - 88) / 4));

  const focusedRoute = state.routes[state.index];
  const isHome = focusedRoute.name === 'index';

  if (focusedRoute.name === 'chat') return null;

  const navigateTo = (name: string) => {
    if (centerActive) return;
    void Haptics.selectionAsync();
    navigation.navigate(name);
  };

  const centerButton = (
    <TouchableOpacity activeOpacity={0.92} onPress={onCenterPress} style={styles.centerButtonWrapper}>
      <View
        style={[
          styles.centerButtonRing,
          { borderColor: centerActive ? themeColor : 'transparent' },
        ]}
      >
        <View
          style={[
            styles.centerButton,
            {
              backgroundColor: centerActive ? themeColor : '#fff',
              shadowColor: themeColor,
              borderColor: centerActive ? '#fff' : '#fff5f6',
            },
          ]}
        >
          <Image
            source={require('../../assets/images/tab_icon.jpeg')}
            style={styles.centerButtonImage}
            resizeMode="cover"
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderItem = (
    name: 'index' | 'chat' | 'memories' | 'profile',
    label: string,
    outline: keyof typeof Ionicons.glyphMap,
    filled: keyof typeof Ionicons.glyphMap,
  ) => {
    const focused = focusedRoute.name === name;
    return (
      <TouchableOpacity
        key={name}
        activeOpacity={0.85}
        onPress={() => navigateTo(name)}
        style={[styles.tabItem, { width: tabItemWidth }]}
      >
        <Ionicons name={focused ? filled : outline} size={19} color={focused ? themeColor : '#c8b9c0'} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          maxFontSizeMultiplier={1.25}
          style={[styles.tabLabel, focused && { color: themeColor }]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.tabBarContainer,
        { height: centerActive ? screenHeight : tabBarHeight },
      ]}
      pointerEvents="box-none"
    >
      {centerOverlay}
      <View
        style={[
          styles.tabBarInner,
          styles.tabBarSurface,
          { height: tabBarHeight, paddingBottom: tabBarBottomPadding },
          centerActive && styles.activeTabBarInner,
          isHome && styles.homeTabBarInner,
        ]}
      >
        {centerActive ? (
          <>
            {renderItem('index', 'Home', 'home-outline', 'home')}
            {centerButton}
            <View style={{ width: 58 }} />
          </>
        ) : isHome ? (
          <>
            {renderItem('index', 'Home', 'home-outline', 'home')}
            {centerButton}
            {renderItem('profile', 'Profile', 'person-outline', 'person')}
          </>
        ) : (
          <>
            {renderItem('index', 'Home', 'home-outline', 'home')}
            {renderItem('chat', 'Chat', 'chatbubble-outline', 'chatbubble')}
            {centerButton}
            {renderItem('memories', 'Memories', 'images-outline', 'images')}
            {renderItem('profile', 'Profile', 'person-outline', 'person')}
          </>
        )}
      </View>
    </View>
  );
}

function formatMemoryDate(date: string | undefined | null) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateTogetherTime(startIso: string | null) {
  if (!startIso) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0 };
  const start = new Date(startIso);
  const now = new Date();
  
  let diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) diffMs = 0;
  
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  
  if (days < 0) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  
  if (months < 0) {
    months += 12;
    years--;
  }
  
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  
  if (hours < 0) {
    hours += 24;
    days--;
  }
  
  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    hours: Math.max(0, hours),
    minutes: Math.max(0, minutes),
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const shareMockupRef = useRef<View>(null);
  const apiUser = useAuthStore((s) => s.apiUser);
  const signedOut = useAuthStore((s) => s.signedOut);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const isSigningOut = useAuthStore((s) => s.isSigningOut);
  const { sessionReady } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [memories, setMemories] = useState<ApiMemory[]>([]);
  const [randomMemory, setRandomMemory] = useState<ApiMemory | null>(null);
  const randomImage = useMemo(
    () => (randomMemory?.imageUrl ? resolveApiMediaUrl(randomMemory.imageUrl) : null),
    [randomMemory],
  );
  const [togetherTime, setTogetherTime] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0 });
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [sharingMemory, setSharingMemory] = useState(false);
  const [, setSubscriptionTick] = useState(0);
  const modalMetrics = useMemo(() => {
    const systemTopInset = Math.max(
      insets.top,
      Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 24 : 0,
    );
    const responsiveTopGap = Math.max(20, Math.min(30, screenHeight * 0.03));
    const topOffset = systemTopInset + responsiveTopGap;
    const responsiveSideGap = Math.max(14, Math.min(22, screenWidth * 0.04));
    const tabBarBaseHeight = Platform.OS === 'ios' ? 72 : 62;
    const tabBarPaddingBottom = Math.max(insets.bottom, 12);
    const tabBarHeight = tabBarBaseHeight + tabBarPaddingBottom;
    return {
      topOffset,
      leftOffset: Math.max(insets.left + 8, responsiveSideGap),
      rightOffset: Math.max(insets.right + 8, responsiveSideGap),
      tabBarHeight,
    };
  }, [insets.bottom, insets.left, insets.right, insets.top, screenHeight, screenWidth]);

  useEffect(() => {
    if (signedOut || isSigningOut || (sessionReady && !apiUser)) {
      goToLanding();
    }
  }, [signedOut, isSigningOut, sessionReady, apiUser]);

  useContentPrefetch();

  useEffect(() => {
    const interval = setInterval(() => {
      setSubscriptionTick((tick) => tick + 1);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const pickRandomMemory = useCallback((items: ApiMemory[], current: ApiMemory | null) => {
    if (!items.length) return null;
    if (items.length === 1) return items[0];

    const choices = items.filter((m) => m.id !== current?.id);
    const pool = choices.length > 0 ? choices : items;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const refreshRandomMemory = useCallback(() => {
    if (memories.length > 0) {
      setRandomMemory((current) => pickRandomMemory(memories, current));
      return;
    }
    setModalVisible(true);
  }, [memories, pickRandomMemory]);

  useEffect(() => {
    if (!modalVisible) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const togetherSince = apiUser?.partnerKnownSince ?? apiUser?.partner?.partnerKnownSince ?? apiUser?.coupleCreatedAt ?? null;
    setTogetherTime(calculateTogetherTime(togetherSince));

    const timeInterval = setInterval(() => {
      setTogetherTime(calculateTogetherTime(togetherSince));
    }, 60_000);

    const loadMemories = async () => {
      setLoadingMemories(true);
      try {
        const res = await memoriesApi.list();
        const items = res.memories.filter((m) => Boolean(m.imageUrl?.trim()));
        setMemories(items);
        setRandomMemory((current) => pickRandomMemory(items, current));
      } catch {
        setMemories([]);
        setRandomMemory(null);
      } finally {
        setLoadingMemories(false);
      }
    };

    void loadMemories();

    return () => {
      clearInterval(timeInterval);
    };
  }, [modalVisible, apiUser?.coupleCreatedAt, apiUser?.partner?.partnerKnownSince, apiUser?.partnerKnownSince, pickRandomMemory]);

  const onShareMemory = useCallback(async () => {
    if (!randomImage || sharingMemory) return;

    const togetherMessage = `Together for ${togetherTime.years} years, ${togetherTime.months} months, ${togetherTime.days} days, ${togetherTime.hours} hours, ${togetherTime.minutes} minutes.`;

    try {
      setSharingMemory(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      let capturedUri: string | null = null;
      try {
        capturedUri = shareMockupRef.current
          ? await captureRef(shareMockupRef.current, {
              format: 'jpg',
              quality: 0.94,
              result: 'tmpfile',
            })
          : null;
      } catch (captureError) {
        console.warn('[SmittenShare] Could not capture memory card; using text share.', captureError);
      }

      if (capturedUri) {
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(capturedUri, {
              mimeType: 'image/jpeg',
              dialogTitle: 'Share Memory',
              UTI: 'public.jpeg',
            });
            return;
          }
        } catch (imageShareError) {
          console.warn('[SmittenShare] Could not share captured image; using text share.', imageShareError);
        }
      }

      await Share.share({
        title: 'Shared from Smittenz',
        message: `Shared from Smittenz\n${togetherMessage}`,
      });
    } catch (error) {
      smittenAlertFromError(error, 'Could not share memory', 'error');
    } finally {
      setSharingMemory(false);
    }
  }, [randomImage, sharingMemory, togetherTime]);

  const renderCenterOverlay = useCallback(() => (
    <Pressable
      style={[styles.centerOverlay, { height: screenHeight }]}
      onPress={() => setModalVisible(false)}
    >
      <Pressable
        ref={shareMockupRef}
        collapsable={false}
        style={[styles.memoryCard, { bottom: modalMetrics.tabBarHeight }]}
        onPress={(event) => event.stopPropagation()}
      >
        {!sharingMemory ? (
          <TouchableOpacity
            style={[
              styles.closeCardBtn,
              { top: modalMetrics.topOffset, right: modalMetrics.rightOffset },
            ]}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.7}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close Smitten memory"
          >
            <Feather name="x" size={21} color="#ffffff" />
          </TouchableOpacity>
        ) : null}

        {loadingMemories ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        ) : randomImage ? (
          <>
            <AuthedMediaImage
              uri={randomImage}
              recyclingKey={`mem-random-${randomImage}`}
              style={styles.memoryImage}
              contentFit="cover"
            />
            {!sharingMemory ? (
              <TouchableOpacity style={styles.shareImageBtn} onPress={onShareMemory} activeOpacity={0.82}>
                <Feather name="share-2" size={18} color="#fff" />
              </TouchableOpacity>
            ) : null}
            <View
              style={[
                styles.shareBadge,
                { top: modalMetrics.topOffset, left: modalMetrics.leftOffset },
              ]}
            >
              <Image
                source={require('../../assets/images/shared_logo.png')}
                style={styles.shareBadgeLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.memoryInfo}>
              <Text style={styles.memoryTitle} numberOfLines={1}>{randomMemory?.title}</Text>
              <Text style={styles.memoryDesc} numberOfLines={2}>
                {randomMemory?.description || formatMemoryDate(randomMemory?.memoryAt)}
              </Text>
            </View>
          </>
        ) : (
          <LinearGradient colors={['#FDF6F4', '#FFF0ED']} style={styles.placeholderContainer}>
            <Ionicons name="heart-outline" size={44} color="#F05A28" style={{ marginBottom: 16, opacity: 0.8 }} />
            <Text style={styles.placeholderTitle}>Memories will be created soon</Text>
            <Text style={styles.placeholderSub}>Capture your first special moment together in the Calendar tab.</Text>
          </LinearGradient>
        )}
      </Pressable>
    </Pressable>
  ), [
    loadingMemories,
    modalMetrics.tabBarHeight,
    modalMetrics.leftOffset,
    modalMetrics.rightOffset,
    modalMetrics.topOffset,
    onShareMemory,
    randomImage,
    randomMemory,
    screenHeight,
    sharingMemory,
  ]);

  const renderTabBar = useCallback((props: React.ComponentProps<typeof CustomTabBar>) => {
    const handleCenterPress = () => {
      if (modalVisible) {
        refreshRandomMemory();
        return;
      }
      setModalVisible(true);
    };

    return (
      <CustomTabBar
        {...props}
        onCenterPress={handleCenterPress}
        centerActive={modalVisible}
        centerOverlay={modalVisible ? renderCenterOverlay() : null}
      />
    );
  }, [modalVisible, refreshRandomMemory, renderCenterOverlay]);

  if (isHydrating && !apiUser && !sessionReady) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color={SmittenColors.accent} />
      </View>
    );
  }

  if (signedOut || isSigningOut) {
    return null;
  }

  if (sessionReady && !apiUser) {
    return null;
  }

  if (sessionReady && apiUser && !canAccessApp(apiUser)) {
    return <Redirect href="/auth/payment" />;
  }

  return (
    <>
      <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="center" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="memories" options={{ href: null }} />
        <Tabs.Screen name="diary" options={{ href: null }} />
        <Tabs.Screen name="buzz" options={{ href: null }} />
        <Tabs.Screen name="vault" options={{ href: null }} />
        <Tabs.Screen name="profile" />
      </Tabs>

    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
  },
  tabBarSurface: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0d9df',
    shadowColor: '#7a2a45',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 12,
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  activeTabBarInner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 30,
  },
  homeTabBarInner: {
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    minWidth: 0,
  },
  tabLabel: {
    width: '100%',
    marginTop: 4,
    color: '#c8b9c0',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    textAlign: 'center',
    flexShrink: 1,
  },
  centerButtonWrapper: {
    top: -19,
    justifyContent: 'center',
    alignItems: 'center',
    width: 68,
  },
  centerButtonRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#fff5f6',
  },
  centerButtonImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  centerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 0, 5, 0.82)',
  },
  memoryCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D0005',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  closeCardBtn: {
    position: 'absolute',
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  shareImageBtn: {
    position: 'absolute',
    right: 12,
    bottom: 18,
    zIndex: 10,
    elevation: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  memoryInfo: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    right: 76,
    zIndex: 5,
    elevation: 8,
  },
  memoryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  memoryDesc: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shareBadge: {
    position: 'absolute',
    left: 14,
    zIndex: 3,
    elevation: 6,
  },
  shareBadgeLogo: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  shareButton: {
    position: 'absolute',
    right: 0,
    top: 2,
    zIndex: 4,
    elevation: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
    zIndex: 2,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  placeholderTitle: {
    color: '#2C1A1D',
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholderSub: {
    color: '#8A7678',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  glassCard: {
    position: 'absolute',
    bottom: 18,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(26, 26, 26, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 3,
    elevation: 5,
  },
  glassCardTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  statVal: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 8,
    marginTop: 2,
    fontWeight: '500',
  },
  statSep: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  closeModalBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 30,
  },
  modalControlRow: {
    height: 58,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    zIndex: 40,
    elevation: 24,
  },
});
