import { UnMeColors } from '@/constants/smittenTheme';
import { MonthYearPicker } from '@/src/components/calendar/MonthYearPicker';
import { KeyboardAwareScrollView } from '@/src/components/ui/KeyboardAwareScrollView';
import { confirmDeleteItem, smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { notesApi, type ApiNote } from '@/src/services/notesApi';
import { useCoupleContentStore } from '@/src/store/coupleContentStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DiaryTab = 'shared' | 'mine';
type DiaryMode = 'list' | 'calendar' | 'write' | 'read';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateParts(value: string) {
  const date = new Date(value);
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

function localDateIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date(value);
}

function longDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function DiaryHeader({ title, subtitle, onBack, onClose }: { title: string; subtitle?: string; onBack: () => void; onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity onPress={onBack} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={23} color={UnMeColors.txDark} />
      </TouchableOpacity>
      <View style={styles.headingCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={[styles.headerButton, styles.headerButtonRight]}>
          <Ionicons name="close" size={23} color="#a08c96" />
        </TouchableOpacity>
      ) : <View style={styles.headerButton} />}
    </View>
  );
}

function DiaryCalendar({ diaryDates, onBack, onClose, onContinue }: {
  diaryDates: Set<string>;
  onBack: () => void;
  onClose: () => void;
  onContinue: (date: Date) => void;
}) {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shownMonth, setShownMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const cells = useMemo(() => {
    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    const result: (number | null)[] = Array.from({ length: new Date(year, month, 1).getDay() }, () => null);
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day += 1) result.push(day);
    while (result.length % 7) result.push(null);
    return result;
  }, [shownMonth]);

  return (
    <View style={styles.screen}>
      <DiaryHeader title="Choose a date" subtitle="When do you want to write?" onBack={onBack} onClose={onClose} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.calendarContent, { paddingBottom: 110 + insets.bottom }]}>
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => setShownMonth(new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1))} style={styles.monthArrow}>
              <Ionicons name="chevron-back" size={20} color={UnMeColors.txDark} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMonthPickerVisible(true)} style={styles.monthPickerButton}>
              <Text style={styles.monthTitle}>{MONTHS[shownMonth.getMonth()]} {shownMonth.getFullYear()}</Text>
              <Ionicons name="chevron-down" size={15} color="#a4556b" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShownMonth(new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1))} style={styles.monthArrow}>
              <Ionicons name="chevron-forward" size={20} color={UnMeColors.txDark} />
            </TouchableOpacity>
          </View>
          <View style={styles.calendarGrid}>
            {WEEKDAYS.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
            {cells.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
              const date = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), day);
              const selected = localDateIso(date) === localDateIso(selectedDate);
              const dateKey = localDateIso(date);
              const hasDiaryEntry = diaryDates.has(dateKey);
              return (
                <TouchableOpacity key={localDateIso(date)} onPress={() => setSelectedDate(date)} style={styles.dayCell}>
                  <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                  </View>
                  {hasDiaryEntry ? (
                    <View style={styles.dayMarkers}>
                      <Ionicons name="book" size={8} color={selected ? '#fff' : '#e56582'} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.legend}>
            <Ionicons name="book" size={12} color="#e56582" />
            <Text style={styles.legendText}>Diary entry</Text>
          </View>
        </View>

        <View style={styles.selectedCard}>
          <View style={styles.selectedIcon}><Ionicons name="book-outline" size={22} color="#dc5578" /></View>
          <View style={styles.selectedCopy}>
            <Text style={styles.selectedLabel}>SELECTED DATE</Text>
            <Text style={styles.selectedDate}>{longDate(selectedDate)}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => onContinue(selectedDate)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={21} color="#fff" />
        </TouchableOpacity>
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

function DiaryWriter({ date, editingNote, initialVisibility, onBack, onClose, onSaved }: {
  date: Date;
  editingNote?: ApiNote | null;
  initialVisibility: 'SHARED' | 'PRIVATE';
  onBack: () => void;
  onClose: () => void;
  onSaved: (note: ApiNote) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(editingNote?.title ?? '');
  const [story, setStory] = useState(editingNote?.description ?? '');
  const [visibility, setVisibility] = useState<'SHARED' | 'PRIVATE'>(editingNote?.visibility === 'PRIVATE' ? 'PRIVATE' : initialVisibility);
  const [saving, setSaving] = useState(false);
  const [storyHeight, setStoryHeight] = useState(300);
  const paperHeight = Math.max(520, storyHeight + 220);
  const paperLineCount = Math.ceil((paperHeight - 94) / 34) + 1;

  const save = async () => {
    if (!title.trim() || !story.trim() || saving) return;
    setSaving(true);
    try {
      const { note } = editingNote
        ? await notesApi.update(editingNote.id, { title: title.trim(), description: story.trim(), visibility, noteAt: localDateIso(date) })
        : await notesApi.create({ title: title.trim(), description: story.trim(), visibility, noteAt: localDateIso(date) });
      useCoupleContentStore.getState().bump();
      onSaved(note);
      smittenAlert({ title: editingNote ? 'Diary entry updated' : 'Diary entry saved', message: visibility === 'PRIVATE' ? 'This page is visible only to you.' : 'This page is shared with your partner.', tone: 'success' });
    } catch (error) {
      smittenAlertFromError(error, 'Could not save diary entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DiaryHeader title={editingNote ? 'Edit diary entry' : 'New diary entry'} subtitle={longDate(date)} onBack={onBack} onClose={onClose} />
      <KeyboardAwareScrollView bottomPadding={110 + insets.bottom} extraScrollHeight={110} contentContainerStyle={styles.writerContent}>
        <View style={styles.writerVisibilityCard}>
          <View style={styles.writerVisibilityCopy}>
            <Text style={styles.writerVisibilityTitle}>Who can read this page?</Text>
            <Text style={styles.writerVisibilityHint}>{visibility === 'SHARED' ? 'You and your partner' : 'Only you'}</Text>
          </View>
          <View style={styles.writerVisibilityTabs}>
            {(['SHARED', 'PRIVATE'] as const).map((value) => {
              const active = visibility === value;
              return (
                <TouchableOpacity key={value} onPress={() => setVisibility(value)} style={[styles.writerVisibilityTab, active && styles.writerVisibilityTabActive]}>
                  <Ionicons name={value === 'SHARED' ? 'people-outline' : 'lock-closed-outline'} size={14} color={active ? '#fff' : '#9d8792'} />
                  <Text style={[styles.writerVisibilityTabText, active && styles.writerVisibilityTabTextActive]}>{value === 'SHARED' ? 'Shared' : 'Just me'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={[styles.writerPaper, { minHeight: paperHeight }]}>
          <View style={styles.paperMargin} />
          {Array.from({ length: paperLineCount }, (_, index) => <View key={index} style={[styles.paperLine, { top: 94 + index * 34 }]} />)}
          <View style={styles.writerDateBadge}>
            <Ionicons name="sparkles-outline" size={15} color="#d95477" />
            <Text style={styles.writerDateText}>{longDate(date)}</Text>
          </View>
          <Text style={styles.inputLabel}>TITLE</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Give this page a title"
            placeholderTextColor="#beaeb6"
            style={styles.titleInput}
            maxLength={100}
          />
          <Text style={[styles.inputLabel, styles.storyLabel]}>YOUR STORY</Text>
          <TextInput
            value={story}
            onChangeText={setStory}
            onContentSizeChange={({ nativeEvent }) => setStoryHeight(Math.max(300, Math.ceil(nativeEvent.contentSize.height)))}
            placeholder="Write what is on your heart…"
            placeholderTextColor="#beaeb6"
            style={[styles.storyInput, { height: storyHeight }]}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            maxLength={5000}
          />
        </View>
        <TouchableOpacity disabled={!title.trim() || !story.trim() || saving} onPress={() => void save()} style={[styles.primaryButton, (!title.trim() || !story.trim() || saving) && styles.primaryButtonDisabled]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="heart" size={18} color="#fff" />}
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save entry'}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

function DiaryReader({ note, onBack, onEdit, onDelete }: { note: ApiNote; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  const insets = useSafeAreaInsets();
  const date = new Date(note.noteAt);
  return (
    <View style={styles.screen}>
      <DiaryHeader title="My Diary" subtitle="A page from your story" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.readerContent, { paddingBottom: 110 + insets.bottom }]}>
        <View style={styles.readerPaper}>
          <View style={styles.readerSpine}>
            {Array.from({ length: 260 }, (_, index) => <View key={index} style={styles.readerRing} />)}
          </View>
          <View style={styles.readerBody}>
            {Array.from({ length: 220 }, (_, index) => <View key={index} style={[styles.readerLine, { top: 150 + index * 34 }]} />)}
            <View style={styles.readerKicker}>
              <Ionicons name="heart" size={13} color="#df5c7d" />
              <Text style={styles.readerDate}>{longDate(date)}</Text>
            </View>
            <View style={styles.readerPrivacyPill}>
              <Ionicons name={note.visibility === 'PRIVATE' ? 'lock-closed-outline' : 'people-outline'} size={13} color="#9a6575" />
              <Text style={styles.readerPrivacyText}>{note.visibility === 'PRIVATE' ? 'Just me' : 'Shared'}</Text>
            </View>
            <Text style={styles.readerTitle}>{note.title}</Text>
            <View style={styles.inkDivider} />
            <Text style={styles.readerStory}>{note.description}</Text>
            <View style={styles.readerSignoff}>
              <View style={styles.readerSignLine} />
              <Ionicons name="heart-outline" size={18} color="#d85a79" />
            </View>
            {note.canManage ? (
              <View style={styles.readerActions}>
                <TouchableOpacity onPress={onEdit} style={styles.readerEditButton}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.readerEditText}>Edit page</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={styles.readerDeleteButton}>
                  <Ionicons name="trash-outline" size={18} color="#c74e6a" />
                  <Text style={styles.readerDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function DiaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const apiUser = useAuthStore((state) => state.apiUser);
  const [tab, setTab] = useState<DiaryTab>('shared');
  const [mode, setMode] = useState<DiaryMode>('list');
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedNote, setSelectedNote] = useState<ApiNote | null>(null);
  const [editingNote, setEditingNote] = useState<ApiNote | null>(null);
  const [loading, setLoading] = useState(true);
  const listScrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setMode('list');
    setSelectedNote(null);
    setEditingNote(null);
    requestAnimationFrame(() => listScrollRef.current?.scrollTo({ y: 0, animated: false }));
    setLoading(true);
    void notesApi.list()
      .then((noteResult) => {
        if (!active) return;
        setNotes(noteResult.notes.sort((a, b) => Date.parse(b.noteAt) - Date.parse(a.noteAt)));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const visibleNotes = useMemo(
    () => (tab === 'mine'
      ? notes.filter((note) => note.creatorId === apiUser?.id && note.visibility === 'PRIVATE')
      : notes.filter((note) => note.visibility !== 'PRIVATE')),
    [apiUser?.id, notes, tab],
  );

  const diaryDates = useMemo(() => new Set(notes.map((note) => note.noteAt.slice(0, 10))), [notes]);

  const bottomSpace = (Platform.OS === 'ios' ? 92 : 82) + insets.bottom;

  if (mode === 'calendar') {
    return <DiaryCalendar diaryDates={diaryDates} onBack={() => setMode('list')} onClose={() => setMode('list')} onContinue={(date) => { setEditingNote(null); setSelectedDate(date); setMode('write'); }} />;
  }
  if (mode === 'write') {
    return (
      <DiaryWriter
        key={editingNote?.id ?? `new-${localDateIso(selectedDate)}-${tab}`}
        date={selectedDate}
        editingNote={editingNote}
        initialVisibility={tab === 'mine' ? 'PRIVATE' : 'SHARED'}
        onBack={() => setMode(editingNote ? 'read' : 'calendar')}
        onClose={() => { setEditingNote(null); setMode('list'); }}
        onSaved={(note) => {
          setNotes((current) => editingNote ? current.map((item) => item.id === note.id ? note : item) : [note, ...current]);
          setSelectedNote(note);
          setEditingNote(null);
          setMode('read');
        }}
      />
    );
  }
  if (mode === 'read' && selectedNote) {
    return (
      <DiaryReader
        note={selectedNote}
        onBack={() => { setSelectedNote(null); setEditingNote(null); setMode('list'); }}
        onEdit={() => { setEditingNote(selectedNote); setSelectedDate(parseLocalDate(selectedNote.noteAt)); setMode('write'); }}
        onDelete={() => {
          confirmDeleteItem(`Delete “${selectedNote.title}”?`, () => {
            void notesApi.remove(selectedNote.id)
              .then(() => {
                setNotes((current) => current.filter((item) => item.id !== selectedNote.id));
                useCoupleContentStore.getState().bump();
                setSelectedNote(null);
                setEditingNote(null);
                setMode('list');
                smittenAlert({ title: 'Diary entry deleted', message: 'This page has been removed.', tone: 'success' });
              })
              .catch((error) => smittenAlertFromError(error, 'Could not delete diary entry', 'error'));
          });
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.listHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={23} color={UnMeColors.txDark} />
        </TouchableOpacity>
        <View style={styles.headingCopy}>
          <Text style={styles.headerTitle}>My Diary</Text>
          <Text style={styles.headerSubtitle}>Thoughts, feelings & little moments</Text>
        </View>
        <TouchableOpacity onPress={() => setMode('calendar')} style={styles.addButton}>
          <Ionicons name="add" size={24} color={UnMeColors.txDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['shared', 'mine'] as DiaryTab[]).map((value) => {
          const active = value === tab;
          return (
            <TouchableOpacity key={value} onPress={() => setTab(value)} style={[styles.tab, active && styles.activeTab]}>
              <Text style={[styles.tabText, active && styles.activeTabText]}>{value === 'shared' ? 'Shared' : 'Just me'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView ref={listScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <View style={styles.journalIntro}>
          <View style={styles.journalIcon}><Ionicons name="book-outline" size={24} color="#d65375" /></View>
          <View style={styles.journalIntroCopy}>
            <Text style={styles.journalIntroTitle}>{tab === 'shared' ? 'Our shared pages' : 'Pages written by you'}</Text>
          </View>
        </View>

        <View style={styles.paper}>
          <View style={styles.spine}>
            {Array.from({ length: Math.max(15, visibleNotes.length * 4) }, (_, index) => <View key={index} style={styles.ring} />)}
          </View>
          {loading ? (
            <ActivityIndicator color={UnMeColors.m7} style={styles.loader} />
          ) : visibleNotes.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="pencil-outline" size={26} color="#d85b7a" /></View>
              <Text style={styles.emptyTitle}>A blank page for you</Text>
              <Text style={styles.emptyText}>Tap +, choose any date and write your first entry.</Text>
            </View>
          ) : visibleNotes.map((note) => {
            const date = dateParts(note.noteAt);
            return (
              <TouchableOpacity key={note.id} activeOpacity={0.72} onPress={() => { setSelectedNote(note); setMode('read'); }} style={styles.entry}>
                <View style={styles.dateBox}>
                  <Text style={styles.month}>{date.month}</Text>
                  <Text style={styles.day}>{date.day}</Text>
                </View>
                <View style={styles.entryCopy}>
                  <View style={styles.entryTitleRow}>
                    <Text numberOfLines={1} style={styles.title}>{note.title}</Text>
                    <Ionicons name="chevron-forward" size={17} color="#c8b5be" />
                  </View>
                  {note.description ? <Text numberOfLines={3} ellipsizeMode="tail" style={styles.description}>{note.description}</Text> : null}
                  <Text style={styles.readMore}>READ PAGE</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 86, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 9 },
  listHeader: { minHeight: 94, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  headerButton: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  headerButtonRight: { alignItems: 'flex-end' },
  headingCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 7 },
  headerTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 27, lineHeight: 36, textAlign: 'center' },
  headerSubtitle: { marginTop: 2, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  addButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  tabs: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 8, marginBottom: 22, gap: 8 },
  tab: { height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, borderRadius: 18 },
  activeTab: { backgroundColor: '#e56582', shadowColor: '#bd4967', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 6, elevation: 2 },
  tabText: { color: '#9d8792', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  activeTabText: { color: '#fff' },
  content: { paddingHorizontal: 20 },
  journalIntro: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingHorizontal: 4 },
  journalIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#f5f5f4' },
  journalIntroCopy: { flex: 1, paddingLeft: 12 },
  journalIntroTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18 },
  journalIntroText: { marginTop: 2, color: '#a28f98', fontFamily: 'Inter_400Regular', fontSize: 12 },
  paper: { minHeight: 430, overflow: 'hidden', borderRadius: 24, backgroundColor: '#fff', paddingLeft: 54, paddingRight: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#f3e4e7', shadowColor: '#8f5f6f', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 42, alignItems: 'center', paddingTop: 18, gap: 14, backgroundColor: '#fff9ed', borderRightWidth: 1, borderRightColor: '#f0dfbf' },
  ring: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#c9a15c', backgroundColor: '#fff' },
  loader: { paddingVertical: 90 },
  entry: { flexDirection: 'row', paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#efd5db' },
  dateBox: { width: 48, alignItems: 'center', paddingTop: 2 },
  month: { color: '#b49ba6', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  day: { marginTop: 4, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  entryCopy: { flex: 1, paddingLeft: 10 },
  entryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { flex: 1, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17 },
  description: { marginTop: 7, color: '#8f7b86', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  readMore: { marginTop: 10, color: '#d45777', fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.2 },
  empty: { paddingVertical: 78, paddingHorizontal: 24, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#f5f5f4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 21 },
  emptyText: { marginTop: 8, color: '#9b8792', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  calendarContent: { paddingHorizontal: 20, paddingTop: 10 },
  calendarCard: { borderRadius: 26, padding: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0e3e7', shadowColor: '#684150', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.09, shadowRadius: 16, elevation: 3 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  monthArrow: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f4' },
  monthPickerButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff' },
  monthTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', height: 34, textAlign: 'center', color: '#a7969e', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  dayCell: { width: '14.2857%', height: 50, alignItems: 'center' },
  dayCircle: { width: 38, height: 38, aspectRatio: 1, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: '#e56582' },
  dayText: { color: '#3d3338', fontFamily: 'Inter_500Medium', fontSize: 14 },
  dayTextSelected: { color: '#fff', fontFamily: 'Inter_700Bold' },
  dayMarkers: { position: 'absolute', bottom: 1, minHeight: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingTop: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee2e6' },
  legendText: { color: '#96838d', fontFamily: 'Inter_400Regular', fontSize: 12 },
  selectedCard: { flexDirection: 'row', alignItems: 'center', marginTop: 18, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: '#eddde2', backgroundColor: '#fff' },
  selectedIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#f5f5f4' },
  selectedCopy: { flex: 1, paddingLeft: 14 },
  selectedLabel: { color: '#a48f99', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.2 },
  selectedDate: { marginTop: 5, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17 },
  primaryButton: { ...smittenGlassButton, minHeight: 58, marginTop: 18, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  primaryButtonDisabled: { opacity: 0.46 },
  primaryButtonText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  writerContent: { paddingHorizontal: 20, paddingTop: 12 },
  writerVisibilityCard: { marginBottom: 15, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: '#efdee3', backgroundColor: '#fff' },
  writerVisibilityCopy: { paddingHorizontal: 3, marginBottom: 12 },
  writerVisibilityTitle: { color: UnMeColors.txDark, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  writerVisibilityHint: { marginTop: 3, color: '#9d8792', fontFamily: 'Inter_400Regular', fontSize: 11 },
  writerVisibilityTabs: { flexDirection: 'row', gap: 8 },
  writerVisibilityTab: { flex: 1, height: 39, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  writerVisibilityTabActive: { backgroundColor: '#e56582' },
  writerVisibilityTabText: { color: '#9d8792', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  writerVisibilityTabTextActive: { color: '#fff' },
  writerPaper: { minHeight: 520, overflow: 'hidden', padding: 24, paddingLeft: 38, borderRadius: 25, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#f0e2c9', shadowColor: '#8c633d', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.09, shadowRadius: 16, elevation: 3 },
  paperMargin: { position: 'absolute', left: 25, top: 0, bottom: 0, width: 1, backgroundColor: '#efb8c4' },
  paperLine: { position: 'absolute', left: 26, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#e7ddca' },
  writerDateBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, backgroundColor: '#f5f5f4', marginBottom: 25 },
  writerDateText: { color: '#9c6473', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  inputLabel: { color: '#a18c96', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  titleInput: { minHeight: 54, marginTop: 7, paddingVertical: 8, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24 },
  storyLabel: { marginTop: 24 },
  storyInput: { minHeight: 300, marginTop: 10, padding: 0, color: '#000000', fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 34 },
  readerContent: { paddingHorizontal: 20, paddingTop: 12 },
  readerPaper: { minHeight: 420, overflow: 'hidden', borderRadius: 26, backgroundColor: '#fffdf7', borderWidth: 1, borderColor: '#eedfc4', shadowColor: '#72533a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.11, shadowRadius: 18, elevation: 4 },
  readerSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 46, overflow: 'hidden', paddingTop: 24, alignItems: 'center', gap: 15, backgroundColor: '#fff7e8', borderRightWidth: 1, borderRightColor: '#ead7b4' },
  readerRing: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#bd9550', backgroundColor: '#fff' },
  readerBody: { marginLeft: 46, overflow: 'hidden', padding: 25, paddingTop: 30 },
  readerLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#e6dccb' },
  readerKicker: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  readerDate: { color: '#a0838e', fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.3 },
  readerPrivacyPill: { alignSelf: 'flex-start', marginTop: 13, paddingHorizontal: 10, height: 28, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f5f5f4' },
  readerPrivacyText: { color: '#9a6575', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  readerTitle: { marginTop: 15, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 29, lineHeight: 37 },
  inkDivider: { width: 46, height: 3, marginTop: 17, marginBottom: 22, borderRadius: 2, backgroundColor: '#e56582' },
  readerStory: { color: '#57464e', fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 34 },
  readerSignoff: { marginTop: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  readerSignLine: { width: 48, height: 1, backgroundColor: '#d7b8c0' },
  readerActions: { flexDirection: 'row', gap: 10, marginTop: 28, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2cfd4' },
  readerEditButton: { ...smittenGlassButton, flex: 1, height: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  readerEditText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  readerDeleteButton: { minWidth: 96, height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#edccd4', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  readerDeleteText: { color: '#c74e6a', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
