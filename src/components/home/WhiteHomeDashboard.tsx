import { UnMeColors } from '@/constants/smittenTheme';
import { AuthedMediaImage } from '@/src/components/media/AuthedMediaImage';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { AvatarPreviewModal } from '@/src/components/ui/AvatarPreviewModal';
import type { ApiMemory } from '@/src/services/memoriesApi';
import { resolveApiMediaUrl } from '@/src/services/mediaUrl';
import type { SpecialMomentPreview } from '@/src/services/specialMoments';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  { id: 'vault', label: 'Vault', sub: 'Private & secure', icon: 'lock-closed-outline', background: '#e9dff7', accent: '#a68ae1' },
  { id: 'games', label: 'Couple Games', sub: 'Play & connect', icon: 'game-controller-outline', background: '#fde4c8', accent: '#f1aa64' },
  { id: 'buzz', label: 'Buzz', sub: 'Send a little nudge', icon: 'flash-outline', background: '#fff1c5', accent: '#e7bc42' },
];

function togetherDays(value: string | null | undefined) {
  if (!value) return 0;
  const start = Date.parse(value);
  return Number.isFinite(start) ? Math.max(0, Math.floor((Date.now() - start) / 86_400_000)) : 0;
}

function isFutureMemory(memory: ApiMemory) {
  const parts = memory.memoryAt.slice(0, 10).split('-').map(Number);
  const date = parts.length === 3 && parts.every(Number.isFinite)
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(memory.memoryAt);
  const now = new Date();
  return Number.isFinite(date.getTime()) && date > new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

function memoryMediaVersion(memory: ApiMemory) {
  return String(Date.parse(memory.updatedAt) || memory.updatedAt || memory.id).replace(/[^a-zA-Z0-9]/g, '');
}

function memoryMediaUri(memory: ApiMemory | null) {
  if (!memory) return null;
  const uri = resolveApiMediaUrl(memory.imageUrl);
  if (!uri) return null;
  return `${uri}${uri.includes('?') ? '&' : '?'}v=${encodeURIComponent(memory.updatedAt)}`;
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
  memories,
  upcoming,
  onTile,
  onViewMemories,
  onOpenCalendar,
  onOpenSelfProfile,
}: {
  topInset: number;
  bottomInset: number;
  selfName: string;
  partnerName: string;
  selfAvatar: string;
  partnerAvatar: string;
  partnerMood?: string | null;
  togetherSince: string | null | undefined;
  memories: ApiMemory[];
  upcoming: SpecialMomentPreview[];
  onTile: (id: TileId) => void;
  onViewMemories: () => void;
  onOpenCalendar: () => void;
  onOpenSelfProfile: () => void;
}) {
  const footerSpace = (Platform.OS === 'ios' ? 92 : 82) + bottomInset;
  const dashboardScrollRef = useRef<ScrollView>(null);
  const carouselRef = useRef<ScrollView>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeMemoryIndex, setActiveMemoryIndex] = useState(0);
  const [partnerPreviewVisible, setPartnerPreviewVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => dashboardScrollRef.current?.scrollTo({ y: 0, animated: false }));
    }, []),
  );
  const carouselMemories = useMemo<(ApiMemory | null)[]>(() => {
    const withImages = memories.filter((memory) => !isFutureMemory(memory) && memory.mediaType === 'image' && Boolean(memory.imageUrl));
    for (let index = withImages.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [withImages[index], withImages[randomIndex]] = [withImages[randomIndex], withImages[index]];
    }
    return withImages.length ? withImages.slice(0, 5) : [null];
  }, [memories]);

  useEffect(() => {
    setActiveMemoryIndex(0);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [carouselMemories.length]);

  useEffect(() => {
    if (carouselMemories.length <= 1 || carouselWidth <= 0) return;
    const timer = setInterval(() => {
      setActiveMemoryIndex((current) => {
        const next = (current + 1) % carouselMemories.length;
        carouselRef.current?.scrollTo({ x: next * carouselWidth, animated: true });
        return next;
      });
    }, 10_000);
    return () => clearInterval(timer);
  }, [carouselMemories.length, carouselWidth]);

  const handleCarouselEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselWidth <= 0) return;
    const next = Math.max(0, Math.min(carouselMemories.length - 1, Math.round(event.nativeEvent.contentOffset.x / carouselWidth)));
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
          <Text style={styles.personName} numberOfLines={1}>{partnerName}</Text>
        </TouchableOpacity>
        <View style={styles.brand}>
          {partnerMood ? (
            <View style={styles.moodBubble}>
              <Text style={styles.moodBubbleText} numberOfLines={1}>{partnerMood}</Text>
            </View>
          ) : null}
          <Text style={styles.brandName}>Smittenz</Text>
          <Text style={styles.brandEyebrow}>OUR JOURNEY</Text>
          <Text style={styles.days}>{togetherDays(togetherSince)} days together</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={onOpenSelfProfile} style={styles.person}>
          <UserAvatar uri={selfAvatar} size={48} borderColor="#fff" />
          <Text style={styles.personName} numberOfLines={1}>{selfName}</Text>
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
            {carouselMemories.map((memory, index) => {
              const uri = memoryMediaUri(memory);
              const version = memory ? memoryMediaVersion(memory) : String(index);
              return (
                <View key={memory?.id ?? 'empty-memory'} style={[styles.featureSlide, { width: carouselWidth }]}> 
                  {uri ? (
                    <AuthedMediaImage
                      uri={uri}
                      recyclingKey={`home-memory-${memory?.id ?? index}-${version}`}
                      mediaCacheKey={`home-memory-${memory?.id ?? index}-${version}`}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={[StyleSheet.absoluteFill, styles.featureTint]} />
                  <Text style={styles.featureTitle}>{memory?.title ?? 'Your story, together'} <Text style={styles.miniHeart}>♥</Text></Text>
                  <Text style={styles.featureText} numberOfLines={2}>{memory?.description || 'Save the little moments that become your favourite memories.'}</Text>
                  <TouchableOpacity activeOpacity={0.86} onPress={onViewMemories} style={styles.featureButton}>
                    <Text style={styles.featureButtonText}>View memories</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
      <View style={styles.carouselDots}>
        {carouselMemories.map((memory, index) => (
          <TouchableOpacity
            key={`dot-${memory?.id ?? index}`}
            onPress={() => {
              setActiveMemoryIndex(index);
              carouselRef.current?.scrollTo({ x: index * carouselWidth, animated: true });
            }}
            style={[styles.carouselDot, activeMemoryIndex === index && styles.carouselDotActive]}
          />
        ))}
      </View>

      <View style={styles.tiles}>
        {TILES.map((tile) => (
          <TouchableOpacity key={tile.id} activeOpacity={0.86} onPress={() => onTile(tile.id)} style={[styles.tile, { backgroundColor: tile.background }]}>
            <View style={[styles.tileIcon, { backgroundColor: tile.accent }]}>
              <Ionicons name={tile.icon} size={21} color="#fff" />
            </View>
            <Text style={styles.tileTitle}>{tile.label}</Text>
            <Text style={styles.tileSub}>{tile.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <TouchableOpacity onPress={onOpenCalendar} style={styles.seeAll}>
          <Text style={styles.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color="#9f7f8d" />
        </TouchableOpacity>
      </View>

      {upcoming.length ? upcoming.slice(0, 2).map((item) => (
        <TouchableOpacity key={item.id} activeOpacity={0.85} onPress={onOpenCalendar} style={styles.upcomingCard}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateMonth}>{upcomingDateParts(item).month}</Text>
            <Text style={styles.dateDay}>{upcomingDateParts(item).day}</Text>
          </View>
          <View style={styles.upcomingCopy}>
            <Text style={styles.upcomingTitle}>{item.title}</Text>
            <Text style={styles.upcomingTime}>{item.daysLeft === 0 ? 'Today' : `${item.daysLeft} days away`}</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color="#d4bec7" />
        </TouchableOpacity>
      )) : (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20 },
  journeyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  person: { width: 62, alignItems: 'center' },
  personName: { width: 70, marginTop: 4, color: '#9b8792', fontFamily: 'Inter_500Medium', fontSize: 9, textAlign: 'center' },
  brand: { flex: 1, alignItems: 'center', paddingTop: 24 },
  moodBubble: { maxWidth: 150, minHeight: 28, justifyContent: 'center', borderRadius: 16, paddingHorizontal: 13, marginTop: -5, marginBottom: 5, backgroundColor: '#fff0d8', shadowColor: '#7c5823', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 7, elevation: 2 },
  moodBubbleText: { color: '#946326', fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'center' },
  brandName: { color: '#cf244f', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25 },
  brandEyebrow: { marginTop: 2, color: '#a8949e', fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 2 },
  days: { marginTop: 2, color: '#dd5576', fontFamily: 'Inter_700Bold', fontSize: 12 },
  featureCard: { height: 220, overflow: 'hidden', borderRadius: 22, backgroundColor: '#bb7643' },
  featureSlide: { height: 220, overflow: 'hidden', padding: 20, backgroundColor: '#bb7643' },
  featureTint: { backgroundColor: 'rgba(83,34,20,0.38)' },
  featureTitle: { maxWidth: '80%', color: '#fff', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22 },
  miniHeart: { color: '#ee7c94', fontSize: 13 },
  featureText: { maxWidth: '72%', marginTop: 4, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  featureButton: { position: 'absolute', left: 18, bottom: 18, justifyContent: 'center', minHeight: 36, borderRadius: 18, paddingHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.88)' },
  featureButtonText: { color: '#604132', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  carouselDots: { height: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  carouselDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#efd7dd' },
  carouselDotActive: { width: 20, backgroundColor: '#e56582' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '31.5%', minHeight: 142, alignItems: 'center', borderRadius: 20, paddingHorizontal: 8, paddingTop: 14, paddingBottom: 10 },
  tileIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { minHeight: 36, marginTop: 10, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 14, textAlign: 'center' },
  tileSub: { color: '#a38f99', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  seeAll: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { color: '#9f7f8d', fontFamily: 'Inter_500Medium', fontSize: 12 },
  upcomingCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#efe1e5', borderRadius: 18, paddingHorizontal: 11, marginBottom: 9, backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  dateBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee5e8' },
  dateMonth: { color: '#d85f78', fontFamily: 'Inter_600SemiBold', fontSize: 8 },
  dateDay: { marginTop: 2, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18 },
  upcomingCopy: { flex: 1, paddingHorizontal: 12 },
  upcomingTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15 },
  upcomingTime: { marginTop: 3, color: '#b19ca6', fontFamily: 'Inter_400Regular', fontSize: 10 },
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
