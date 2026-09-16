import { UnMeColors } from '@/constants/smittenTheme';
import { ImageCropModal } from '@/src/components/media/ImageCropModal';
import { AvatarPreviewModal } from '@/src/components/ui/AvatarPreviewModal';
import { SmittenLogo } from '@/src/components/ui/SmittenLogo';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { HOME_CAROUSEL_SLOTS, loadHomeCarouselImages, saveHomeCarouselImage, type HomeCarouselImages } from '@/src/services/homeCarouselStorage';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import type { SpecialMomentPreview } from '@/src/services/specialMoments';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TileId = 'memories' | 'chat' | 'diary' | 'vault' | 'games' | 'buzz';

const TILES: {
  id: TileId;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  accent: string;
}[] = [
  { id: 'memories', label: 'Memories', sub: 'Relive our moments', icon: 'images-outline', background: '#fbdde3', accent: '#ed7892' },
  { id: 'chat', label: 'Chat', sub: 'Talk with each other', icon: 'chatbubble-outline', background: '#e8ddfb', accent: '#a58ae9' },
  { id: 'diary', label: 'My Diary', sub: 'Thoughts & feelings', icon: 'journal-outline', background: '#dceafb', accent: '#83b3ed' },
  { id: 'vault', label: 'Vault', sub: 'Private & secure', icon: 'lock-closed-outline', background: '#d4f0e8', accent: '#4db8a0' },
  { id: 'games', label: 'Couple Games', sub: 'Play & connect', icon: 'game-controller-outline', background: '#fde4c8', accent: '#f1aa64' },
  { id: 'buzz', label: 'Buzz', sub: 'Send a little nudge', icon: 'flash-outline', background: '#fff1c5', accent: '#e7bc42' },
];

function togetherDays(value: string | null | undefined) {
  if (!value) return 0;
  const start = Date.parse(value);
  return Number.isFinite(start) ? Math.max(0, Math.floor((Date.now() - start) / 86_400_000)) : 0;
}

function upcomingDateParts(item: SpecialMomentPreview) {
  if (!item.dateIso) return { month: item.daysLeft === 0 ? 'TODAY' : 'IN', day: String(item.daysLeft) };
  const [year, month, day] = item.dateIso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  };
}

const UPCOMING_PALETTES = [
  {
    accent: '#7664D8',
    soft: '#F0EDFF',
    iconBackground: '#FFE6A8',
    iconColor: '#A66B00',
  },
  {
    accent: '#27877F',
    soft: '#E5F5F1',
    iconBackground: '#FFDCD5',
    iconColor: '#C4564D',
  },
] as const;

function upcomingEventIcon(item: SpecialMomentPreview): keyof typeof Ionicons.glyphMap {
  const value = `${item.id} ${item.title}`.toLowerCase();
  if (value.includes('birthday')) return 'gift-outline';
  if (value.includes('anniversary')) return 'heart-outline';
  return 'sparkles-outline';
}

function upcomingEventLabel(item: SpecialMomentPreview) {
  const value = `${item.id} ${item.title}`.toLowerCase();
  if (value.includes('birthday')) return 'Birthday countdown';
  if (value.includes('anniversary')) return 'Anniversary';
  return 'A special day';
}

export function WhiteHomeDashboard({
  topInset,
  bottomInset,
  selfName,
  partnerName,
  selfAvatar,
  partnerAvatar,
  partnerMood,
  togetherSince,
  upcoming,
  onTile,
  onOpenCalendar,
  onOpenSelfProfile,
  unreadChatCount,
  unreadMemoryCount,
  unreadDiaryCount,
  unreadVaultCount,
  unreadGameCount,
  unreadBuzzCount,
  carouselOwnerId,
}: {
  topInset: number;
  bottomInset: number;
  selfName: string;
  partnerName: string;
  selfAvatar: string;
  partnerAvatar: string;
  partnerMood?: string | null;
  togetherSince: string | null | undefined;
  upcoming: SpecialMomentPreview[];
  onTile: (id: TileId) => void;
  onOpenCalendar: () => void;
  onOpenSelfProfile: () => void;
  unreadChatCount: number;
  unreadMemoryCount: number;
  unreadDiaryCount: number;
  unreadVaultCount: number;
  unreadGameCount: number;
  unreadBuzzCount: number;
  carouselOwnerId: string;
}) {
  const footerSpace = (Platform.OS === 'ios' ? 92 : 82) + bottomInset;
  const dashboardScrollRef = useRef<ScrollView>(null);
  const carouselRef = useRef<ScrollView>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeMemoryIndex, setActiveMemoryIndex] = useState(0);
  const [carouselImages, setCarouselImages] = useState<HomeCarouselImages>([null, null, null]);
  const [partnerPreviewVisible, setPartnerPreviewVisible] = useState(false);
  const [cropJob, setCropJob] = useState<{ uri: string; slot: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => dashboardScrollRef.current?.scrollTo({ y: 0, animated: false }));
      void loadHomeCarouselImages(carouselOwnerId).then(setCarouselImages);
    }, [carouselOwnerId]),
  );

  useEffect(() => {
    setActiveMemoryIndex(0);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [carouselImages.length]);

  useEffect(() => {
    if (carouselWidth <= 0) return;
    const timer = setInterval(() => {
      setActiveMemoryIndex((current) => {
        const next = (current + 1) % HOME_CAROUSEL_SLOTS;
        carouselRef.current?.scrollTo({ x: next * carouselWidth, animated: true });
        return next;
      });
    }, 10_000);
    return () => clearInterval(timer);
  }, [carouselWidth]);

  const uploadCarouselImage = useCallback(async (slot: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    useAppLockStore.getState().setSystemOverlayActive(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      setCropJob({ uri: result.assets[0].uri, slot });
    } finally {
      useAppLockStore.getState().setSystemOverlayActive(false);
    }
  }, [carouselOwnerId]);

  const handleCarouselEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselWidth <= 0) return;
    const next = Math.max(0, Math.min(HOME_CAROUSEL_SLOTS - 1, Math.round(event.nativeEvent.contentOffset.x / carouselWidth)));
    setActiveMemoryIndex(next);
  };

  return (
    <ScrollView
      ref={dashboardScrollRef}
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      bounces={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(topInset - 12, 30), paddingBottom: footerSpace },
      ]}
    >
      <View style={styles.journeyHeader}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setPartnerPreviewVisible(true)} style={styles.person}>
          <UserAvatar uri={partnerAvatar} size={48} borderColor="#fff" />
          <Text style={styles.personName} numberOfLines={1}>{partnerName.slice(0, 10)}</Text>
        </TouchableOpacity>
        <View style={styles.brand}>
          {partnerMood ? (
            <View style={styles.moodBubble}>
              <Text style={styles.moodBubbleText} numberOfLines={1}>{partnerMood}</Text>
            </View>
          ) : null}
          <SmittenLogo width={128} height={42} style={styles.brandLogo} />
          <Text style={styles.brandEyebrow}>OUR JOURNEY</Text>
          <Text style={styles.days}>{togetherDays(togetherSince)} days together</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={onOpenSelfProfile} style={styles.person}>
          <UserAvatar uri={selfAvatar} size={48} borderColor="#fff" />
          <Text style={styles.personName} numberOfLines={1}>{selfName.slice(0, 10)}</Text>
        </TouchableOpacity>
      </View>

      <View
        style={styles.featureCard}
        onLayout={(event) => setCarouselWidth(Math.round(event.nativeEvent.layout.width))}
      >
        {carouselWidth > 0 ? (
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={handleCarouselEnd}
          >
            {carouselImages.map((uri, index) => (
              uri ? (
                <View key={`carousel-slot-${index}`} style={[styles.featureSlide, { width: carouselWidth }]}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                </View>
              ) : (
                <TouchableOpacity
                  key={`carousel-slot-${index}`}
                  activeOpacity={0.85}
                  onPress={() => void uploadCarouselImage(index)}
                  style={[styles.featureSlide, styles.carouselEmptySlide, { width: carouselWidth }]}
                >
                  <View style={styles.carouselUploadButton}>
                    <Ionicons name="add" size={30} color={UnMeColors.txDark} />
                    <Text style={styles.carouselUploadText}>Add image</Text>
                  </View>
                </TouchableOpacity>
              )
            ))}
          </ScrollView>
        ) : null}
      </View>
      <View style={styles.carouselDots}>
        {carouselImages.map((_uri, index) => (
          <TouchableOpacity
            key={`dot-${index}`}
            onPress={() => {
              setActiveMemoryIndex(index);
              carouselRef.current?.scrollTo({ x: index * carouselWidth, animated: true });
            }}
            style={[styles.carouselDot, activeMemoryIndex === index && styles.carouselDotActive]}
          />
        ))}
      </View>

      <View style={styles.tiles}>
        {TILES.map((tile) => {
          const hasUnread =
            (tile.id === 'chat' && unreadChatCount > 0) ||
            (tile.id === 'memories' && unreadMemoryCount > 0) ||
            (tile.id === 'diary' && unreadDiaryCount > 0) ||
            (tile.id === 'vault' && unreadVaultCount > 0) ||
            (tile.id === 'games' && unreadGameCount > 0) ||
            (tile.id === 'buzz' && unreadBuzzCount > 0);

          return (
            <TouchableOpacity key={tile.id} activeOpacity={0.86} onPress={() => onTile(tile.id)} style={styles.tile}>
              <View style={styles.tileIconWrap}>
                <View style={[styles.tileIcon, { backgroundColor: tile.accent }]}>
                  <Ionicons name={tile.icon} size={21} color="#fff" />
                </View>
              </View>
              {hasUnread ? <View style={styles.tileUnreadDot} /> : null}
              <Text style={styles.tileTitle}>{tile.label}</Text>
              <Text style={styles.tileSub}>{tile.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <TouchableOpacity onPress={onOpenCalendar} style={styles.seeAll}>
          <Text style={styles.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color="#9f7f8d" />
        </TouchableOpacity>
      </View>

      {upcoming.length ? upcoming.slice(0, 2).map((item, index) => {
        const date = upcomingDateParts(item);
        const palette = UPCOMING_PALETTES[index % UPCOMING_PALETTES.length];
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={onOpenCalendar}
            style={[styles.upcomingCard, { borderLeftColor: palette.accent }]}
          >
            <View style={[styles.dateBadge, { backgroundColor: palette.soft }]}>
              <Text style={[styles.dateMonth, { color: palette.accent }]}>{date.month}</Text>
              <Text style={styles.dateDay}>{date.day}</Text>
              <View style={[styles.eventIcon, { backgroundColor: palette.iconBackground }]}>
                <Ionicons
                  name={upcomingEventIcon(item)}
                  size={13}
                  color={palette.iconColor}
                />
              </View>
            </View>
            <View style={styles.upcomingCopy}>
              <Text numberOfLines={1} style={styles.upcomingTitle}>{item.title}</Text>
              <Text style={styles.upcomingType}>{upcomingEventLabel(item)}</Text>
            </View>
            <View style={styles.countdown}>
              {item.daysLeft === 0 ? (
                <Ionicons name="heart" size={19} color={palette.accent} />
              ) : (
                <Text style={[styles.countdownNumber, { color: palette.accent }]}>
                  {item.daysLeft}
                </Text>
              )}
              <Text style={styles.countdownLabel}>
                {item.daysLeft === 0 ? 'TODAY' : item.daysLeft === 1 ? 'DAY' : 'DAYS'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C8BBC1" />
          </TouchableOpacity>
        );
      }) : (
        <TouchableOpacity activeOpacity={0.85} onPress={onOpenCalendar} style={styles.emptyUpcoming}>
          <Ionicons name="calendar-outline" size={22} color="#df6a86" />
          <Text style={styles.emptyUpcomingText}>Add your next date or special moment</Text>
        </TouchableOpacity>
      )}

      <View style={styles.adSlot}>
        <View style={styles.adIcon}><Ionicons name="gift-outline" size={20} color="#de6a82" /></View>
        <View style={styles.adCopy}>
          <Text style={styles.sponsored}>OFFERS</Text>
          <Text style={styles.adTitle}>Offers coming soon!</Text>
        </View>
        <Ionicons name="heart-outline" size={18} color="#e8b8c3" />
      </View>
      <AvatarPreviewModal visible={partnerPreviewVisible} uri={partnerAvatar} name={partnerName} onClose={() => setPartnerPreviewVisible(false)} />
      <ImageCropModal
        visible={!!cropJob}
        uri={cropJob?.uri ?? null}
        aspectRatio={16 / 9}
        onCancel={() => setCropJob(null)}
        onDone={(uri) => {
          const job = cropJob;
          setCropJob(null);
          if (!job) return;
          void saveHomeCarouselImage(carouselOwnerId, job.slot, uri).then((savedUri) => {
            setCarouselImages((current) => {
              const next = [...current] as HomeCarouselImages;
              next[job.slot] = savedUri;
              return next;
            });
          });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20 },
  journeyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  person: { width: 62, alignItems: 'center' },
  personName: { width: 70, marginTop: 4, color: '#9b8792', fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'center' },
  brand: { flex: 1, alignItems: 'center', paddingTop: 24 },
  moodBubble: { maxWidth: 150, minHeight: 28, justifyContent: 'center', borderRadius: 16, paddingHorizontal: 13, marginTop: -5, marginBottom: 5, backgroundColor: '#fff0d8', shadowColor: '#7c5823', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 7, elevation: 2 },
  moodBubbleText: { color: '#946326', fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'center' },
  brandLogo: { marginTop: -2, marginBottom: -1 },
  brandEyebrow: { marginTop: 2, color: '#a8949e', fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 2 },
  days: { marginTop: 2, color: '#dd5576', fontFamily: 'Inter_700Bold', fontSize: 12 },
  featureCard: { height: 220, overflow: 'hidden', borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee5e8' },
  featureSlide: { height: 220, overflow: 'hidden', padding: 20, backgroundColor: '#fff' },
  carouselEmptySlide: { backgroundColor: '#fff' },
  carouselUploadButton: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  carouselUploadText: { marginTop: 7, color: UnMeColors.txDark, fontFamily: 'Inter_700Bold', fontSize: 12 },
  featureTitle: { maxWidth: '80%', color: '#fff', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22 },
  miniHeart: { color: '#ee7c94', fontSize: 13 },
  featureText: { maxWidth: '72%', marginTop: 4, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  featureButton: { position: 'absolute', left: 18, bottom: 18, justifyContent: 'center', minHeight: 36, borderRadius: 18, paddingHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.88)' },
  featureButtonText: { color: '#604132', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  carouselDots: { height: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  carouselDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ded7da' },
  carouselDotActive: { width: 20, backgroundColor: '#e56582' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { position: 'relative', width: '31.5%', minHeight: 142, alignItems: 'center', borderRadius: 20, paddingHorizontal: 8, paddingTop: 14, paddingBottom: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee5e8' },
  tileIconWrap: { position: 'relative' },
  tileIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tileUnreadDot: { position: 'absolute', top: 9, right: 9, width: 16, height: 16, borderRadius: 8, backgroundColor: '#BC142B', borderWidth: 3, borderColor: '#fff' },
  tileTitle: { minHeight: 36, marginTop: 10, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 14, textAlign: 'center' },
  tileSub: { color: '#a38f99', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  seeAll: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { color: '#9f7f8d', fontFamily: 'Inter_500Medium', fontSize: 12 },
  upcomingCard: { minHeight: 84, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 4, borderColor: '#ebe5e7', borderRadius: 16, paddingLeft: 10, paddingRight: 9, marginBottom: 10, backgroundColor: '#fff', shadowColor: '#38242c', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  dateBadge: { width: 54, height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { fontFamily: 'Inter_700Bold', fontSize: 8 },
  dateDay: { marginTop: 1, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 21 },
  eventIcon: { position: 'absolute', right: -6, bottom: -5, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  upcomingCopy: { flex: 1, minWidth: 0, paddingLeft: 15, paddingRight: 6 },
  upcomingTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15 },
  upcomingType: { marginTop: 4, color: '#9E8D95', fontFamily: 'Inter_500Medium', fontSize: 9 },
  countdown: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E8E0E3' },
  countdownNumber: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  countdownLabel: { marginTop: 2, color: '#9D8E95', fontFamily: 'Inter_700Bold', fontSize: 7 },
  emptyUpcoming: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: '#efd4da', borderRadius: 18 },
  emptyUpcomingText: { color: '#9f8792', fontFamily: 'Inter_500Medium', fontSize: 12 },
  adSlot: { minHeight: 118, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#edcfd6', borderRadius: 18, paddingHorizontal: 14, marginTop: 20, backgroundColor: '#fffdf9' },
  adIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee8db' },
  adCopy: { flex: 1, paddingHorizontal: 12 },
  sponsored: { color: '#c9aeb8', fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 1 },
  adTitle: { marginTop: 4, color: UnMeColors.txDark, fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 16 },
  adDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  adDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ecd9df' },
  adDotActive: { width: 14, backgroundColor: '#e56582' },
});
