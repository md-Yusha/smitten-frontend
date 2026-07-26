import { UnMeColors } from '@/constants/smittenTheme';
import { smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { coupleApi, type LovePing } from '@/src/services/coupleApi';
import { getPartnerChatLabel, useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BUZZES = [
  { id: 'love', label: 'Love', image: require('../../assets/images/love.png'), color: '#e45878', background: '#fde9ee' },
  { id: 'anger', label: 'Anger', image: require('../../assets/images/anger.png'), color: '#dd5a55', background: '#fceceb' },
  { id: 'hug', label: 'Hug', image: require('../../assets/images/hug.png'), color: '#9274d8', background: '#eee9fb' },
  { id: 'please', label: 'Please', image: require('../../assets/images/please.png'), color: '#e0a23c', background: '#fff2ce' },
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
  const scrollRef = useRef<ScrollView>(null);

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
    }, [loadHistory]),
  );

  const active = useMemo(() => BUZZES.find((item) => item.id === selected) ?? BUZZES[0], [selected]);
  const partner = getPartnerChatLabel(user);
  const bottomSpace = (Platform.OS === 'ios' ? 92 : 82) + insets.bottom;

  const send = async () => {
    setSending(true);
    try {
      await coupleApi.sendLove(selected);
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
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={22} color={UnMeColors.txDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buzz</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <View style={[styles.heroCircle, { backgroundColor: active.background, shadowColor: active.color }]}>
          <Image source={active.image} style={styles.heroImage} contentFit="contain" />
        </View>
        <Text style={styles.title}>Tap to send a Buzz</Text>
        <Text style={styles.subtitle}>Send {partner} a small nudge to let them know they are on your mind.</Text>

        <View style={styles.options}>
          {BUZZES.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelected(item.id)}
              style={[styles.option, selected === item.id && { borderColor: item.color, backgroundColor: item.background }]}
            >
              <Image source={item.image} style={styles.optionImage} contentFit="contain" />
              <Text style={[styles.optionText, selected === item.id && { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
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
          history.map((item) => {
            const theme = BUZZES.find((buzz) => buzz.id === item.kind) ?? BUZZES[0];
            const sent = item.direction === 'sent';
            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={[styles.historyIcon, { backgroundColor: theme.background }]}>
                  <Image source={theme.image} style={styles.historyImage} contentFit="contain" />
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
  content: { paddingHorizontal: 28, alignItems: 'stretch' },
  heroCircle: { width: 132, height: 132, borderRadius: 66, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 6, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 7 },
  heroImage: { width: 102, height: 102 },
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
});
