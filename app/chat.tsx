import {
    CHAT_EMOJI_PALETTE,
    CUSTOM_CHAT_STICKERS,
    getCustomChatSticker,
    STICKER_TWEMOJI_CODES,
    twemojiPngUrl,
} from '@/constants/chatPickerAssets';
import { formatDisappearingLabel } from '@/constants/disappearingMessages';
import { getShellGradients } from '@/constants/genderTheme';
import { SmittenColors } from '@/constants/smittenTheme';
import { ChatSettingsSheet } from '@/src/components/chat/ChatSettingsSheet';
import { GifPickerPanel } from '@/src/components/chat/GifPickerPanel';
import { AuthedMediaImage } from '@/src/components/media/AuthedMediaImage';
import { AuthedVideoThumbnail } from '@/src/components/media/AuthedVideoThumbnail';
import { FullscreenMediaModal } from '@/src/components/media/FullscreenMediaModal';
import {
    confirmDeleteItem,
    showItemActions,
    smittenAlertFromError,
} from '@/src/components/ui/SmittenAlertProvider';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { AvatarPreviewModal } from '@/src/components/ui/AvatarPreviewModal';
import { useChat, type ChatRow } from '@/src/hooks/useChat';
import { useKeyboardInset } from '@/src/hooks/useKeyboardInset';
import { useRefreshSessionOnFocus } from '@/src/hooks/useRefreshSessionOnFocus';
import { apiFetchHeaders } from '@/src/services/apiConfig';
import { isCoupleAuthedMediaUrl } from '@/src/services/authedMediaCache';
import { resolveChatMessageMediaUrl } from '@/src/services/mediaUrl';
import { usePushActivityStore } from '@/src/store/pushActivityStore';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { getPartnerChatLabel, useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { editVideoForUpload } from '@/src/services/videoEditor';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    PanResponder,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const WIN = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const SCROLL_NEAR_BOTTOM_PX = 140;
const PICKER_PAD = 16;
const PICKER_MIN_HEIGHT = 290;
const PICKER_DEFAULT_HEIGHT = Math.min(390, Math.max(PICKER_MIN_HEIGHT, SCREEN_H * 0.42));
const PICKER_MAX_HEIGHT = Math.min(560, Math.max(360, SCREEN_H * 0.68));
const EMOJI_COLS = 6;
const EMOJI_GAP = 8;
const emojiCell = Math.floor((WIN - PICKER_PAD * 2 - EMOJI_GAP * (EMOJI_COLS - 1)) / EMOJI_COLS);

const EmojiPickerGrid = React.memo(function EmojiPickerGrid({
  onPick,
  maxHeight,
}: {
  onPick: (emoji: string) => void;
  maxHeight: number;
}) {
  const renderEmoji = useCallback(
    ({ item: em, index: i }: { item: string; index: number }) => (
      <TouchableOpacity
        onPress={() => onPick(em)}
        style={{
          width: emojiCell,
          height: emojiCell + 6,
          marginBottom: EMOJI_GAP,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(26,26,26,0.06)',
        }}
      >
        <Text style={{ fontSize: Math.min(28, emojiCell * 0.72) }}>{em}</Text>
      </TouchableOpacity>
    ),
    [onPick]
  );

  return (
    <FlatList
      data={CHAT_EMOJI_PALETTE}
      keyExtractor={(em, i) => `${em}-${i}`}
      renderItem={renderEmoji}
      numColumns={EMOJI_COLS}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      style={{ maxHeight }}
      columnWrapperStyle={{ marginBottom: 0, gap: EMOJI_GAP }}
      contentContainerStyle={{ paddingHorizontal: PICKER_PAD, paddingTop: 12, paddingBottom: 12 }}
      initialNumToRender={30}
      windowSize={7}
      maxToRenderPerBatch={24}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
});

const STICKER_COLS = 5;
const stickerGap = 10;
const stickerCell = Math.floor((WIN - PICKER_PAD * 2 - stickerGap * (STICKER_COLS - 1)) / STICKER_COLS);

type StickerPickerItem =
  | { type: 'custom'; key: string; body: string; source: number; label: string }
  | { type: 'twemoji'; key: string; body: string };

const STICKER_PICKER_ITEMS: StickerPickerItem[] = [
  ...CUSTOM_CHAT_STICKERS.map((sticker) => ({
    type: 'custom' as const,
    key: sticker.body,
    body: sticker.body,
    source: sticker.source,
    label: sticker.label,
  })),
  ...STICKER_TWEMOJI_CODES.map((hex) => ({
    type: 'twemoji' as const,
    key: hex,
    body: hex,
  })),
];

const StickerPickerGrid = React.memo(function StickerPickerGrid({
  onPick,
  maxHeight,
}: {
  onPick: (body: string) => void;
  maxHeight: number;
}) {
  const renderSticker = useCallback(
    ({ item }: { item: StickerPickerItem }) => (
      <TouchableOpacity
        onPress={() => onPick(item.body)}
        style={{
          width: stickerCell,
          height: stickerCell,
          marginBottom: stickerGap,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          backgroundColor: '#fff',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(26,26,26,0.08)',
        }}
      >
        <Image
          source={item.type === 'custom' ? item.source : { uri: twemojiPngUrl(item.body) }}
          style={{ width: stickerCell - 14, height: stickerCell - 14 }}
          contentFit="contain"
          recyclingKey={item.key}
        />
      </TouchableOpacity>
    ),
    [onPick]
  );

  return (
    <FlatList
      data={STICKER_PICKER_ITEMS}
      keyExtractor={(item) => item.key}
      renderItem={renderSticker}
      numColumns={STICKER_COLS}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      style={{ maxHeight }}
      columnWrapperStyle={{ gap: stickerGap }}
      contentContainerStyle={{ paddingHorizontal: PICKER_PAD, paddingVertical: 12 }}
      initialNumToRender={20}
      windowSize={7}
      maxToRenderPerBatch={20}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
});

const ChatMediaRenderer = React.memo(function ChatMediaRenderer({
  uri,
  msgId,
  useAuthed,
  openPreview,
  renderMessageMeta,
  msg,
  onLongPress,
}: {
  uri: string;
  msgId: string;
  useAuthed: boolean;
  openPreview: () => void;
  renderMessageMeta: (msg: any, opts?: any) => React.ReactNode;
  msg: any;
  onLongPress?: () => void;
}) {
  return (
    <View
      style={[
        styles.gifWrap,
        styles.chatMediaWrap,
        { borderColor: 'rgba(26,26,26,0.06)' },
      ]}
    >
      <Pressable
        onPress={openPreview}
        onLongPress={onLongPress}
        delayLongPress={400}
        accessibilityRole="imagebutton"
        accessibilityLabel="View image full screen"
        style={styles.gifPressable}
      >
        {useAuthed ? (
          <AuthedMediaImage
            uri={uri}
            recyclingKey={`chat-thumb-${msgId}`}
            mediaCacheKey={`chat-${msgId}`}
            style={styles.gifImg}
            contentFit="cover"
          />
        ) : (
          <Image
            source={{ uri, headers: Object.fromEntries(apiFetchHeaders().entries()) }}
            style={styles.gifImg}
            contentFit="cover"
          />
        )}
      </Pressable>
      <View pointerEvents="none" style={styles.mediaMetaOverlay}>
        {renderMessageMeta(msg, { overlay: true })}
      </View>
    </View>
  );
});

const ChatVideoRenderer = React.memo(function ChatVideoRenderer({
  uri,
  openPreview,
  renderMessageMeta,
  msg,
  onLongPress,
}: {
  uri: string;
  openPreview: () => void;
  renderMessageMeta: (msg: any, opts?: any) => React.ReactNode;
  msg: any;
  onLongPress?: () => void;
}) {
  return (
    <View style={[styles.gifWrap, styles.videoWrap]}>
      <Pressable
        onPress={openPreview}
        onLongPress={onLongPress}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel="Play video"
        style={styles.gifPressable}
      >
        <AuthedVideoThumbnail
          uri={uri}
          cacheKey={`chat-video-${msg.id}`}
          style={styles.gifImg}
        />
        <View pointerEvents="none" style={styles.videoPlayBadge}>
          <Ionicons name="play" size={28} color="#fff" />
        </View>
      </Pressable>
      <View pointerEvents="none" style={styles.mediaMetaOverlay}>
        {renderMessageMeta(msg, { overlay: true })}
      </View>
    </View>
  );
});

type PickerTab = 'emoji' | 'sticker' | 'gif';

export default function ChatScreen({ embeddedInTabs = false }: { embeddedInTabs?: boolean }) {
  useRefreshSessionOnFocus();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const apiUser = useAuthStore((s) => s.apiUser);
  const signedOut = useAuthStore((s) => s.signedOut);
  const chatDisappearingAfterMs = useAuthStore((s) => s.chatDisappearingAfterMs);
  const { themeColor, userType } = useTheme();
  const { height: chatWindowHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatRow>>(null);
  const keyboardComposerInputRef = useRef<TextInput>(null);
  const fullWindowHeightRef = useRef(chatWindowHeight);

  const {
    messages: chatHistory,
    partnerOnline,
    partnerTyping,
    loading: chatLoading,
    sendMessage,
    deleteMessage,
    editMessage,
    updateSettings,
    reload: reloadChat,
    markPartnerMessagesRead,
    notifyTyping,
    stopTyping,
    canChat,
    uploading,
    uploadProgress,
  } = useChat();
  const { keyboardVisible, keyboardInset } = useKeyboardInset();
  const nativeKeyboardResize = Math.max(0, fullWindowHeightRef.current - chatWindowHeight);
  const keyboardComposerBottom = Math.max(0, keyboardInset - nativeKeyboardResize);

  useEffect(() => {
    if (!keyboardVisible) {
      fullWindowHeightRef.current = Math.max(fullWindowHeightRef.current, chatWindowHeight);
    }
  }, [chatWindowHeight, keyboardVisible]);

  useEffect(() => {
    if (!keyboardVisible) return;
    const frame = requestAnimationFrame(() => keyboardComposerInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [keyboardVisible]);

  const shellGrad = getShellGradients(userType);

  const partnerTitle = getPartnerChatLabel(user);
  const partnerAvatar = user?.avatarPartner || '';

  const lastSeenMessageId = useMemo(() => {
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const m = chatHistory[i];
      if (m.isMe && m.readAt) return m.id;
    }
    return null;
  }, [chatHistory]);

  useFocusEffect(
    useCallback(() => {
      usePushActivityStore.getState().setChatScreenActive(true);
      void reloadChat().then(() => {
        void markPartnerMessagesRead();
      });
      return () => {
        usePushActivityStore.getState().setChatScreenActive(false);
        stopTyping();
      };
    }, [markPartnerMessagesRead, reloadChat, stopTyping]),
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<PickerTab>('emoji');
  const [pickerHeight, setPickerHeight] = useState(PICKER_DEFAULT_HEIGHT);
  const pickerHeightRef = useRef(PICKER_DEFAULT_HEIGHT);
  const pickerHeightStartRef = useRef(PICKER_DEFAULT_HEIGHT);
  const pickerHeightAnimRef = useRef<number | null>(null);
  const scrollScheduled = useRef(false);
  const isNearBottomRef = useRef(true);
  const messageCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const [mediaPreview, setMediaPreview] = useState<{
    uri: string;
    cacheKey: string;
    remote: boolean;
    mediaType: 'image' | 'video';
  } | null>(null);
  const [partnerAvatarVisible, setPartnerAvatarVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatRow | null>(null);
  const [editBody, setEditBody] = useState('');

  const openMessageActions = useCallback(
    (msg: ChatRow) => {
      if (msg.isDeleted) return;
      if (!msg.isMe || msg.id.startsWith('pending-')) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showItemActions({
        canEdit: msg.kind === 'text',
        onEdit:
          msg.kind === 'text'
            ? () => {
                setEditingMessage(msg);
                setEditBody(msg.body);
              }
            : undefined,
        onDelete: () => {
          confirmDeleteItem('This message will be removed for both of you.', () => {
            void deleteMessage(msg.id).catch((e) => smittenAlertFromError(e, 'Could not delete', 'error'));
          });
        },
      });
    },
    [deleteMessage],
  );

  const saveEdit = useCallback(async () => {
    if (!editingMessage || !editBody.trim()) return;
    try {
      await editMessage(editingMessage.id, editBody.trim());
      setEditingMessage(null);
      setEditBody('');
    } catch (e) {
      smittenAlertFromError(e, 'Could not save edit', 'error');
    }
  }, [editingMessage, editBody, editMessage]);

  const scrollToBottom = useCallback((animated = true, force = false) => {
    if (!force && !isNearBottomRef.current) return;
    if (scrollScheduled.current) return;
    scrollScheduled.current = true;
    requestAnimationFrame(() => {
      scrollScheduled.current = false;
      listRef.current?.scrollToEnd({ animated: Platform.OS === 'ios' && animated });
    });
  }, []);

  const handleListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom <= SCROLL_NEAR_BOTTOM_PX;
  }, []);

  useEffect(() => {
    if (chatHistory.length === 0) return;

    const prevCount = messageCountRef.current;
    const grew = chatHistory.length > prevCount;
    messageCountRef.current = chatHistory.length;

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      isNearBottomRef.current = true;
      scrollToBottom(false, true);
      return;
    }

    if (!grew) return;
    const last = chatHistory[chatHistory.length - 1];
    if (last?.isMe || isNearBottomRef.current) {
      scrollToBottom(true, true);
    }
  }, [chatHistory, scrollToBottom]);

  const sendText = () => {
    const t = chatMessage.trim();
    if (!t || !canChat) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatMessage('');
    setPickerOpen(false);
    // Do NOT dismiss keyboard — let it stay open so bar stays visible
    scrollToBottom(true, true);
    void sendMessage({ kind: 'text', body: t })
      .then(() => scrollToBottom(true, true))
      .catch(() => {
        /* message rolled back in hook */
      });
  };

  const sendSticker = useCallback(
    (hex: string) => {
      if (!canChat) return;
      Haptics.selectionAsync();
      setPickerOpen(false);
      scrollToBottom(true, true);
      void sendMessage({ kind: 'sticker', body: hex })
        .then(() => scrollToBottom(true, true))
        .catch(() => {});
    },
    [canChat, sendMessage, scrollToBottom],
  );

  const sendGif = useCallback(
    (url: string) => {
      if (!canChat) return;
      Haptics.selectionAsync();
      setPickerOpen(false);
      scrollToBottom(true, true);

      void sendMessage({ kind: 'gif', body: url })
        .then(() => scrollToBottom(true, true))
        .catch(() => {});
    },
    [canChat, sendMessage, scrollToBottom],
  );

  const sendLocalMedia = useCallback(
    (asset: ImagePicker.ImagePickerAsset) => {
      if (asset.type === 'video') {
        if (!canChat) return;
        Haptics.selectionAsync();
        setPickerOpen(false);
        scrollToBottom(true, true);
        void sendMessage({ kind: 'video', body: asset.uri })
          .then(() => scrollToBottom(true, true))
          .catch((error) => {
            smittenAlertFromError(error, 'Could not send video', 'error');
          });
        return;
      }
      sendGif(asset.uri);
    },
    [canChat, scrollToBottom, sendGif, sendMessage],
  );

  const togglePicker = (tab: PickerTab) => {
    if (pickerOpen && pickerTab === tab) {
      setPickerOpen(false);
      return;
    }
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      setPickerTab(tab);
      setPickerOpen(true);
    });
  };

  const setPickerHeightImmediate = useCallback((height: number) => {
    if (pickerHeightAnimRef.current !== null) {
      cancelAnimationFrame(pickerHeightAnimRef.current);
      pickerHeightAnimRef.current = null;
    }
    pickerHeightRef.current = height;
    setPickerHeight(height);
  }, []);

  const animatePickerHeight = useCallback((target: number) => {
    if (pickerHeightAnimRef.current !== null) {
      cancelAnimationFrame(pickerHeightAnimRef.current);
    }
    const start = pickerHeightRef.current;
    const delta = target - start;
    const startedAt = Date.now();
    const duration = 170;

    const step = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + delta * eased;
      pickerHeightRef.current = next;
      setPickerHeight(next);
      if (progress < 1) {
        pickerHeightAnimRef.current = requestAnimationFrame(step);
      } else {
        pickerHeightAnimRef.current = null;
      }
    };

    pickerHeightAnimRef.current = requestAnimationFrame(step);
  }, []);

  const pickerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          pickerHeightStartRef.current = pickerHeightRef.current;
        },
        onPanResponderMove: (_evt, gesture) => {
          const next = Math.max(PICKER_MIN_HEIGHT, Math.min(PICKER_MAX_HEIGHT, pickerHeightStartRef.current - gesture.dy));
          setPickerHeightImmediate(next);
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 90 && pickerHeightStartRef.current <= PICKER_MIN_HEIGHT + 18) {
            setPickerOpen(false);
            return;
          }
          const next = Math.max(PICKER_MIN_HEIGHT, Math.min(PICKER_MAX_HEIGHT, pickerHeightStartRef.current - gesture.dy));
          const snap = next > (PICKER_MIN_HEIGHT + PICKER_MAX_HEIGHT) / 2 ? PICKER_MAX_HEIGHT : PICKER_DEFAULT_HEIGHT;
          animatePickerHeight(snap);
        },
      }),
    [animatePickerHeight, setPickerHeightImmediate],
  );

  useEffect(() => {
    pickerHeightRef.current = pickerHeight;
  }, [pickerHeight]);

  useEffect(
    () => () => {
      if (pickerHeightAnimRef.current !== null) {
        cancelAnimationFrame(pickerHeightAnimRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!keyboardVisible || !isNearBottomRef.current) return;
    const t = setTimeout(() => scrollToBottom(false, true), 80);
    return () => clearTimeout(t);
  }, [keyboardVisible, scrollToBottom]);

  const openGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    useAppLockStore.getState().setSystemOverlayActive(true);
    try {
      const mediaTypes: ('images' | 'videos')[] = ['images', 'videos'];
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        quality: 1,
        videoMaxDuration: 120,
        allowsMultipleSelection: false,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        const asset = res.assets[0];
        if (asset.type === 'video') {
          try {
            const editedUri = await editVideoForUpload(asset.uri, asset.fileSize);
            if (!editedUri) return;
            sendLocalMedia({ ...asset, uri: editedUri });
          } catch (error) {
            smittenAlertFromError(error, 'Could not prepare video', 'error');
          }
        } else {
          sendLocalMedia(asset);
        }
        Keyboard.dismiss();
      }
    } finally {
      useAppLockStore.getState().setSystemOverlayActive(false);
    }
  };

  const appendEmoji = useCallback((em: string) => {
    Haptics.selectionAsync();
    setChatMessage((prev) => prev + em);
  }, []);

  const renderMessageMeta = useCallback(
    (msg: ChatRow, opts?: { overlay?: boolean }) => {
      const overlay = opts?.overlay === true;
      const timeColor = overlay ? 'rgba(255,255,255,0.92)' : SmittenColors.muted;
      const tickColor = msg.readAt ? '#53BDEB' : overlay ? 'rgba(255,255,255,0.85)' : SmittenColors.muted;
      const seenColor = '#53BDEB';

      return (
        <View
          style={[
            overlay ? styles.mediaMetaOverlay : styles.metaRow,
            !overlay && { justifyContent: msg.isMe ? 'flex-end' : 'flex-start' },
          ]}
        >
          <Text className="text-[11px] font-sans" style={{ color: timeColor }}>
            {msg.time}{msg.isEdited ? ' • Edited' : ''}
          </Text>
          {msg.isMe && (
            <>
              <Ionicons name="checkmark-done" size={14} color={tickColor} style={{ marginLeft: 4 }} />
              {msg.id === lastSeenMessageId ? (
                <Text className="ml-1 text-[10px] font-sans-semibold" style={{ color: seenColor }}>
                  Seen
                </Text>
              ) : null}
            </>
          )}
        </View>
      );
    },
    [lastSeenMessageId],
  );

  const renderBubble = useCallback(
    (msg: ChatRow) => {
      const align = msg.isMe ? 'flex-end' : 'flex-start';

      if (msg.kind === 'system') {
        return (
          <View style={{ alignSelf: 'center', marginVertical: 8, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12, maxWidth: '88%' }}>
            <Text className="text-[12px] font-sans text-muted text-center">{msg.body}</Text>
          </View>
        );
      }

      if (msg.kind === 'text') {
        const isDeleted = msg.isDeleted;
        return (
          <Pressable
            onLongPress={isDeleted ? undefined : () => openMessageActions(msg)}
            delayLongPress={400}
            style={{ alignSelf: align, maxWidth: '78%', marginBottom: 10, marginHorizontal: 4 }}
          >
            <View
              style={[
                styles.bubble,
                isDeleted
                  ? styles.deletedTextBubble
                  : msg.isMe
                    ? [styles.outgoingTextBubble, { backgroundColor: themeColor }]
                    : styles.incomingTextBubble,
              ]}
            >
              <Text style={[styles.bubbleText, isDeleted ? styles.deletedBubbleText : msg.isMe ? styles.outgoingBubbleText : styles.incomingBubbleText]}>
                {msg.body}
              </Text>
            </View>
            {renderMessageMeta(msg)}
          </Pressable>
        );
      }

      if (msg.kind === 'sticker') {
        const customSticker = getCustomChatSticker(msg.body);
        return (
          <Pressable
            onLongPress={() => openMessageActions(msg)}
            delayLongPress={400}
            style={{ alignSelf: align, marginBottom: 8 }}
          >
            <View style={[styles.stickerWrap, { borderColor: 'rgba(26,26,26,0.06)' }]}>
              <Image
                source={customSticker ? customSticker.source : { uri: twemojiPngUrl(msg.body) }}
                style={styles.stickerImg}
                contentFit="contain"
                recyclingKey={customSticker?.body ?? msg.body}
              />
            </View>
            {renderMessageMeta(msg)}
          </Pressable>
        );
      }

      if (msg.kind === 'video' && msg.id.startsWith('pending-')) {
        return (
          <View style={[styles.pendingVideo, { alignSelf: align }]}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.pendingVideoText}>Preparing video…</Text>
          </View>
        );
      }

      const gifUri = resolveChatMessageMediaUrl(msg.body);
      const useAuthed = isCoupleAuthedMediaUrl(gifUri);
      const mediaType = msg.kind === 'video' ? 'video' : 'image';

      const openPreview = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!msg.isMe) void markPartnerMessagesRead();
        setMediaPreview({
          uri: gifUri,
          cacheKey: useAuthed ? `chat-${mediaType}-${msg.id}` : gifUri,
          remote: !useAuthed,
          mediaType,
        });
      };

      return (
        <View style={{ alignSelf: align, maxWidth: '88%', marginBottom: 8 }}>
          {mediaType === 'video' ? (
            <ChatVideoRenderer
              uri={gifUri}
              openPreview={openPreview}
              renderMessageMeta={renderMessageMeta}
              msg={msg}
              onLongPress={() => openMessageActions(msg)}
            />
          ) : (
            <ChatMediaRenderer
              uri={gifUri}
              msgId={msg.id}
              useAuthed={useAuthed}
              openPreview={openPreview}
              renderMessageMeta={renderMessageMeta}
              msg={msg}
              onLongPress={() => openMessageActions(msg)}
            />
          )}
        </View>
      );
    },
    [renderMessageMeta, markPartnerMessagesRead, openMessageActions, themeColor],
  );

  const headerPad = 10;

  const listRenderItem = useCallback(
    ({ item }: { item: ChatRow }) => renderBubble(item),
    [renderBubble],
  );

  const markReadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: ChatRow | null; isViewable: boolean }[] }) => {
      const sawPartnerMessage = viewableItems.some((v) => v.isViewable && v.item && !v.item.isMe);
      if (!sawPartnerMessage) return;
      if (markReadDebounceRef.current) clearTimeout(markReadDebounceRef.current);
      markReadDebounceRef.current = setTimeout(() => {
        void markPartnerMessagesRead();
      }, 400);
    },
  ).current;

  const openSettings = () => {
    Haptics.selectionAsync();
    setSettingsOpen(true);
  };

  const renderComposerBox = (inputRef?: React.RefObject<TextInput | null>) => (
    <View style={[styles.composerBar, { borderTopColor: 'rgba(26,26,26,0.08)' }]}>
      <View className="flex-row items-end rounded-[26px] border border-stone-200 bg-white px-2 py-2">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            togglePicker('emoji');
          }}
          style={styles.composerIconBtn}
        >
          <Ionicons name="happy-outline" size={24} color={SmittenColors.ink} />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          autoFocus={Boolean(inputRef)}
          value={chatMessage}
          onChangeText={(text) => {
            setChatMessage(text);
            if (text.trim()) notifyTyping();
          }}
          onBlur={stopTyping}
          onFocus={() => {
            setPickerOpen(false);
            if (isNearBottomRef.current) setTimeout(() => scrollToBottom(true, true), 100);
            void markPartnerMessagesRead();
          }}
          placeholder="Message…"
          placeholderTextColor="#9ca3af"
          className="max-h-[120px] min-h-[44px] flex-1 px-2 py-2 font-sans text-[16px] text-ink"
          multiline
          textAlignVertical="center"
          autoComplete="off"
          importantForAutofill="no"
        />

        <TouchableOpacity onPress={openGallery} style={[styles.composerIconBtn, styles.attachmentBtn]}>
          <Ionicons name="attach-outline" size={25} color={SmittenColors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={sendText}
          disabled={!chatMessage.trim() || !canChat}
          style={[
            styles.composerSendBtn,
            { backgroundColor: themeColor, ...styles.sendShadow },
            (!chatMessage.trim() || !canChat) && styles.composerSendDisabled,
          ]}
        >
          <Ionicons name="paper-plane" size={19} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (signedOut || !apiUser) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior="padding"
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}
      >
        <View className="flex-1" style={{ backgroundColor: '#fff' }}>
      <LinearGradient colors={[...shellGrad]} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.waHeader,
          {
            paddingTop: headerPad,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={SmittenColors.ink} />
        </TouchableOpacity>

        <View style={styles.waHeaderCenter}>
          <Pressable onPress={() => setPartnerAvatarVisible(true)} style={styles.avatarWrap}>
            <UserAvatar uri={partnerAvatar} size={40} />
            {partnerOnline && <View style={styles.onlineDot} />}
          </Pressable>
          <Pressable onPress={openSettings} style={styles.waHeaderText}>
            <Text className="font-sans-semibold text-[17px] text-ink" numberOfLines={1}>
              {partnerTitle}
            </Text>
            <Text
              className="text-[13px] font-sans"
              numberOfLines={1}
              style={{ color: '#aa939e' }}
            >
              {partnerTyping ? (
                <Text style={{ color: '#ffa0b8', fontStyle: 'italic' }}>typing…</Text>
              ) : (
                <>
                  <Text style={partnerOnline ? { color: '#2ecc71', fontWeight: '500' } : undefined}>
                    {partnerOnline ? '● Active now' : 'offline'}
                  </Text>
                  {user?.partnerMood ? ` • ${user.partnerMood}` : ''}
                </>
              )}
            </Text>
          </Pressable>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={openSettings}>
          <Ionicons name="ellipsis-horizontal" size={20} color={SmittenColors.ink} />
        </TouchableOpacity>
      </View>

      <FullscreenMediaModal
        visible={!!mediaPreview}
        uri={mediaPreview?.uri ?? null}
        mediaCacheKey={mediaPreview?.remote ? undefined : mediaPreview?.cacheKey}
        recyclingKey={
          mediaPreview && !mediaPreview.remote ? `chat-full-${mediaPreview.cacheKey}` : undefined
        }
        remote={mediaPreview?.remote}
        mediaType={mediaPreview?.mediaType}
        onClose={() => setMediaPreview(null)}
      />
      <AvatarPreviewModal
        visible={partnerAvatarVisible}
        uri={partnerAvatar}
        name={partnerTitle}
        onClose={() => setPartnerAvatarVisible(false)}
      />

      <ChatSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeColor={themeColor}
        chatDisappearingAfterMs={chatDisappearingAfterMs}
        onSave={(patch) => void updateSettings(patch)}
        bottomInset={insets.bottom}
      />

      <Modal visible={!!editingMessage} transparent animationType="fade" onRequestClose={() => setEditingMessage(null)}>
        <Pressable style={styles.editBackdrop} onPress={() => setEditingMessage(null)}>
          <Pressable style={styles.editCard} onPress={(e) => e.stopPropagation()}>
            <Text className="mb-3 font-serif text-xl text-ink">Edit message</Text>
            <TextInput
              value={editBody}
              onChangeText={setEditBody}
              multiline
              autoFocus
              className="mb-4 min-h-[100px] rounded-2xl border border-stone-200 bg-cream p-4 font-sans text-ink"
              textAlignVertical="top"
            />
            <View className="flex-row justify-end gap-2">
              <TouchableOpacity onPress={() => setEditingMessage(null)} className="rounded-full px-5 py-3">
                <Text className="font-sans-semibold text-muted">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void saveEdit()}
                className="rounded-full px-6 py-3"
                style={{ backgroundColor: themeColor }}
              >
                <Text className="font-sans-bold text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.chatBody, { backgroundColor: '#fff' }]}>
          {uploading ? (
            <View style={styles.uploadOverlay} pointerEvents="auto">
              <View style={styles.uploadBox}>
                <ActivityIndicator size="large" color={themeColor} />
                <Text style={{ marginTop: 8, color: '#111' }}>
                  {uploadProgress?.phase === 'preparing' ? 'Compressing video…' : 'Uploading…'}
                </Text>
                <View style={styles.uploadProgressTrack}>
                  <View
                    style={[
                      styles.uploadProgressFill,
                      { width: `${Math.round((uploadProgress?.progress ?? 0) * 100)}%`, backgroundColor: themeColor },
                    ]}
                  />
                </View>
                <Text style={styles.uploadProgressText}>
                  {Math.round((uploadProgress?.progress ?? 0) * 100)}%
                </Text>
              </View>
            </View>
          ) : null}
          <FlatList
            ref={listRef}
            data={chatHistory}
            keyExtractor={(item) => item.id}
            renderItem={listRenderItem}
            style={styles.messageList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            overScrollMode="never"
            removeClippedSubviews={false}
            initialNumToRender={16}
            maxToRenderPerBatch={16}
            windowSize={9}
            contentContainerStyle={{
              paddingHorizontal: 10,
              paddingTop: 8,
              paddingBottom: keyboardVisible ? 82 : 12,
              flexGrow: chatHistory.length === 0 ? 1 : undefined,
            }}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 40, minimumViewTime: 200 }}
            ListHeaderComponent={
              chatDisappearingAfterMs != null ? (
                <View className="mb-3 items-center py-2">
                  <Text className="text-[11px] font-sans text-muted">
                    Disappearing: {formatDisappearingLabel(chatDisappearingAfterMs)}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
            chatLoading && chatHistory.length === 0 ? (
              <View className="flex-1 items-center justify-center py-16">
                <ActivityIndicator size="large" color={themeColor} />
              </View>
            ) : !canChat ? (
              <View className="flex-1 items-center justify-center py-16 px-8">
                <Text className="text-center font-sans-semibold text-ink">Waiting for your partner</Text>
                <Text className="mt-2 text-center text-sm font-sans text-muted leading-5">
                  Share your couple key from Profile so they can join — then chat unlocks for both of you.
                </Text>
              </View>
            ) : null
            }
          />

          {!keyboardVisible ? <View
            style={[
              styles.chatFooter,
              {
                backgroundColor: '#fff',
                paddingBottom: embeddedInTabs
                    ? 68 + Math.max(insets.bottom, 8)
                    : Math.max(insets.bottom, 8),
              },
            ]}
          >
            {pickerOpen && (
            <View style={[styles.pickerSheet, { height: pickerHeight, borderColor: 'rgba(26,26,26,0.08)' }]}>
              <View style={styles.pickerHandleZone} {...pickerPanResponder.panHandlers}>
                <View style={styles.pickerHandle} />
              </View>
              <View style={styles.pickerTabRow}>
                <View style={styles.pickerTabsWrap}>
                  {(['emoji', 'sticker', 'gif'] as const).map((tab) => {
                    const iconName =
                      tab === 'emoji' ? 'happy-outline' : tab === 'sticker' ? 'albums-outline' : 'film-outline';
                    return (
                    <Pressable
                      key={tab}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPickerTab(tab);
                      }}
                      style={[
                        styles.pickerTabPill,
                        pickerTab === tab
                          ? { backgroundColor: `${themeColor}20`, borderColor: themeColor }
                          : styles.pickerTabPillIdle,
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={18}
                        color={pickerTab === tab ? themeColor : SmittenColors.muted}
                      />
                      <Text
                        style={[
                          styles.pickerTabLabel,
                          { color: pickerTab === tab ? themeColor : SmittenColors.ink },
                        ]}
                      >
                        {tab === 'gif' ? 'GIFs' : tab === 'sticker' ? 'Stickers' : 'Emoji'}
                      </Text>
                    </Pressable>
                    );
                  })}
                </View>
                <TouchableOpacity
                  onPress={() => setPickerOpen(false)}
                  style={styles.pickerCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color={SmittenColors.muted} />
                </TouchableOpacity>
              </View>

              {pickerTab === 'emoji' && <EmojiPickerGrid onPick={appendEmoji} maxHeight={pickerHeight - 92} />}
              {pickerTab === 'sticker' && <StickerPickerGrid onPick={sendSticker} maxHeight={pickerHeight - 92} />}
              {pickerTab === 'gif' && <GifPickerPanel themeColor={themeColor} onPick={sendGif} maxHeight={pickerHeight - 92} />}
            </View>
            )}

            {renderComposerBox()}
          </View> : null}
          {keyboardVisible ? (
            <View style={[styles.keyboardComposer, { bottom: keyboardComposerBottom }]}>
              {renderComposerBox(keyboardComposerInputRef)}
            </View>
          ) : null}
      </View>
    </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chatBody: { flex: 1 },
  messageList: { flex: 1 },
  chatFooter: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  keyboardComposer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    elevation: 30,
    backgroundColor: '#fff',
  },
  waHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0e1e5',
  },
  waHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 12,
    zIndex: 2,
  },
  waHeaderText: {
    flexShrink: 1,
    maxWidth: 190,
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    position: 'relative',
  },
  waAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#2ecc71',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  incomingTextBubble: { backgroundColor: '#fff', shadowColor: '#39232d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 9, elevation: 2 },
  outgoingTextBubble: { backgroundColor: '#d94e74' },
  deletedTextBubble: { backgroundColor: '#f5f1f2' },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 19 },
  incomingBubbleText: { color: '#3c3441' },
  outgoingBubbleText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  deletedBubbleText: { color: '#a8a0a3', fontStyle: 'italic' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  stickerWrap: {
    borderRadius: 18,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#fff',
  },
  stickerImg: { width: 88, height: 88 },
  gifWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#f5f5f4',
    position: 'relative',
  },
  gifPressable: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  gifImg: { width: '100%', height: '100%', borderRadius: 14 },
  chatMediaWrap: { width: 280, height: 210 },
  videoWrap: { width: 280, height: 210, borderColor: 'rgba(26,26,26,0.06)' },
  videoPlayBadge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 54,
    height: 54,
    marginLeft: -27,
    marginTop: -27,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  mediaMetaOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerSheet: {
    minHeight: 280,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerHandleZone: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26,26,26,0.28)',
  },
  pickerTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,26,26,0.08)',
  },
  pickerTabsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  pickerTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerTabPillIdle: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(26,26,26,0.12)',
  },
  pickerTabLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Inter_600SemiBold' : 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: Platform.OS === 'android' ? 'normal' : '600',
    textTransform: 'capitalize',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  pickerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253, 242, 240, 0.95)',
  },
  composerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  composerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginRight: 2,
    backgroundColor: 'rgba(253, 242, 240, 0.95)',
  },
  attachmentBtn: { marginRight: 9 },
  composerSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  composerSendDisabled: { opacity: 0.58 },
  gifChip: {
    fontSize: 11,
    fontWeight: '700',
    color: SmittenColors.muted,
    letterSpacing: 0.5,
  },
  sendShadow: {
    shadowColor: '#F05A28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  editCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
  },
  uploadOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  uploadBox: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  uploadProgressTrack: {
    width: 180,
    height: 7,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  uploadProgressFill: { height: '100%', borderRadius: 999 },
  uploadProgressText: { marginTop: 6, color: '#6b7280', fontSize: 12, fontWeight: '700' },
  pendingVideo: {
    width: 210,
    height: 132,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingVideoText: {
    marginTop: 9,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
