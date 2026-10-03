import { SmittenColors, UnMeColors } from '@/constants/smittenTheme';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { completeOnboarding } from '@/src/services/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Slide = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  illustrationColor: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    key: 'memories',
    icon: 'images-outline',
    iconColor: '#e96887',
    illustrationColor: '#f5f5f4',
    title: 'Keep every memory close',
    description:
      "Save your favourite photos, moments and milestones in one shared space that's just for the two of you.",
  },
  {
    key: 'chat',
    icon: 'chatbubble-outline',
    iconColor: '#9f86e8',
    illustrationColor: '#e8e0fa',
    title: 'Talk, anytime you want',
    description:
      'A private space for the two of you to chat, share your day and stay close no matter the distance.',
  },
  {
    key: 'closer',
    icon: 'heart-outline',
    iconColor: '#eda64e',
    illustrationColor: '#fce7c8',
    title: 'Grow closer, every day',
    description:
      'Plan dates, build a bucket list, journal your story and unwind together with a couple of playful games.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const copyWidth = Math.max(0, Math.min(360, width - 48));
  const listRef = useRef<FlatList<Slide>>(null);
  const finishingRef = useRef(false);
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    let navigationStarted = false;
    try {
      await completeOnboarding();
      router.replace('/');
      navigationStarted = true;
    } finally {
      if (!navigationStarted) {
        finishingRef.current = false;
        setFinishing(false);
      }
    }
  }, [router]);

  const next = useCallback(() => {
    if (page === SLIDES.length - 1) {
      void finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: page + 1, animated: true });
    setPage((current) => Math.min(current + 1, SLIDES.length - 1));
  }, [finish, page]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setPage(Math.max(0, Math.min(SLIDES.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
    },
    [width],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {page < SLIDES.length - 1 ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          onPress={() => void finish()}
          disabled={finishing}
          style={[styles.skip, { top: insets.top + 14 }]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, paddingTop: insets.top + 72 }]}>
            <View style={[styles.illustration, { backgroundColor: item.illustrationColor }]}>
              <Ionicons name={item.icon} size={56} color={item.iconColor} />
            </View>

            <View style={[styles.copy, { width: copyWidth }]}>
              <Text
                style={styles.title}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.88}
              >
                {item.title}
              </Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${SLIDES.length}`}>
          {SLIDES.map((slide, index) => (
            <View key={slide.key} style={[styles.dot, index === page && styles.activeDot]} />
          ))}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={next}
          activeOpacity={0.88}
          disabled={finishing}
          style={[styles.button, finishing && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{page === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skip: {
    position: 'absolute',
    right: 22,
    zIndex: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipText: {
    color: '#92889a',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
  },
  illustration: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 34,
  },
  copy: {
    alignItems: 'center',
  },
  title: {
    width: '100%',
    paddingHorizontal: 10,
    color: UnMeColors.txDark,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 29,
    lineHeight: 37,
    textAlign: 'center',
  },
  description: {
    width: '100%',
    flexShrink: 1,
    marginTop: 14,
    paddingHorizontal: 12,
    color: '#92889a',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dots: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ead7dc',
  },
  activeDot: {
    width: 22,
    backgroundColor: SmittenColors.accentBrand,
  },
  button: {
    ...smittenGlassButton,
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
});
