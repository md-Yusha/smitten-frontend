import { UnMeColors } from '@/constants/smittenTheme';
import { MonthYearPicker } from '@/src/components/calendar/MonthYearPicker';
import { AuthedMediaImage } from '@/src/components/media/AuthedMediaImage';
import { AuthedMediaVideo } from '@/src/components/media/AuthedMediaVideo';
import { FullscreenMediaModal } from '@/src/components/media/FullscreenMediaModal';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { confirmDeleteItem, smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { editVideoForUpload } from '@/src/services/videoEditor';
import { resolveApiMediaUrl } from '@/src/services/mediaUrl';
import { memoriesApi, type ApiMemory } from '@/src/services/memoriesApi';
import { specialMomentsApi, type ApiSpecialMoment } from '@/src/services/specialMomentsApi';
import { useCoupleContentStore } from '@/src/store/coupleContentStore';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Filter = 'all' | 'photos' | 'videos' | 'milestones';

function daysTogether(value: string | null | undefined) {
  if (!value) return 0;
  const start = new Date(value).getTime();
  return Number.isFinite(start) ? Math.max(0, Math.floor((Date.now() - start) / 86_400_000)) : 0;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function memoryMediaVersion(memory: ApiMemory) {
  const version = memory.mediaVersion || memory.updatedAt || memory.id;
  return String(Date.parse(version) || version).replace(/[^a-zA-Z0-9]/g, '');
}

function memoryMediaUri(memory: ApiMemory): string | null {
  const uri = resolveApiMediaUrl(memory.imageUrl);
  if (!uri) return null;
  if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) return uri;
  const separator = uri.includes('?') ? '&' : '?';
  return `${uri}${separator}v=${encodeURIComponent(memory.mediaVersion || memory.updatedAt)}`;
}

type VideoMemoryDraft = {
  title: string;
  description: string;
  memoryAt: string;
  isSpecialMoment: boolean;
  imageUri: string;
  existingMemory?: ApiMemory;
};

function MemoryVideoTile({ uri, cacheKey }: { uri: string; cacheKey: string }) {
  const [started, setStarted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);

  return (
    <View style={styles.videoTile}>
      <AuthedMediaVideo
        uri={uri}
        cacheKey={cacheKey}
        style={styles.media}
        controls={controlsVisible}
        autoPlay={started}
        muted={!started}
        contentFit="contain"
      />
      {!controlsVisible ? (
        <TouchableOpacity
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={started ? 'Show video controls' : 'Play video'}
          onPress={() => {
            if (!started) setStarted(true);
            else setControlsVisible(true);
          }}
          style={styles.videoTapLayer}
        >
          {!started ? (
            <View style={styles.videoPlayButton}>
              <Ionicons name="play" size={30} color="#fff" />
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function localDateIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isFutureMemory(memory: ApiMemory) {
  const parts = memory.memoryAt.slice(0, 10).split('-').map(Number);
  const date = parts.length === 3 && parts.every(Number.isFinite)
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(memory.memoryAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Number.isFinite(date.getTime()) && date > today;
}

function nextFutureDate(value: string, now = new Date()) {
  const parts = value.slice(0, 10).split('-').map(Number);
  const source = parts.length === 3 && parts.every(Number.isFinite)
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), source.getMonth(), source.getDate());
  if (next < today) next = new Date(now.getFullYear() + 1, source.getMonth(), source.getDate());
  return next;
}

function MemoryComposer({
  memoryDates,
  futureDates,
  futureMemories,
  editingMemory,
  initialUpcoming,
  onEditMemory,
  onStartUpcoming,
  onDeleteMemory,
  onClose,
  onSaved,
  onVideoUploadStarted,
}: {
  memoryDates: Set<string>;
  futureDates: ApiSpecialMoment[];
  futureMemories: ApiMemory[];
  editingMemory?: ApiMemory | null;
  initialUpcoming?: { id: string; title: string; date: Date } | null;
  onEditMemory: (memory: ApiMemory) => void;
  onStartUpcoming: (item: { id: string; title: string; date: Date }) => void;
  onDeleteMemory: (memory: ApiMemory) => void;
  onClose: () => void;
  onSaved: (memory: ApiMemory) => void;
  onVideoUploadStarted: (draft: VideoMemoryDraft) => void;
}) {
  const insets = useSafeAreaInsets();
  const editDate = useMemo(() => editingMemory ? (() => {
    const parts = editingMemory.memoryAt.slice(0, 10).split('-').map(Number);
    return parts.length === 3 && parts.every(Number.isFinite) ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(editingMemory.memoryAt);
  })() : initialUpcoming?.date ?? new Date(), [editingMemory, initialUpcoming]);
  const [step, setStep] = useState<'date' | 'details'>(editingMemory ? 'details' : 'date');
  const [shownMonth, setShownMonth] = useState(() => new Date(editDate.getFullYear(), editDate.getMonth(), 1));
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(editDate);
  const [title, setTitle] = useState(editingMemory?.title ?? initialUpcoming?.title ?? '');
  const [description, setDescription] = useState(editingMemory?.description ?? '');
  const [isMilestone, setIsMilestone] = useState(editingMemory?.isSpecialMoment ?? false);
  const [mediaUri, setMediaUri] = useState<string | null>(() => editingMemory ? memoryMediaUri(editingMemory) : null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(editingMemory?.mediaType ?? 'image');
  const [mediaRevision, setMediaRevision] = useState(0);
  const [mediaChanged, setMediaChanged] = useState(false);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const selectedIsFuture = useMemo(() => {
    const now = new Date();
    return selectedDate > new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, [selectedDate]);

  const calendarCells = useMemo(() => {
    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    const cells: (number | null)[] = Array.from({ length: new Date(year, month, 1).getDay() }, () => null);
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [shownMonth]);

  const upcomingDates = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const calendarDates = futureDates.map((item) => ({ id: item.id, title: item.title, nextDate: nextFutureDate(item.momentAt), kind: item.id.startsWith('birthday-') ? 'birthday' as const : 'date' as const, memory: null }));
    const memoryDates = futureMemories.flatMap((memory) => {
      const parts = memory.memoryAt.slice(0, 10).split('-').map(Number);
      const date = parts.length === 3 && parts.every(Number.isFinite) ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(memory.memoryAt);
      return Number.isFinite(date.getTime()) && date > start
        ? [{ id: `future-memory-${memory.id}`, title: memory.title, nextDate: date, kind: 'memory' as const, memory }]
        : [];
    });
    return [...calendarDates, ...memoryDates].sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [futureDates, futureMemories]);

  const markedFutureDays = useMemo(() => new Set(upcomingDates
    .filter(({ nextDate }) => nextDate.getFullYear() === shownMonth.getFullYear() && nextDate.getMonth() === shownMonth.getMonth())
    .map(({ nextDate }) => nextDate.getDate())), [shownMonth, upcomingDates]);

  const chooseDay = (day: number) => {
    const date = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), day);
    setSelectedDate(date);
    const attachedUpcoming = upcomingDates.find((item) => localDateIso(item.nextDate) === localDateIso(date));
    if (attachedUpcoming?.kind === 'memory' && attachedUpcoming.memory) {
      if (attachedUpcoming.memory.id !== editingMemory?.id) onEditMemory(attachedUpcoming.memory);
      return;
    }
    if (attachedUpcoming) {
      onStartUpcoming({ id: attachedUpcoming.id, title: attachedUpcoming.title, date: attachedUpcoming.nextDate });
      return;
    }
    const existing = futureMemories.find((memory) => memory.memoryAt.slice(0, 10) === localDateIso(date));
    if (existing && existing.id !== editingMemory?.id) onEditMemory(existing);
  };

  const pickMedia = async () => {
    useAppLockStore.getState().setSystemOverlayActive(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 1,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      let uri = asset.uri;
      if (asset.type === 'video') {
        const edited = await editVideoForUpload(asset.uri, asset.fileSize, asset.duration);
        if (!edited) return;
        uri = edited;
      }
      setMediaUri(uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
      setMediaRevision((current) => current + 1);
      setMediaChanged(true);
      setRemoveMedia(false);
    } catch (error) {
      smittenAlertFromError(error, 'Could not prepare media', 'error');
    } finally {
      useAppLockStore.getState().setSystemOverlayActive(false);
    }
  };

  const save = async () => {
    if (!title.trim() || saving) return;
    if (
      !selectedIsFuture &&
      mediaUri &&
      mediaType === 'video' &&
      (!editingMemory || mediaChanged)
    ) {
      onVideoUploadStarted({
        title: title.trim(),
        description: description.trim(),
        memoryAt: localDateIso(selectedDate),
        isSpecialMoment: isMilestone,
        imageUri: mediaUri,
        existingMemory: editingMemory ?? undefined,
      });
      return;
    }
    setSaving(true);
    try {
      const { memory } = editingMemory
        ? await memoriesApi.update(editingMemory.id, {
            title: title.trim(),
            description: selectedIsFuture ? '' : description.trim(),
            memoryAt: localDateIso(selectedDate),
            isSpecialMoment: selectedIsFuture ? false : isMilestone,
            removeMedia: selectedIsFuture ? Boolean(editingMemory.imageUrl) : removeMedia,
            ...(!selectedIsFuture && mediaChanged && mediaUri ? { imageUri: mediaUri, mediaType } : {}),
            ...(!selectedIsFuture && mediaChanged && mediaUri ? { onProgress: ({ progress: next }) => setProgress(next) } : {}),
          })
        : await memoriesApi.create({
            title: title.trim(),
            description: selectedIsFuture ? '' : description.trim(),
            memoryAt: localDateIso(selectedDate),
            imageUri: selectedIsFuture ? null : mediaUri,
            mediaType,
            isSpecialMoment: selectedIsFuture ? false : isMilestone,
            ...(!selectedIsFuture && mediaUri ? { onProgress: ({ progress: next }) => setProgress(next) } : {}),
          });
      useCoupleContentStore.getState().bump();
      onSaved(memory);
      smittenAlert({
        title: selectedIsFuture ? (editingMemory ? 'Upcoming updated' : 'Upcoming saved') : editingMemory ? 'Memory updated' : 'Memory saved',
        message: selectedIsFuture ? 'This date will stay in Upcoming until it arrives.' : editingMemory ? 'Your changes have been saved.' : 'Your new memory is now part of your story.',
        tone: 'success',
      });
    } catch (error) {
      smittenAlertFromError(error, 'Could not save memory', 'error');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.composerScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.composerHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={step === 'details' ? () => setStep('date') : onClose} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={22} color={UnMeColors.txDark} />
        </TouchableOpacity>
        <View style={styles.composerHeading}>
          <Text style={styles.composerTitle}>{step === 'date' ? 'Choose a date' : selectedIsFuture ? (editingMemory ? 'Edit upcoming' : 'New upcoming') : editingMemory ? 'Edit memory' : 'New memory'}</Text>
          <Text style={styles.composerStep}>{step === 'date' ? 'When did this happen?' : localDateIso(selectedDate)}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Ionicons name="close" size={22} color="#a28f98" />
        </TouchableOpacity>
      </View>

      {step === 'date' ? (
        <ScrollView contentContainerStyle={[styles.composerContent, { paddingBottom: 100 + insets.bottom }]}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
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
              {calendarCells.map((day, index) => {
                const selected = day !== null && selectedDate.getFullYear() === shownMonth.getFullYear() && selectedDate.getMonth() === shownMonth.getMonth() && selectedDate.getDate() === day;
                const hasMemory = day !== null && memoryDates.has(localDateIso(new Date(shownMonth.getFullYear(), shownMonth.getMonth(), day)));
                const hasFutureDate = day !== null && markedFutureDays.has(day);
                return day === null ? <View key={`blank-${index}`} style={styles.dayCell} /> : (
                  <TouchableOpacity key={`${shownMonth.toISOString()}-${day}`} onPress={() => chooseDay(day)} style={styles.dayCell}>
                    <View style={[styles.dayBubble, selected && styles.dayBubbleActive]}>
                      <Text style={[styles.dayText, selected && styles.dayTextActive]}>{day}</Text>
                      {hasMemory || hasFutureDate ? (
                        <View style={styles.dayMarkers}>
                          {hasMemory ? <Ionicons name="heart" size={8} color={selected ? '#fff' : '#e56582'} /> : null}
                          {hasFutureDate ? <View style={[styles.futureDayDot, selected && styles.futureDayDotActive]} /> : null}
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.calendarLegend}>
              <Ionicons name="heart" size={11} color="#e56582" />
              <Text style={styles.calendarLegendText}>Memory</Text>
              <View style={styles.legendFutureDot} />
              <Text style={styles.calendarLegendText}>Upcoming date</Text>
            </View>
          </View>
          <View style={styles.selectedDateCard}>
            <View style={styles.selectedDateIcon}><Ionicons name="heart" size={18} color="#e56582" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedDateLabel}>Selected date</Text>
              <Text style={styles.selectedDateValue}>{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setStep('details')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
          {upcomingDates.length ? (
            <View style={styles.composerUpcomingSection}>
              <Text style={styles.composerUpcomingHeading}>Upcoming</Text>
              {upcomingDates.slice(0, 3).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.86}
                  onPress={() => {
                    if (editingMemory) {
                      onStartUpcoming({ id: item.id, title: item.title, date: item.nextDate });
                      return;
                    }
                    setShownMonth(new Date(item.nextDate.getFullYear(), item.nextDate.getMonth(), 1));
                    setSelectedDate(item.nextDate);
                    setTitle(item.title);
                  }}
                  style={[styles.composerUpcomingCard, localDateIso(selectedDate) === localDateIso(item.nextDate) && styles.composerUpcomingCardActive]}
                >
                  <View style={styles.composerUpcomingDate}>
                    <Text style={styles.composerUpcomingMonth}>{MONTHS[item.nextDate.getMonth()].slice(0, 3).toUpperCase()}</Text>
                    <Text style={styles.composerUpcomingDay}>{item.nextDate.getDate()}</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.composerUpcomingTitle}>{item.title}</Text>
                  {item.kind === 'memory' && item.memory ? (
                    <TouchableOpacity onPress={() => onEditMemory(item.memory!)} style={styles.upcomingEditButton}>
                      <Ionicons name="create-outline" size={16} color="#a079d2" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color="#c9b6be" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.composerContent, { paddingBottom: 110 + insets.bottom }]}>
          <Text style={styles.fieldLabel}>TITLE</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder={selectedIsFuture ? 'e.g. Dinner date or weekend getaway' : 'e.g. A quiet Sunday together'} placeholderTextColor="#b9aab1" style={styles.textField} />
          {selectedIsFuture ? (
            <View style={styles.upcomingOnlyCard}>
              <View style={styles.upcomingOnlyIcon}><Ionicons name="calendar-outline" size={21} color="#8e7cda" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upcomingOnlyTitle}>Saved as an upcoming date</Text>
                <Text style={styles.upcomingOnlyText}>When this date arrives, it will move to Memories and you can add your story, photo or video.</Text>
              </View>
            </View>
          ) : <>
          <Text style={styles.fieldLabel}>YOUR STORY</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Write about this moment…" placeholderTextColor="#b9aab1" multiline textAlignVertical="top" style={[styles.textField, styles.storyField]} />
          <TouchableOpacity onPress={() => setIsMilestone((current) => !current)} activeOpacity={0.86} style={[styles.milestoneToggle, isMilestone && styles.milestoneToggleActive]}>
            <View style={[styles.milestoneIcon, isMilestone && styles.milestoneIconActive]}>
              <Ionicons name={isMilestone ? 'star' : 'star-outline'} size={20} color={isMilestone ? '#fff' : '#e56582'} />
            </View>
            <View style={styles.milestoneCopy}>
              <Text style={styles.milestoneTitle}>Mark as milestone</Text>
              <Text style={styles.milestoneHint}>First dates, anniversaries and unforgettable moments</Text>
            </View>
            <View style={[styles.toggleTrack, isMilestone && styles.toggleTrackActive]}>
              <View style={[styles.toggleKnob, isMilestone && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
          <Text style={styles.fieldLabel}>PHOTO OR VIDEO · OPTIONAL</Text>
          {mediaUri && mediaType === 'video' ? (
            <View style={styles.selectedVideoCard}>
              <AuthedMediaVideo
                uri={mediaUri}
                cacheKey={editingMemory && !mediaChanged ? `edit-memory-video-${editingMemory.id}-${memoryMediaVersion(editingMemory)}` : `new-memory-video-${mediaRevision}`}
                style={styles.selectedVideo}
                controls
                contentFit="contain"
              />
              <TouchableOpacity onPress={() => void pickMedia()} style={styles.changeMediaButton}>
                <Ionicons name="swap-horizontal" size={15} color="#fff" />
                <Text style={styles.changeMediaText}>Change video</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => void pickMedia()} activeOpacity={0.86} style={styles.mediaPicker}>
              {mediaUri ? (
                mediaUri.startsWith('file://') || mediaUri.startsWith('content://') || mediaUri.startsWith('ph://') ? (
                  <Image source={{ uri: mediaUri }} style={styles.selectedMedia} contentFit="contain" />
                ) : (
                  <AuthedMediaImage uri={mediaUri} recyclingKey={`edit-memory-${editingMemory?.id ?? 'new'}-${editingMemory ? memoryMediaVersion(editingMemory) : mediaRevision}`} mediaCacheKey={`edit-memory-${editingMemory?.id ?? 'new'}-${editingMemory ? memoryMediaVersion(editingMemory) : mediaRevision}`} style={styles.selectedMedia} contentFit="contain" />
                )
              ) : (
              <><View style={styles.mediaPickerIcon}><Ionicons name="images-outline" size={26} color="#e56582" /></View><Text style={styles.mediaPickerTitle}>Add a photo or video</Text><Text style={styles.mediaPickerText}>Optional, but memories look lovelier with one</Text></>
              )}
            </TouchableOpacity>
          )}
          {mediaUri ? (
            <TouchableOpacity
              onPress={() => {
                setMediaUri(null);
                setMediaChanged(false);
                setRemoveMedia(Boolean(editingMemory?.imageUrl));
                setMediaRevision((current) => current + 1);
              }}
              style={styles.removeMediaButton}
            >
              <Ionicons name="trash-outline" size={17} color="#c54867" />
              <Text style={styles.removeMediaText}>Remove {mediaType === 'video' ? 'video' : 'photo'}</Text>
            </TouchableOpacity>
          ) : null}
          </>}
          <TouchableOpacity disabled={!title.trim() || saving} onPress={() => void save()} style={[styles.primaryButton, (!title.trim() || saving) && styles.primaryButtonDisabled]}>
            {saving ? <><ActivityIndicator color="#fff" /><Text style={styles.primaryButtonText}>{!selectedIsFuture && mediaChanged && mediaUri ? `Uploading ${Math.round(progress * 100)}%` : 'Saving…'}</Text></> : <><Text style={styles.primaryButtonText}>{selectedIsFuture ? (editingMemory ? 'Update upcoming' : 'Save upcoming') : editingMemory ? 'Update memory' : 'Save memory'}</Text><Ionicons name={selectedIsFuture ? 'calendar' : 'heart'} size={17} color="#fff" /></>}
          </TouchableOpacity>
          {editingMemory ? (
            <TouchableOpacity disabled={saving} onPress={() => onDeleteMemory(editingMemory)} style={styles.deleteEditorButton}>
              <Ionicons name="trash-outline" size={17} color="#c54867" />
              <Text style={styles.deleteEditorText}>{selectedIsFuture ? 'Delete upcoming' : 'Delete memory'}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
      <MonthYearPicker
        visible={monthPickerVisible}
        month={shownMonth.getMonth()}
        year={shownMonth.getFullYear()}
        onClose={() => setMonthPickerVisible(false)}
        onSelect={(month, year) => setShownMonth(new Date(year, month, 1))}
      />
    </KeyboardAvoidingView>
  );
}

export default function MemoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: Filter; view?: 'timeline' | 'upcoming' }>();
  const insets = useSafeAreaInsets();
  const apiUser = useAuthStore((state) => state.apiUser);
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<ApiMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ApiMemory | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<ApiMemory | null>(null);
  const [initialUpcoming, setInitialUpcoming] = useState<{ id: string; title: string; date: Date } | null>(null);
  const [futureDates, setFutureDates] = useState<ApiSpecialMoment[]>([]);
  const [pendingUploads, setPendingUploads] = useState<Record<string, {
    phase: 'saving' | 'preparing' | 'uploading';
    progress: number;
    detail?: string;
  }>>({});
  const timelineScrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      requestAnimationFrame(() => timelineScrollRef.current?.scrollTo({ y: 0, animated: false }));
      setLoading(true);
      void Promise.allSettled([memoriesApi.list(), specialMomentsApi.list()])
        .then(([memoryResult, momentResult]) => {
          if (active) {
            if (memoryResult.status === 'fulfilled') {
              setItems(memoryResult.value.memories.sort((a, b) => Date.parse(b.memoryAt) - Date.parse(a.memoryAt)));
            }
            if (momentResult.status === 'fulfilled') setFutureDates(momentResult.value.moments);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
        setComposerOpen(false);
        setEditingMemory(null);
        setInitialUpcoming(null);
        setPreview(null);
      };
    }, []),
  );

  useFocusEffect(useCallback(() => {
    if (params.filter && ['all', 'photos', 'videos', 'milestones'].includes(params.filter)) {
      setFilter(params.filter);
    }
    if (params.view === 'upcoming') {
      setEditingMemory(null);
      setInitialUpcoming(null);
      setComposerOpen(true);
      router.setParams({ view: 'timeline' });
    }
  }, [params.filter, params.view, router]));

  const filtered = useMemo(() => {
    const storyItems = items.filter((item) => !isFutureMemory(item));
    if (filter === 'photos') return storyItems.filter((item) => item.mediaType === 'image');
    if (filter === 'videos') return storyItems.filter((item) => item.mediaType === 'video');
    if (filter === 'milestones') return storyItems.filter((item) => item.isSpecialMoment);
    return storyItems;
  }, [filter, items]);

  const togetherSince = apiUser?.partnerKnownSince ?? apiUser?.partner?.partnerKnownSince;
  const bottomSpace = (Platform.OS === 'ios' ? 92 : 82) + insets.bottom;
  const sharedFutureDates = useMemo<ApiSpecialMoment[]>(() => {
    const birthdays: ApiSpecialMoment[] = [];
    if (apiUser?.dateOfBirth) birthdays.push({ id: `birthday-${apiUser.id}`, title: `${apiUser.name}'s Birthday`, momentAt: apiUser.dateOfBirth, creatorId: apiUser.id, creatorName: apiUser.name, createdAt: apiUser.dateOfBirth, canManage: false });
    if (apiUser?.partner?.dateOfBirth) birthdays.push({ id: `birthday-${apiUser.partner.id}`, title: `${apiUser.partner.name}'s Birthday`, momentAt: apiUser.partner.dateOfBirth, creatorId: apiUser.partner.id, creatorName: apiUser.partner.name, createdAt: apiUser.partner.dateOfBirth, canManage: false });
    return [...futureDates, ...birthdays];
  }, [apiUser, futureDates]);

  const requestDeleteMemory = (memory: ApiMemory, closeEditor = false) => {
    confirmDeleteItem(`Delete “${memory.title}”?`, () => {
      void memoriesApi.remove(memory.id)
        .then(() => {
          setItems((current) => current.filter((item) => item.id !== memory.id));
          useCoupleContentStore.getState().bump();
          if (closeEditor) {
            setComposerOpen(false);
            setEditingMemory(null);
            setInitialUpcoming(null);
            router.setParams({ view: 'timeline' });
          }
          smittenAlert({ title: 'Memory deleted', message: 'This memory has been removed.', tone: 'success' });
        })
        .catch((error) => smittenAlertFromError(error, 'Could not delete memory', 'error'));
    });
  };

  const startVideoMemoryUpload = (draft: VideoMemoryDraft) => {
    const isUpdate = Boolean(draft.existingMemory);
    const pendingId = draft.existingMemory?.id ?? `pending-memory-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: ApiMemory = {
      id: pendingId,
      title: draft.title,
      description: draft.description,
      imageUrl: draft.imageUri,
      mediaType: 'video',
      memoryAt: `${draft.memoryAt}T12:00:00.000Z`,
      isSpecialMoment: draft.isSpecialMoment,
      creatorId: draft.existingMemory?.creatorId ?? apiUser?.id ?? 'self',
      creatorName: draft.existingMemory?.creatorName ?? apiUser?.name ?? 'You',
      canManage: draft.existingMemory?.canManage ?? false,
      createdAt: draft.existingMemory?.createdAt ?? now,
      updatedAt: now,
    };
    setFilter('all');
    setItems((current) => {
      const next = [optimistic, ...current.filter((item) => item.id !== pendingId)];
      return next.sort((a, b) => Date.parse(b.memoryAt) - Date.parse(a.memoryAt));
    });
    setPendingUploads((current) => ({
      ...current,
      [pendingId]: { phase: 'saving', progress: 0 },
    }));
    setComposerOpen(false);
    setEditingMemory(null);
    setInitialUpcoming(null);
    router.setParams({ view: 'timeline' });
    requestAnimationFrame(() => timelineScrollRef.current?.scrollTo({ y: 0, animated: true }));

    void (async () => {
      let savedTextMemory: ApiMemory | null = null;
      try {
        if (draft.existingMemory) {
          const updated = await memoriesApi.update(draft.existingMemory.id, {
            title: draft.title,
            description: draft.description,
            memoryAt: draft.memoryAt,
            isSpecialMoment: draft.isSpecialMoment,
          });
          savedTextMemory = updated.memory;
        } else {
          const created = await memoriesApi.create({
            title: draft.title,
            description: draft.description,
            memoryAt: draft.memoryAt,
            isSpecialMoment: draft.isSpecialMoment,
          });
          savedTextMemory = created.memory;
        }
        const uploaded = await memoriesApi.update(savedTextMemory.id, {
          imageUri: draft.imageUri,
          mediaType: 'video',
          onProgress: ({ phase, progress, detail }) => {
            setPendingUploads((current) => ({
              ...current,
              [pendingId]: { phase, progress, detail },
            }));
          },
        });
        setItems((current) => [
          uploaded.memory,
          ...current.filter((item) => item.id !== pendingId),
        ].sort((a, b) => Date.parse(b.memoryAt) - Date.parse(a.memoryAt)));
        useCoupleContentStore.getState().bump();
        smittenAlert({
          title: isUpdate ? 'Memory updated' : 'Memory saved',
          message: 'Your video is ready in your memories.',
          tone: 'success',
        });
      } catch (error) {
        if (savedTextMemory) {
          setItems((current) => {
            const next = [savedTextMemory!, ...current.filter((item) => item.id !== pendingId)];
            return next.sort((a, b) => Date.parse(b.memoryAt) - Date.parse(a.memoryAt));
          });
          useCoupleContentStore.getState().bump();
          smittenAlertFromError(
            error,
            isUpdate
              ? 'Memory updated, but the video could not upload'
              : 'Memory saved, but the video could not upload',
            'warning',
          );
        } else if (draft.existingMemory) {
          setItems((current) => [
            draft.existingMemory!,
            ...current.filter((item) => item.id !== pendingId),
          ].sort((a, b) => Date.parse(b.memoryAt) - Date.parse(a.memoryAt)));
          smittenAlertFromError(error, 'Could not update memory', 'error');
        } else {
          setItems((current) => current.filter((item) => item.id !== pendingId));
          smittenAlertFromError(error, 'Could not save memory', 'error');
        }
      } finally {
        setPendingUploads((current) => {
          const next = { ...current };
          delete next[pendingId];
          return next;
        });
      }
    })();
  };

  if (composerOpen) {
    return (
      <MemoryComposer
        key={editingMemory?.id ?? initialUpcoming?.id ?? 'new-memory'}
        memoryDates={new Set(items.filter((item) => !isFutureMemory(item)).map((item) => item.memoryAt.slice(0, 10)))}
        futureDates={sharedFutureDates}
        futureMemories={items}
        editingMemory={editingMemory}
        initialUpcoming={initialUpcoming}
        onEditMemory={(memory) => {
          setInitialUpcoming(null);
          setEditingMemory(memory);
        }}
        onStartUpcoming={(item) => {
          setEditingMemory(null);
          setInitialUpcoming(item);
        }}
        onDeleteMemory={(memory) => requestDeleteMemory(memory, true)}
        onClose={() => {
          setComposerOpen(false);
          setEditingMemory(null);
          setInitialUpcoming(null);
          router.setParams({ view: 'timeline' });
        }}
        onSaved={(memory) => {
          setItems((current) => [memory, ...current.filter((item) => item.id !== memory.id)]);
          setComposerOpen(false);
          setEditingMemory(null);
          setInitialUpcoming(null);
          router.setParams({ view: 'timeline' });
        }}
        onVideoUploadStarted={startVideoMemoryUpload}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={22} color={UnMeColors.txDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memories</Text>
        <TouchableOpacity
          onPress={() => {
            setEditingMemory(null);
            setInitialUpcoming(null);
            setComposerOpen(true);
          }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={UnMeColors.txDark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.filtersScroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {(['all', 'photos', 'videos', 'milestones'] as Filter[]).map((item) => (
          <TouchableOpacity key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        ref={timelineScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
      >
        <View style={styles.daysCard}>
          <View style={styles.daysTopRow}>
            <Text style={styles.daysLabel}>Smittenz for</Text>
            <Ionicons name="heart" size={22} color="#e66a88" />
          </View>
          <Text style={styles.daysValue}>{daysTogether(togetherSince)} days</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={UnMeColors.m7} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={38} color="#d4bec7" />
            <Text style={styles.emptyTitle}>Your story starts here</Text>
            <Text style={styles.emptyText}>Tap +, choose a date and save your first memory.</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {filtered.map((item) => {
              const uri = memoryMediaUri(item);
              const mediaVersion = memoryMediaVersion(item);
              const pendingUpload = pendingUploads[item.id];
              return (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <Text style={styles.date}>{dateLabel(item.memoryAt)}</Text>
                  <View style={styles.memoryCard}>
                    {uri ? (
                      item.mediaType === 'video' ? (
                        pendingUpload ? (
                          <View style={styles.videoTile}>
                            <View style={[styles.media, styles.pendingVideoPlaceholder]}>
                              <Ionicons name="videocam-outline" size={42} color="rgba(255,255,255,0.72)" />
                            </View>
                            <View style={styles.uploadOverlay}>
                              <ActivityIndicator color="#fff" />
                              <Text style={styles.uploadLabel}>
                                {pendingUpload.phase === 'saving'
                                  ? item.id.startsWith('pending-memory-')
                                    ? 'Adding memory…'
                                    : 'Updating memory…'
                                  : pendingUpload.phase === 'preparing'
                                    ? pendingUpload.detail ?? 'Optimizing video…'
                                    : `Uploading ${Math.round(pendingUpload.progress * 100)}%`}
                              </Text>
                              <View style={styles.uploadTrack}>
                                <View
                                  style={[
                                    styles.uploadFill,
                                    { width: `${Math.max(4, pendingUpload.progress * 100)}%` },
                                  ]}
                                />
                              </View>
                            </View>
                          </View>
                        ) : (
                          <MemoryVideoTile
                            uri={uri}
                            cacheKey={`memory-video-${item.id}-${mediaVersion}`}
                          />
                        )
                      ) : (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setPreview(item)}>
                          <AuthedMediaImage uri={uri} recyclingKey={`memory-${item.id}-${mediaVersion}`} mediaCacheKey={`memory-${item.id}-${mediaVersion}`} style={styles.media} contentFit="contain" />
                        </TouchableOpacity>
                      )
                    ) : null}
                    <View style={styles.memoryCopy}>
                      {!pendingUpload ? <View style={styles.memoryActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setInitialUpcoming(null);
                            setEditingMemory(item);
                            setComposerOpen(true);
                          }}
                          style={styles.memoryActionButton}
                        >
                          <Ionicons name="create-outline" size={18} color="#b6516c" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => requestDeleteMemory(item)} style={[styles.memoryActionButton, styles.memoryDeleteButton]}>
                          <Ionicons name="trash-outline" size={17} color="#c54867" />
                        </TouchableOpacity>
                      </View> : null}
                      {item.isSpecialMoment ? (
                        <View style={styles.milestoneBadge}>
                          <Ionicons name="star" size={11} color="#d95273" />
                          <Text style={styles.milestoneBadgeText}>Milestone</Text>
                        </View>
                      ) : null}
                      <Text style={styles.memoryTitle} numberOfLines={2}>{item.title}</Text>
                      {item.description ? <Text style={styles.memoryText}>{item.description}</Text> : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <FullscreenMediaModal
        visible={Boolean(preview)}
        uri={preview ? memoryMediaUri(preview) : null}
        mediaType={preview?.mediaType === 'video' ? 'video' : 'image'}
        recyclingKey={preview ? `memory-full-${preview.id}-${memoryMediaVersion(preview)}` : undefined}
        mediaCacheKey={preview ? `memory-full-${preview.id}-${memoryMediaVersion(preview)}` : undefined}
        onClose={() => setPreview(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 74, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  headerButton: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25, lineHeight: 36, paddingTop: 2 },
  addButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  filtersScroll: { flexGrow: 0, flexShrink: 0, height: 58 },
  filters: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  filter: { height: 36, justifyContent: 'center', paddingHorizontal: 17, borderRadius: 18 },
  filterActive: { backgroundColor: '#e56582' },
  filterText: { color: '#9e909c', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  content: { paddingHorizontal: 24, paddingTop: 14 },
  daysCard: { minHeight: 112, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#f2e7ea', borderRadius: 22, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 17, marginBottom: 22, shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  daysTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  daysLabel: { color: '#a7929d', fontFamily: 'Inter_500Medium', fontSize: 13 },
  daysValue: { marginTop: 13, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 27 },
  loader: { paddingVertical: 70 },
  timeline: { borderLeftWidth: 1.5, borderLeftColor: '#f0cbd4', marginLeft: 8, paddingLeft: 16 },
  timelineItem: { marginBottom: 24 },
  timelineDot: { position: 'absolute', left: -23, top: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: '#e56582', borderWidth: 3, borderColor: '#fff' },
  date: { marginBottom: 9, color: '#dc5e7c', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.5 },
  memoryCard: { overflow: 'hidden', borderRadius: 20, backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.07, shadowRadius: 15, elevation: 3 },
  media: { width: '100%', height: 260, backgroundColor: '#faf5f6' },
  videoTile: { position: 'relative', width: '100%', height: 260, overflow: 'hidden', backgroundColor: '#171419' },
  pendingVideoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#171419' },
  videoTapLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  videoPlayButton: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', paddingLeft: 4, backgroundColor: 'rgba(20,8,14,0.72)' },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 38, backgroundColor: 'rgba(20,8,14,0.62)' },
  uploadLabel: { marginTop: 10, color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  uploadTrack: { width: '100%', height: 5, overflow: 'hidden', borderRadius: 3, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.28)' },
  uploadFill: { height: '100%', borderRadius: 3, backgroundColor: '#f48aa1' },
  memoryCopy: { position: 'relative', padding: 16 },
  memoryActions: { position: 'absolute', right: 12, top: 12, zIndex: 2, flexDirection: 'row', gap: 7 },
  memoryActionButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbe9ee' },
  memoryDeleteButton: { backgroundColor: '#fff1f3' },
  milestoneBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 9, backgroundColor: '#fde9ee' },
  milestoneBadgeText: { color: '#d95273', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.3 },
  memoryTitle: { paddingRight: 82, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17 },
  memoryText: { marginTop: 7, color: '#9b8792', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  empty: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 30 },
  emptyTitle: { marginTop: 14, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 21 },
  emptyText: { marginTop: 7, color: '#9b8792', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  composerScreen: { flex: 1, backgroundColor: '#fff' },
  composerHeader: { minHeight: 94, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  composerHeading: { flex: 1, alignItems: 'center' },
  composerTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25, lineHeight: 36, textAlign: 'center' },
  composerStep: { marginTop: 2, color: '#a18d97', fontFamily: 'Inter_500Medium', fontSize: 10 },
  composerContent: { paddingHorizontal: 24, paddingTop: 16 },
  calendarCard: { borderWidth: 1, borderColor: '#f0e3e7', borderRadius: 24, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 14, backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  monthArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#fbf5f7' },
  monthPickerButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff8fa' },
  monthTitle: { color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', marginBottom: 8, color: '#b2a1a9', fontFamily: 'Inter_600SemiBold', fontSize: 11, textAlign: 'center' },
  dayCell: { width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' },
  dayBubble: { width: 38, height: 38, aspectRatio: 1, overflow: 'hidden', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dayBubbleActive: { backgroundColor: '#e56582' },
  dayText: { color: '#4b3d44', fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  dayTextActive: { color: '#fff', fontFamily: 'Inter_700Bold' },
  dayMarkers: { position: 'absolute', bottom: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  futureDayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8e7cda' },
  futureDayDotActive: { backgroundColor: '#fff' },
  calendarLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f1e4e8', paddingTop: 12, marginTop: 9 },
  calendarLegendText: { color: '#a28e98', fontFamily: 'Inter_500Medium', fontSize: 10 },
  legendFutureDot: { width: 7, height: 7, borderRadius: 4, marginLeft: 8, backgroundColor: '#8e7cda' },
  selectedDateCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f2e3e7', borderRadius: 19, paddingHorizontal: 14, marginTop: 18, backgroundColor: '#fffafb' },
  selectedDateIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#fde8ed' },
  selectedDateLabel: { color: '#b29fa8', fontFamily: 'Inter_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  selectedDateValue: { marginTop: 4, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 14 },
  primaryButton: { ...smittenGlassButton, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 17, marginTop: 20 },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  deleteEditorButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#efcdd6', borderRadius: 16, marginTop: 11, backgroundColor: '#fff8fa' },
  deleteEditorText: { color: '#c54867', fontFamily: 'Inter_700Bold', fontSize: 13 },
  composerUpcomingSection: { marginTop: 25 },
  composerUpcomingHeading: { marginBottom: 10, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  composerUpcomingCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#efe1e5', borderRadius: 18, paddingHorizontal: 11, marginBottom: 9, backgroundColor: '#fff' },
  composerUpcomingCardActive: { borderWidth: 1.5, borderColor: '#9d82db', backgroundColor: '#faf8ff' },
  composerUpcomingDate: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#fee8ec' },
  composerUpcomingMonth: { color: '#da607b', fontFamily: 'Inter_700Bold', fontSize: 8 },
  composerUpcomingDay: { marginTop: 1, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17 },
  composerUpcomingTitle: { flex: 1, paddingHorizontal: 12, color: UnMeColors.txDark, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 14 },
  upcomingEditButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee9fa' },
  fieldLabel: { marginLeft: 3, marginBottom: 8, color: '#a18d97', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  textField: { minHeight: 54, borderWidth: 1, borderColor: '#efdde2', borderRadius: 17, paddingHorizontal: 16, marginBottom: 20, color: UnMeColors.txDark, fontFamily: 'Inter_500Medium', fontSize: 14, backgroundColor: '#fff8f9' },
  storyField: { minHeight: 118, paddingTop: 15, paddingBottom: 15 },
  upcomingOnlyCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ded6f4', borderRadius: 19, paddingHorizontal: 14, backgroundColor: '#f8f5ff' },
  upcomingOnlyIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#ece7fb' },
  upcomingOnlyTitle: { color: UnMeColors.txDark, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  upcomingOnlyText: { marginTop: 4, color: '#8f8198', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  milestoneToggle: { minHeight: 82, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#efdee3', borderRadius: 19, paddingHorizontal: 13, marginBottom: 22, backgroundColor: '#fff' },
  milestoneToggleActive: { borderColor: '#e990a5', backgroundColor: '#fff6f8' },
  milestoneIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fde9ee' },
  milestoneIconActive: { backgroundColor: '#e56582' },
  milestoneCopy: { flex: 1, paddingHorizontal: 12 },
  milestoneTitle: { color: UnMeColors.txDark, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  milestoneHint: { marginTop: 3, color: '#a6929b', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14 },
  toggleTrack: { width: 42, height: 24, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 3, backgroundColor: '#e6dce0' },
  toggleTrackActive: { backgroundColor: '#e56582' },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', shadowColor: '#4b1c2d', shadowOpacity: 0.14, shadowRadius: 3, elevation: 2 },
  toggleKnobActive: { alignSelf: 'flex-end' },
  mediaPicker: { minHeight: 160, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#edcfd7', borderRadius: 20, padding: 12, backgroundColor: '#fffafb' },
  selectedMedia: { width: '100%', height: 280, borderRadius: 14, backgroundColor: '#faf5f6' },
  selectedVideoCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#eadde1', borderRadius: 20, padding: 8, backgroundColor: '#171419' },
  selectedVideo: { width: '100%', height: 280, borderRadius: 14, backgroundColor: '#171419' },
  changeMediaButton: { ...smittenGlassButton, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, marginTop: 8 },
  changeMediaText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  removeMediaButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#efcdd6', borderRadius: 15, marginTop: 10, backgroundColor: '#fff8fa' },
  removeMediaText: { color: '#c54867', fontFamily: 'Inter_700Bold', fontSize: 12 },
  mediaPickerIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbe7ec' },
  mediaPickerTitle: { marginTop: 11, color: UnMeColors.txDark, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  mediaPickerText: { marginTop: 5, color: '#a5909a', fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center' },
});
