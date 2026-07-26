import { UnMeColors } from '@/constants/smittenTheme';
import { MonthYearPicker } from '@/src/components/calendar/MonthYearPicker';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { memoriesApi, type ApiMemory } from '@/src/services/memoriesApi';
import { specialMomentsApi, type ApiSpecialMoment } from '@/src/services/specialMomentsApi';
import { useCoupleContentStore } from '@/src/store/coupleContentStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ART_COLORS = ['#75513c', '#62b8c1', '#e2aa5f', '#9d80d6', '#de7f96'];

type CalendarUpcomingItem = {
  id: string;
  sourceId: string;
  title: string;
  nextDate: Date;
  kind: 'special' | 'memory' | 'birthday';
};

function localIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextOccurrence(value: string, now = new Date()) {
  const dateOnly = value.slice(0, 10).split('-').map(Number);
  const source = dateOnly.length === 3 && dateOnly.every(Number.isFinite)
    ? new Date(dateOnly[0], dateOnly[1] - 1, dateOnly[2])
    : new Date(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), source.getMonth(), source.getDate());
  if (next < today) next = new Date(now.getFullYear() + 1, source.getMonth(), source.getDate());
  return next;
}

export function WhiteCalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const apiUser = useAuthStore((state) => state.apiUser);
  const [moments, setMoments] = useState<ApiSpecialMoment[]>([]);
  const [memories, setMemories] = useState<ApiMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [shownMonth, setShownMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarUpcomingItem | null>(null);

  const load = useCallback(async () => {
    try {
      const [momentResult, memoryResult] = await Promise.allSettled([specialMomentsApi.list(), memoriesApi.list()]);
      if (momentResult.status === 'fulfilled') setMoments(momentResult.value.moments);
      if (memoryResult.status === 'fulfilled') setMemories(memoryResult.value.memories);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const calendarMoments = useMemo<ApiSpecialMoment[]>(() => {
    const birthdays: ApiSpecialMoment[] = [];
    if (apiUser?.dateOfBirth) birthdays.push({ id: `birthday-${apiUser.id}`, title: `${apiUser.name}'s Birthday`, momentAt: apiUser.dateOfBirth, creatorId: apiUser.id, creatorName: apiUser.name, createdAt: apiUser.dateOfBirth, canManage: false });
    if (apiUser?.partner?.dateOfBirth) birthdays.push({ id: `birthday-${apiUser.partner.id}`, title: `${apiUser.partner.name}'s Birthday`, momentAt: apiUser.partner.dateOfBirth, creatorId: apiUser.partner.id, creatorName: apiUser.partner.name, createdAt: apiUser.partner.dateOfBirth, canManage: false });
    return [...moments, ...birthdays];
  }, [apiUser, moments]);

  const upcoming = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const calendarDates: CalendarUpcomingItem[] = calendarMoments.map((moment) => ({
      id: moment.id,
      sourceId: moment.id,
      title: moment.title,
      nextDate: nextOccurrence(moment.momentAt),
      kind: moment.id.startsWith('birthday-') ? 'birthday' : 'special',
    }));
    const futureMemories = memories.flatMap((memory) => {
      const parts = memory.memoryAt.slice(0, 10).split('-').map(Number);
      const date = parts.length === 3 && parts.every(Number.isFinite) ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(memory.memoryAt);
      return Number.isFinite(date.getTime()) && date > start
        ? [{ id: `future-memory-${memory.id}`, sourceId: memory.id, title: memory.title, nextDate: date, kind: 'memory' as const }]
        : [];
    });
    return [...calendarDates, ...futureMemories].sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [calendarMoments, memories]);

  const markedDays = useMemo(() => new Set(upcoming
    .filter(({ nextDate }) => nextDate.getFullYear() === shownMonth.getFullYear() && nextDate.getMonth() === shownMonth.getMonth())
    .map(({ nextDate }) => nextDate.getDate())), [shownMonth, upcoming]);

  const cells = useMemo(() => {
    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    const result: (number | null)[] = Array.from({ length: new Date(year, month, 1).getDay() }, () => null);
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day += 1) result.push(day);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [shownMonth]);

  const selectDay = (day: number) => {
    const date = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), day);
    setSelectedDate(date);
    void Haptics.selectionAsync();
    if (!addOpen) {
      const editable = upcoming.find((item) => item.kind !== 'birthday' && localIso(item.nextDate) === localIso(date));
      if (editable) {
        setEditingItem(editable);
        setTitle(editable.title);
        setAddOpen(true);
      }
    }
  };

  const openEditor = (item: CalendarUpcomingItem) => {
    setShownMonth(new Date(item.nextDate.getFullYear(), item.nextDate.getMonth(), 1));
    setSelectedDate(item.nextDate);
    if (item.kind === 'birthday') return;
    setEditingItem(item);
    setTitle(item.title);
    setAddOpen(true);
  };

  const toggleAdd = () => {
    if (addOpen) {
      setAddOpen(false);
      setEditingItem(null);
      setTitle('');
      return;
    }
    setEditingItem(null);
    setTitle('');
    setAddOpen(true);
  };

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      if (editingItem?.kind === 'special') {
        const { moment } = await specialMomentsApi.update(editingItem.sourceId, { title: title.trim(), momentAt: localIso(selectedDate) });
        setMoments((current) => current.map((item) => item.id === moment.id ? moment : item));
      } else if (editingItem?.kind === 'memory') {
        const { memory } = await memoriesApi.update(editingItem.sourceId, { title: title.trim(), memoryAt: localIso(selectedDate) });
        setMemories((current) => current.map((item) => item.id === memory.id ? memory : item));
      } else {
        const { moment } = await specialMomentsApi.create({ title: title.trim(), momentAt: localIso(selectedDate) });
        setMoments((current) => [...current.filter((item) => item.id !== moment.id), moment]);
      }
      useCoupleContentStore.getState().bump();
      setTitle('');
      setAddOpen(false);
      setEditingItem(null);
      smittenAlert({ title: editingItem ? 'Date updated' : 'Date added', message: editingItem ? 'Your calendar changes have been saved.' : `${title.trim()} is now marked on your calendar.`, tone: 'success' });
    } catch (error) {
      smittenAlertFromError(error, 'Could not add date', 'error');
    } finally {
      setSaving(false);
    }
  };

  const bottomSpace = (Platform.OS === 'ios' ? 94 : 84) + insets.bottom;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={22} color={UnMeColors.txDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity onPress={toggleAdd} style={[styles.addButton, addOpen && styles.addButtonActive]}>
          <Ionicons name={addOpen ? 'close' : 'add'} size={23} color={addOpen ? '#fff' : UnMeColors.txDark} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => setShownMonth(new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1))} style={styles.monthButton}><Ionicons name="chevron-back" size={18} color={UnMeColors.txDark} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setMonthPickerVisible(true)} style={styles.monthPickerButton}>
              <Text style={styles.monthTitle}>{MONTHS[shownMonth.getMonth()]} {shownMonth.getFullYear()}</Text>
              <Ionicons name="chevron-down" size={14} color="#a4556b" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShownMonth(new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1))} style={styles.monthButton}><Ionicons name="chevron-forward" size={18} color={UnMeColors.txDark} /></TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {WEEKDAYS.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
            {cells.map((day, index) => {
              if (day === null) return <View key={`blank-${index}`} style={styles.dayCell} />;
              const selected = selectedDate.getFullYear() === shownMonth.getFullYear() && selectedDate.getMonth() === shownMonth.getMonth() && selectedDate.getDate() === day;
              const marked = markedDays.has(day);
              return (
                <TouchableOpacity key={day} onPress={() => selectDay(day)} style={styles.dayCell}>
                  <View style={[styles.dayBubble, selected && styles.daySelected]}>
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                    {marked ? <View style={[styles.markDot, selected && styles.markDotSelected]} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {addOpen ? (
          <View style={styles.addCard}>
            <View style={styles.addCardHeading}>
              <View style={styles.addIcon}><Ionicons name="heart" size={17} color="#e56582" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addTitle}>{editingItem ? 'Edit important date' : 'Add an important date'}</Text>
                <Text style={styles.addDate}>{selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
              </View>
            </View>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Dinner date or anniversary" placeholderTextColor="#b7a7ae" style={styles.input} />
            <TouchableOpacity disabled={!title.trim() || saving} onPress={() => void save()} style={[styles.saveButton, (!title.trim() || saving) && styles.saveDisabled]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingItem ? 'Update date' : 'Mark this date'}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Upcoming</Text>
        {loading ? <ActivityIndicator color="#e56582" style={styles.loader} /> : upcoming.length ? upcoming.map((item, index) => (
          <TouchableOpacity key={item.id} activeOpacity={0.86} onPress={() => openEditor(item)} style={styles.upcomingCard}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateMonth}>{SHORT_MONTHS[item.nextDate.getMonth()]}</Text>
              <Text style={styles.dateDay}>{item.nextDate.getDate()}</Text>
            </View>
            <View style={styles.eventCopy}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.eventTime}>{item.nextDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric' })}</Text>
            </View>
            <View style={[styles.eventArt, { backgroundColor: ART_COLORS[index % ART_COLORS.length] }]} />
            <Ionicons name="chevron-forward" size={17} color="#d0bdc5" />
          </TouchableOpacity>
        )) : (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={27} color="#d9bdc6" />
            <Text style={styles.emptyTitle}>No upcoming dates yet</Text>
            <Text style={styles.emptyText}>Tap + and mark your next plan together.</Text>
          </View>
        )}
      </ScrollView>
      <MonthYearPicker
        visible={monthPickerVisible}
        month={shownMonth.getMonth()}
        year={shownMonth.getFullYear()}
        onClose={() => setMonthPickerVisible(false)}
        onSelect={(month, year) => setShownMonth(new Date(year, month, 1))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  headerButton: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25, lineHeight: 36, paddingTop: 2, textAlign: 'center' },
  addButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  addButtonActive: { backgroundColor: '#e56582' },
  content: { paddingHorizontal: 22, paddingTop: 8 },
  calendarCard: { borderWidth: 1, borderColor: '#f1e5e8', borderRadius: 23, paddingHorizontal: 13, paddingTop: 14, paddingBottom: 12, backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 3 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#fbf5f7' },
  monthPickerButton: { minHeight: 38, paddingHorizontal: 11, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff8fa' },
  monthTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', marginBottom: 6, color: '#b3a2aa', fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'center' },
  dayCell: { width: '14.2857%', height: 39, alignItems: 'center', justifyContent: 'center' },
  dayBubble: { width: 36, height: 36, aspectRatio: 1, overflow: 'hidden', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: '#e56582' },
  dayText: { color: '#4a3d43', fontFamily: 'Inter_500Medium', fontSize: 12 },
  dayTextSelected: { color: '#fff', fontFamily: 'Inter_700Bold' },
  markDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#e56582' },
  markDotSelected: { backgroundColor: '#fff' },
  addCard: { borderWidth: 1, borderColor: '#efdbe1', borderRadius: 21, padding: 15, marginTop: 16, backgroundColor: '#fff8fa' },
  addCardHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  addIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 11, backgroundColor: '#fde7ed' },
  addTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 16 },
  addDate: { marginTop: 2, color: '#a28e98', fontFamily: 'Inter_500Medium', fontSize: 11 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#ecdce1', borderRadius: 15, paddingHorizontal: 14, color: UnMeColors.txDark, fontFamily: 'Inter_500Medium', fontSize: 13, backgroundColor: '#fff' },
  saveButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, marginTop: 11, backgroundColor: '#e56582' },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  sectionTitle: { marginTop: 22, marginBottom: 11, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  loader: { paddingVertical: 40 },
  upcomingCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', borderRadius: 19, paddingHorizontal: 11, marginBottom: 10, backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 13, elevation: 2 },
  dateBadge: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: '#fee8eb' },
  dateMonth: { color: '#dc607b', fontFamily: 'Inter_700Bold', fontSize: 8 },
  dateDay: { marginTop: 2, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18 },
  eventCopy: { flex: 1, paddingHorizontal: 12 },
  eventTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15 },
  eventTime: { marginTop: 4, color: '#ab97a0', fontFamily: 'Inter_400Regular', fontSize: 10 },
  eventArt: { width: 49, height: 49, borderRadius: 13, marginRight: 8 },
  empty: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#ead7dd', borderRadius: 20, paddingVertical: 35 },
  emptyTitle: { marginTop: 10, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 16 },
  emptyText: { marginTop: 5, color: '#a28e98', fontFamily: 'Inter_400Regular', fontSize: 11 },
});
