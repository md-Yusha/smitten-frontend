import { AuthedMediaImage } from '@/src/components/media/AuthedMediaImage';
import { AuthedMediaVideo } from '@/src/components/media/AuthedMediaVideo';
import { CircularCountdownBadge } from '@/src/components/media/CircularCountdownBadge';
import { FullscreenMediaModal } from '@/src/components/media/FullscreenMediaModal';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { PinSetupModal } from '@/src/components/ui/PinSetupModal';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { usePrivacyScreen } from '@/src/hooks/usePrivacyScreen';
import { ApiError } from '@/src/services/api';
import { getAuthMediaHeaders } from '@/src/services/authMediaHeaders';
import { formatApiError } from '@/src/services/formatApiError';
import { prefetchVaultItems } from '@/src/services/mediaPrefetch';
import { vaultApi, vaultItemMediaUrl, type VaultItem } from '@/src/services/vaultApi';
import { editVideoForUpload } from '@/src/services/videoEditor';
import { readVaultCache, writeVaultCache } from '@/src/services/vaultCache';
import { getMemoryVault } from '@/src/store/contentMemoryCache';
import { useCoupleContentStore } from '@/src/store/coupleContentStore';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { getPartnerChatLabel, useAuthStore } from '@/src/store/useAuthStore';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

function uniqueVaultItems(items: VaultItem[]): VaultItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const VAULT_DURATION_PRESETS = [
  { label: '10 sec', value: 10_000 },
  { label: '30 sec', value: 30_000 },
  { label: '1 min', value: 60_000 },
  { label: '5 min', value: 300_000 },
] as const;

function formatVaultDuration(value: number) {
  if (value < 60_000) return `${Math.round(value / 1000)} seconds`;
  if (value < 3_600_000) return `${Math.round(value / 60_000)} ${Math.round(value / 60_000) === 1 ? 'minute' : 'minutes'}`;
  return `${Math.round(value / 3_600_000)} ${Math.round(value / 3_600_000) === 1 ? 'hour' : 'hours'}`;
}

export default function VaultScreen() {
  const router = useRouter();
  const memoryVault = getMemoryVault();
  const [activeTab, setActiveTab] = useState<'space' | 'mine' | 'partner'>('space');
  const [items, setItems] = useState<VaultItem[]>(() => uniqueVaultItems(memoryVault ?? []));
  const [loading, setLoading] = useState(!(memoryVault?.length));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ phase: 'preparing' | 'uploading'; progress: number } | null>(null);
  const [previewItem, setPreviewItem] = useState<VaultItem | null>(null);
  const [pinSetupVisible, setPinSetupVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [openingItemId, setOpeningItemId] = useState<string | null>(null);
  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [pendingShareIds, setPendingShareIds] = useState<string[]>([]);
  const [shareDurationChoice, setShareDurationChoice] = useState<'10000' | '30000' | '60000' | '300000' | 'custom'>('30000');
  const [customShareValue, setCustomShareValue] = useState('30');
  const [customShareUnit, setCustomShareUnit] = useState<'seconds' | 'minutes' | 'hours'>('seconds');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const itemsRef = useRef<VaultItem[]>(items);
  const vaultScrollRef = useRef<ScrollView>(null);
  itemsRef.current = items;

  usePrivacyScreen(true);
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();
  const tabContentBottomPadding = (Platform.OS === 'ios' ? 72 : 62) + Math.max(insets.bottom, 12) + 18;
  const user = useAuthStore((s) => s.user);
  const apiUser = useAuthStore((s) => s.apiUser);
  const selfId = apiUser?.id ?? '';
  const revision = useCoupleContentStore((s) => s.revision);
  const bumpContent = useCoupleContentStore((s) => s.bump);
  const partnerLabel = getPartnerChatLabel(user);
  const chosenShareDurationMs = useMemo(() => {
    if (shareDurationChoice !== 'custom') return Number(shareDurationChoice);
    const amount = Number(customShareValue);
    const multiplier = customShareUnit === 'hours' ? 3_600_000 : customShareUnit === 'minutes' ? 60_000 : 1000;
    return Math.round(amount * multiplier);
  }, [customShareUnit, customShareValue, shareDurationChoice]);

  const appLockEnabled = useAppLockStore((s) => s.enabled);
  const appLockHasPin = useAppLockStore((s) => s.hasPin);
  const appLockHydrated = useAppLockStore((s) => s.isHydrated);
  const saveAppLockPin = useAppLockStore((s) => s.savePin);
  const hydrateAppLock = useAppLockStore((s) => s.hydrate);
  const vaultLockReady = appLockEnabled && appLockHasPin;

  useFocusEffect(useCallback(() => {
    requestAnimationFrame(() => vaultScrollRef.current?.scrollTo({ y: 0, animated: false }));
    return () => {
      setPreviewItem(null);
      setPinSetupVisible(false);
      setShareDialogVisible(false);
      setPendingShareIds([]);
      setSelectedIds(new Set());
    };
  }, []));

  useEffect(() => {
    hydrateAppLock();
  }, [hydrateAppLock]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setItems((prev) =>
      uniqueVaultItems(prev.filter((item) => !item.expiresAt || new Date(item.expiresAt).getTime() > now)),
    );
  }, [now]);

  const loadVault = useCallback(
    async (opts?: { silent?: boolean }) => {
      const coupleId = apiUser?.coupleId;
      if (!coupleId) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (!opts?.silent && itemsRef.current.length === 0) setLoading(true);
      try {
        const { items: list } = await vaultApi.list();
        const normalized = uniqueVaultItems(list);
        setItems(normalized);
        void writeVaultCache(coupleId, normalized);
        prefetchVaultItems(normalized, { selfId });
        prefetchVaultItems(normalized, { partnerOnly: true, selfId });
      } catch {
        /* keep previous */
      } finally {
        setLoading(false);
      }
    },
    [apiUser?.coupleId, selfId],
  );

  const lockApp = useAppLockStore((s) => s.lock);
  const vaultFocused = useRef(false);
  const handlePinComplete = useCallback(
    (pin: string) => {
      void saveAppLockPin(pin).then(() => {
        setPinSetupVisible(false);
        requestAnimationFrame(() => lockApp());
      });
    },
    [lockApp, saveAppLockPin],
  );

  useFocusEffect(
    useCallback(() => {
      vaultFocused.current = true;

      if (!vaultLockReady) {
        setLoading(false);
        return () => {
          vaultFocused.current = false;
        };
      }

      if (vaultLockReady) {
        lockApp();
      }

      void getAuthMediaHeaders();
      const coupleId = apiUser?.coupleId;
      if (!coupleId) return;

      void (async () => {
        if (itemsRef.current.length === 0) {
          const cached = await readVaultCache(coupleId);
          if (cached?.length) {
            const normalized = uniqueVaultItems(cached);
            setItems(normalized);
            setLoading(false);
            prefetchVaultItems(normalized, { selfId });
            prefetchVaultItems(normalized, { partnerOnly: true, selfId });
          }
        }
        await loadVault({ silent: itemsRef.current.length > 0 });
      })();

      return () => {
        vaultFocused.current = false;
      };
    }, [vaultLockReady, lockApp, loadVault, apiUser?.coupleId, selfId]),
  );

  useEffect(() => {
    if (vaultFocused.current && vaultLockReady) {
      lockApp();
    }
  }, [vaultLockReady, lockApp]);

  useEffect(() => {
    if (previewItem?.expiresAt && new Date(previewItem.expiresAt).getTime() <= now) {
      setPreviewItem(null);
    }
  }, [now, previewItem?.expiresAt]);

  useEffect(() => {
    if (!vaultLockReady) return;
    if (revision === 0) return;
    void loadVault({ silent: true });
  }, [revision, loadVault, vaultLockReady]);

  const visibleItems = uniqueVaultItems(
    items.filter((item) => !item.expiresAt || new Date(item.expiresAt).getTime() > now),
  );
  const mySpaceItems = visibleItems.filter((i) => i.uploaderId === selfId && (i.visibility ?? 'SHARED') === 'PRIVATE');
  const mineItems = visibleItems.filter((i) => i.uploaderId === selfId && (i.visibility ?? 'SHARED') === 'SHARED');
  const partnerItems = visibleItems.filter((i) => i.uploaderId !== selfId && (i.visibility ?? 'SHARED') === 'SHARED');
  const photosToDisplay =
    activeTab === 'space'
      ? mySpaceItems
      : activeTab === 'mine'
        ? mineItems
        : partnerItems;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    if (!vaultLockReady) return;
    if (activeTab !== 'space') {
      void loadVault({ silent: true });
    }
  }, [activeTab, loadVault, vaultLockReady]);

  useEffect(() => {
    if (activeTab === 'partner' && partnerItems.length > 0) {
      prefetchVaultItems(partnerItems);
    } else if (activeTab === 'space' && mySpaceItems.length > 0) {
      prefetchVaultItems(mySpaceItems, { selfId });
    }
  }, [activeTab, mySpaceItems, partnerItems, selfId]);

  const handleDelete = async (item: VaultItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await vaultApi.remove(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      bumpContent();
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        bumpContent();
        return;
      }
      Alert.alert('Delete failed', formatApiError(e));
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadVault({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadVault]);

  const handleUpload = async () => {
    if (!apiUser?.coupleId) {
      smittenAlert({
        title: 'Not linked',
        message: 'Connect with your partner using your couple key first.',
        tone: 'warning',
      });
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    useAppLockStore.getState().setSystemOverlayActive(true);
    try {
      const mediaTypes: ('images' | 'videos')[] = ['images', 'videos'];
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        quality: 1,
        videoMaxDuration: 120,
        allowsMultipleSelection: true,
      });
      if (res.canceled || res.assets.length === 0) return;

      setUploading(true);
      try {
        const uploaded: VaultItem[] = [];
        for (const asset of res.assets) {
          if (!asset.uri) continue;
          let uploadUri = asset.uri;
          if (asset.type === 'video') {
            const editedUri = await editVideoForUpload(asset.uri);
            if (!editedUri) continue;
            uploadUri = editedUri;
          }
          const kind = asset.type === 'video' ? 'video' : 'image';
          const { item } = await vaultApi.upload(uploadUri, kind, setUploadProgress);
          uploaded.push(item);
        }
        if (uploaded.length > 0) {
          setItems((prev) => uniqueVaultItems([...uploaded, ...prev]));
          await loadVault({ silent: true });
        }
        bumpContent();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        smittenAlertFromError(e, 'Upload failed', 'error');
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    } finally {
      useAppLockStore.getState().setSystemOverlayActive(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShareItems = async (ids: string[], durationMs: number) => {
    if (ids.length === 0 || sharing) return false;
    setSharing(true);
    try {
      const shared: VaultItem[] = [];
      for (const id of ids) {
        try {
          const { item } = await vaultApi.share(id, durationMs);
          shared.push(item);
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) {
            setItems((prev) => prev.filter((entry) => entry.id !== id));
          }
          throw e;
        }
      }
      if (shared.length === 0) {
        await loadVault({ silent: true });
        return false;
      }
      setItems((prev) => {
        const sharedIds = new Set(shared.map((item) => item.id));
        return uniqueVaultItems([...shared, ...prev.filter((item) => !sharedIds.has(item.id))]);
      });
      setSelectedIds(new Set());
      setActiveTab('mine');
      bumpContent();
      await loadVault({ silent: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      smittenAlert({
        title: 'Shared with partner',
        message: `${shared.length} ${shared.length === 1 ? 'item is' : 'items are'} waiting for ${partnerLabel}. The ${formatVaultDuration(durationMs)} timer starts when they open it.`,
        tone: 'success',
      });
      return true;
    } catch (e) {
      smittenAlertFromError(e, 'Share failed', 'error');
      return false;
    } finally {
      setSharing(false);
    }
  };

  const openShareDialog = (ids: string[]) => {
    if (!ids.length || sharing) return;
    const preferred = apiUser?.vaultDisappearingAfterMs;
    if (preferred && preferred >= 5_000 && preferred <= 86_400_000) {
      if (VAULT_DURATION_PRESETS.some((option) => option.value === preferred)) {
        setShareDurationChoice(String(preferred) as '10000' | '30000' | '60000' | '300000');
      } else {
        setShareDurationChoice('custom');
        if (preferred % 3_600_000 === 0) {
          setCustomShareValue(String(preferred / 3_600_000));
          setCustomShareUnit('hours');
        } else if (preferred % 60_000 === 0) {
          setCustomShareValue(String(preferred / 60_000));
          setCustomShareUnit('minutes');
        } else {
          setCustomShareValue(String(Math.round(preferred / 1000)));
          setCustomShareUnit('seconds');
        }
      }
    }
    setPendingShareIds(ids);
    setShareDialogVisible(true);
  };

  const confirmTimedShare = async () => {
    if (!Number.isFinite(chosenShareDurationMs) || chosenShareDurationMs < 5_000 || chosenShareDurationMs > 86_400_000) {
      smittenAlert({ title: 'Choose a valid time', message: 'Use a viewing time between 5 seconds and 24 hours.', tone: 'warning' });
      return;
    }
    const shared = await handleShareItems(pendingShareIds, chosenShareDurationMs);
    if (shared) {
      setShareDialogVisible(false);
      setPendingShareIds([]);
    }
  };

  const handleOpenItem = async (item: VaultItem) => {
    setPreviewItem(item);
    const shouldStartTimer =
      item.visibility === 'SHARED' &&
      item.uploaderId !== selfId &&
      !item.expiresAt;

    if (!shouldStartTimer || openingItemId === item.id) return;

    setOpeningItemId(item.id);
    try {
      const { item: updated } = await vaultApi.open(item.id);
      setItems((prev) => uniqueVaultItems(prev.map((entry) => (entry.id === updated.id ? updated : entry))));
      setPreviewItem(updated);
    } catch (e) {
      smittenAlertFromError(e, 'Could not open image', 'error');
    } finally {
      setOpeningItemId(null);
    }
  };

  const handleMediaError = useCallback(
    (item: VaultItem) => {
      if ((item.visibility ?? 'SHARED') === 'SHARED') {
        void loadVault({ silent: true });
      }
    },
    [loadVault],
  );

  if (!appLockHydrated) {
    return (
      <View style={styles.whiteVaultScreen} className="items-center justify-center">
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  if (!vaultLockReady) {
    return (
      <View style={styles.whiteVaultScreen}>
        <View style={[styles.whiteVaultHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={styles.whiteVaultBack}>
            <Feather name="chevron-left" size={23} color="#2b1b25" />
          </TouchableOpacity>
          <Text style={styles.whiteVaultTitle}>Vault</Text>
          <View style={styles.whiteVaultBack} />
        </View>

        <View style={styles.whiteVaultGate}>
          <View style={styles.whiteVaultIcon}>
            <Feather name="lock" size={32} color="#a287e4" />
          </View>
          <Text style={styles.whiteVaultGateTitle}>Private & secure</Text>
          <Text style={styles.whiteVaultGateText}>
            Your most personal memories, letters and surprises — just for the two of you.
          </Text>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              void Haptics.selectionAsync();
              setPinSetupVisible(true);
            }}
            style={styles.whiteVaultButton}
          >
            <Feather name="shield" size={17} color="#fff" />
            <Text style={styles.whiteVaultButtonText}>Set PIN & secure Vault</Text>
          </TouchableOpacity>
        </View>

        <PinSetupModal
          visible={pinSetupVisible}
          onDismiss={() => setPinSetupVisible(false)}
          onComplete={handlePinComplete}
        />
      </View>
    );
  }

  return (
    <View style={styles.whiteVaultScreen}>
      <ScrollView
        ref={vaultScrollRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={themeColor}
            colors={[themeColor]}
          />
        }
        contentContainerStyle={{ paddingBottom: tabContentBottomPadding, paddingTop: 0 }}
      >
        <View style={[styles.unlockedHeader, { paddingTop: insets.top + 10 }]}> 
          <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={styles.whiteVaultBack}>
            <Feather name="chevron-left" size={23} color="#2b1b25" />
          </TouchableOpacity>
          <View style={styles.unlockedTitleWrap}>
            <Text style={styles.whiteVaultTitle}>Vault</Text>
            <Text style={styles.unlockedSubtitle}>Private & secure</Text>
          </View>
          <View style={styles.privateBadge}>
            <Feather name="shield" size={12} color={themeColor} />
          </View>
        </View>

        <View style={styles.vaultSummary}>
          <Text style={styles.vaultCount}>
            {mySpaceItems.length} private · {mineItems.length + partnerItems.length} temporary shared
          </Text>

          <View style={styles.vaultTabs}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('space');
              }}
              style={[styles.vaultTab, activeTab === 'space' && { backgroundColor: themeColor }]}
            >
              <Text style={[styles.vaultTabText, activeTab === 'space' && styles.vaultTabTextActive]}>
                My Space
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('mine');
              }}
              style={[styles.vaultTab, activeTab === 'mine' && { backgroundColor: themeColor }]}
            >
              <Text style={[styles.vaultTabText, activeTab === 'mine' && styles.vaultTabTextActive]}>
                From Me
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('partner');
              }}
              style={[styles.vaultTab, activeTab === 'partner' && { backgroundColor: themeColor }]}
            >
              <Text numberOfLines={1} style={[styles.vaultTabText, activeTab === 'partner' && styles.vaultTabTextActive]}>
                From {partnerLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5 pt-4">
          {activeTab === 'space' && (
            <TouchableOpacity activeOpacity={0.88} onPress={handleUpload} disabled={uploading}>
              <View
                className="mb-6 py-7 items-center justify-center"
                style={{
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: themeColor,
                  borderRadius: 24,
                  backgroundColor: '#ffffff',
                }}
              >
                {uploading ? (
                  <View style={{ alignItems: 'center' }}>
                    <ActivityIndicator color={themeColor} />
                    <Text className="font-sans-semibold text-sm text-ink mt-2">
                      {uploadProgress?.phase === 'preparing' ? 'Compressing video…' : 'Uploading…'}
                    </Text>
                    <Text className="font-sans text-xs text-muted mt-1">
                      {Math.round((uploadProgress?.progress ?? 0) * 100)}%
                    </Text>
                  </View>
                ) : (
                  <>
                    <Feather name="image" size={32} color={themeColor} />
                    <Text className="font-sans-bold text-lg text-ink mt-3">
                      Add Media to My Space
                    </Text>
                    <Text className="font-sans text-sm text-muted text-center px-4 mt-1">
                      Pick photos or videos. Only you can see them until you share.
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}

          {activeTab === 'space' && selectedIds.size > 0 ? (
            <View style={[styles.selectionBar, { borderColor: `${themeColor}30` }]}>
              <Text className="font-sans-bold text-ink">{selectedIds.size} selected</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setSelectedIds(new Set())}
                  className="rounded-full border border-stone-200 px-3 py-2"
                >
                  <Text className="font-sans-semibold text-xs text-muted">Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={sharing}
                  onPress={() => openShareDialog(Array.from(selectedIds))}
                  className="rounded-full px-4 py-2"
                  style={{ backgroundColor: themeColor, opacity: sharing ? 0.65 : 1 }}
                >
                  <Text className="font-sans-bold text-xs text-white">{sharing ? 'Sharing...' : 'Share'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {loading && photosToDisplay.length === 0 ? (
            <View className="items-center py-12">
              <ActivityIndicator color={themeColor} />
            </View>
          ) : photosToDisplay.length === 0 ? (
            <GlassCard className="items-center p-8">
              <Feather name="image" size={32} color={themeColor} />
              <Text className="mt-4 text-center font-sans-semibold text-ink">
                {activeTab === 'space'
                  ? 'My Space is empty'
                  : activeTab === 'mine'
                    ? 'No temporary images from you'
                    : `${partnerLabel} hasn't shared yet`}
              </Text>
              <Text className="mt-2 text-center text-sm font-sans leading-5 text-muted">
                {activeTab === 'space'
                  ? 'Add private images here, then long press to select and share with your partner.'
                  : activeTab === 'mine'
                    ? 'Items you share from My Space disappear after the viewing time you choose.'
                    : 'Shared items disappear after their selected viewing time.'}
              </Text>
            </GlassCard>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {photosToDisplay.map((item) => (
                <View key={item.id} className="relative mb-4 w-[48%]">
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => {
                      if (activeTab === 'space' && selectedIds.size > 0) {
                        toggleSelected(item.id);
                        return;
                      }
                      void handleOpenItem(item);
                    }}
                    onLongPress={() => {
                      if (activeTab === 'space') {
                        Haptics.selectionAsync();
                        toggleSelected(item.id);
                      }
                    }}
                    style={styles.touchable}
                  >
                    {item.mediaType === 'video' ? (
                      <>
                        <AuthedMediaVideo
                          uri={vaultItemMediaUrl(item)}
                          cacheKey={`vault-video-${item.id}`}
                          style={styles.thumb}
                          contentFit="cover"
                          onError={() => handleMediaError(item)}
                        />
                        <View pointerEvents="none" style={styles.videoPlayBadge}>
                          <Feather name="play" size={24} color="#fff" />
                        </View>
                        {activeTab !== 'space' ? (
                          <View pointerEvents="none" style={styles.videoPrivacyCover}>
                            <Feather name="eye-off" size={24} color="#fff" />
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <AuthedMediaImage
                        uri={vaultItemMediaUrl(item)}
                        recyclingKey={`vault-thumb-${item.id}`}
                        mediaCacheKey={`vault-${item.id}`}
                        priority={activeTab === 'partner' ? 'high' : 'normal'}
                        style={styles.thumb}
                        contentFit="cover"
                        blurRadius={activeTab === 'space' ? 0 : 40}
                        onError={() => handleMediaError(item)}
                      />
                    )}
                    {openingItemId === item.id ? (
                      <View style={styles.openingOverlay}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.openingText}>Starting timer...</Text>
                      </View>
                    ) : null}
                    {selectedIds.has(item.id) ? (
                      <View style={[styles.selectedOverlay, { borderColor: themeColor }]}>
                        <View style={[styles.selectedCheck, { backgroundColor: themeColor }]}>
                          <Feather name="check" size={16} color="#fff" />
                        </View>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                  {item.expiresAt ? (
                    <View style={styles.cornerCountdown}>
                      <CircularCountdownBadge
                        seconds={Math.ceil(Math.max(0, new Date(item.expiresAt).getTime() - now) / 1000)}
                        progress={Math.max(0, Math.min(1, (new Date(item.expiresAt).getTime() - now) / (item.disappearingAfterMs ?? 30_000)))}
                        color={themeColor}
                        size={46}
                      />
                    </View>
                  ) : null}
                  {activeTab === 'space' && item.uploaderId === selfId ? (
                    <TouchableOpacity
                      disabled={sharing}
                      onPress={() => openShareDialog([item.id])}
                      className="absolute left-2 bottom-2 h-9 w-9 items-center justify-center rounded-full bg-ink/60"
                    >
                      <Feather name="send" size={15} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                  {item.uploaderId === selfId && (
                    <TouchableOpacity
                      onPress={() => void handleDelete(item)}
                      className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-ink/55"
                    >
                      <Feather name="trash-2" size={14} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <FullscreenMediaModal
        visible={!!previewItem}
        uri={previewItem ? vaultItemMediaUrl(previewItem) : null}
        mediaCacheKey={previewItem ? `vault-${previewItem.id}` : undefined}
        recyclingKey={previewItem ? `vault-full-${previewItem.id}` : undefined}
        blockScreenshots
        countdownExpiresAt={previewItem?.expiresAt ?? null}
        countdownNow={now}
        countdownTotalMs={previewItem?.disappearingAfterMs ?? 30_000}
        countdownColor={themeColor}
        mediaType={previewItem?.mediaType ?? 'image'}
        onMediaError={() => {
          if (previewItem) handleMediaError(previewItem);
        }}
        onClose={() => setPreviewItem(null)}
      />

      <Modal visible={shareDialogVisible} transparent animationType="slide" onRequestClose={() => setShareDialogVisible(false)}>
        <KeyboardAvoidingView style={styles.shareModalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.shareSheet}>
            <View style={styles.shareSheetHandle} />
            <View style={styles.shareSheetHeader}>
              <View>
                <Text style={styles.shareSheetTitle}>Share temporarily</Text>
                <Text style={styles.shareSheetSubtitle}>{pendingShareIds.length} {pendingShareIds.length === 1 ? 'item' : 'items'} selected</Text>
              </View>
              <TouchableOpacity onPress={() => setShareDialogVisible(false)} style={styles.shareSheetClose}>
                <Feather name="x" size={20} color="#806b75" />
              </TouchableOpacity>
            </View>

            <View style={styles.timerNotice}>
              <View style={styles.timerNoticeIcon}><Feather name="clock" size={19} color="#9577dc" /></View>
              <Text style={styles.timerNoticeText}>The timer starts only when {partnerLabel} opens the shared item.</Text>
            </View>

            <Text style={styles.shareTimerLabel}>VIEWING TIME</Text>
            <View style={styles.durationOptions}>
              {VAULT_DURATION_PRESETS.map((option) => {
                const value = String(option.value) as '10000' | '30000' | '60000' | '300000';
                const active = shareDurationChoice === value;
                return (
                  <TouchableOpacity key={option.value} onPress={() => setShareDurationChoice(value)} style={[styles.durationChip, active && styles.durationChipActive]}>
                    <Text style={[styles.durationChipText, active && styles.durationChipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => setShareDurationChoice('custom')} style={[styles.durationChip, shareDurationChoice === 'custom' && styles.durationChipActive]}>
                <Text style={[styles.durationChipText, shareDurationChoice === 'custom' && styles.durationChipTextActive]}>Custom</Text>
              </TouchableOpacity>
            </View>

            {shareDurationChoice === 'custom' ? (
              <View style={styles.customDurationRow}>
                <TextInput
                  value={customShareValue}
                  onChangeText={(value) => setCustomShareValue(value.replace(/[^0-9.]/g, '').slice(0, 6))}
                  keyboardType="decimal-pad"
                  placeholder="30"
                  placeholderTextColor="#b8a6af"
                  style={styles.customDurationInput}
                />
                <View style={styles.customUnitOptions}>
                  {(['seconds', 'minutes', 'hours'] as const).map((unit) => (
                    <TouchableOpacity key={unit} onPress={() => setCustomShareUnit(unit)} style={[styles.customUnit, customShareUnit === unit && styles.customUnitActive]}>
                      <Text style={[styles.customUnitText, customShareUnit === unit && styles.customUnitTextActive]}>{unit === 'seconds' ? 'Sec' : unit === 'minutes' ? 'Min' : 'Hr'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <TouchableOpacity disabled={sharing} onPress={() => void confirmTimedShare()} style={[styles.confirmShareButton, sharing && styles.confirmShareButtonDisabled]}>
              {sharing ? <ActivityIndicator color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
              <Text style={styles.confirmShareText}>{sharing ? 'Sharing…' : `Share for ${formatVaultDuration(chosenShareDurationMs)}`}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PinSetupModal
        visible={pinSetupVisible}
        onDismiss={() => setPinSetupVisible(false)}
        onComplete={handlePinComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  whiteVaultScreen: { flex: 1, backgroundColor: '#fff' },
  whiteVaultHeader: { minHeight: 74, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  whiteVaultBack: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  whiteVaultTitle: { flex: 1, color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25, lineHeight: 36, paddingTop: 2, textAlign: 'center' },
  whiteVaultGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 90 },
  whiteVaultIcon: { width: 116, height: 116, borderRadius: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ebe2fa' },
  whiteVaultGateTitle: { marginTop: 26, color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24 },
  whiteVaultGateText: { maxWidth: 310, marginTop: 10, color: '#9f8b96', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  whiteVaultButton: { width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16, marginTop: 28, backgroundColor: '#e56582' },
  whiteVaultButtonText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  unlockedHeader: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  unlockedTitleWrap: { flex: 1, alignItems: 'center' },
  unlockedSubtitle: { marginTop: 1, color: '#a18c96', fontFamily: 'Inter_500Medium', fontSize: 10 },
  privateBadge: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8edf1' },
  vaultSummary: { paddingHorizontal: 20, paddingBottom: 8 },
  vaultCount: { marginBottom: 12, color: '#a18c96', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5, textAlign: 'center', textTransform: 'uppercase' },
  vaultTabs: { flexDirection: 'row', borderWidth: 1, borderColor: '#efe0e5', borderRadius: 18, padding: 4, backgroundColor: '#fbf6f8' },
  vaultTab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 5 },
  vaultTabText: { color: '#9c8992', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  vaultTabTextActive: { color: '#fff' },
  touchable: {
    width: '100%',
    aspectRatio: 1,
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#f5f5f4',
  },
  videoPlayBadge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoPrivacyCover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#78716c',
  },
  selectionBar: {
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: 'rgba(26, 26, 26, 0.22)',
    alignItems: 'flex-start',
    padding: 8,
  },
  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(38,22,30,0.28)' },
  shareSheet: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#fff' },
  shareSheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#e3d6dc', marginBottom: 18 },
  shareSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareSheetTitle: { color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24 },
  shareSheetSubtitle: { marginTop: 3, color: '#9d8993', fontFamily: 'Inter_400Regular', fontSize: 12 },
  shareSheetClose: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf1f4' },
  timerNotice: { marginTop: 20, padding: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f6f1fc' },
  timerNoticeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ebe3fa' },
  timerNoticeText: { flex: 1, marginLeft: 12, color: '#766581', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  shareTimerLabel: { marginTop: 22, color: '#9e8993', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  durationOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 },
  durationChip: { minWidth: 66, height: 38, paddingHorizontal: 13, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eadbe0', backgroundColor: '#fff' },
  durationChipActive: { borderColor: '#e56582', backgroundColor: '#e56582' },
  durationChipText: { color: '#8e7984', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  durationChipTextActive: { color: '#fff' },
  customDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  customDurationInput: { width: 92, height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#ead8de', backgroundColor: '#fffafb', color: '#2b1b25', fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' },
  customUnitOptions: { flex: 1, height: 48, padding: 4, borderRadius: 16, flexDirection: 'row', backgroundColor: '#f8eff2' },
  customUnit: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  customUnitActive: { backgroundColor: '#fff' },
  customUnitText: { color: '#9a8790', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  customUnitTextActive: { color: '#c94e6d' },
  confirmShareButton: { height: 56, marginTop: 22, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#e56582' },
  confirmShareButtonDisabled: { opacity: 0.62 },
  confirmShareText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  cornerCountdown: {
    position: 'absolute',
    left: 8,
    top: 8,
  },
  openingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lockGateIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
