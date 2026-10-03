import {
    CHAT_EMOJI_ASSETS,
    CHAT_EMOJI_CATEGORIES,
    CHAT_STICKER_ASSETS,
    CHAT_STICKER_CATEGORIES,
    CHAT_EMOJI_PALETTE,
    getChatPickerImageSource,
    isChatEmojiAsset,
} from '@/constants/chatPickerAssets';
import { formatDisappearingLabel } from '@/constants/disappearingMessages';
import { getShellGradients } from '@/constants/genderTheme';
import { SmittenColors } from '@/constants/smittenTheme';
import { CategorizedAssetPicker } from '@/src/components/chat/CategorizedAssetPicker';
import { ChatSettingsSheet } from '@/src/components/chat/ChatSettingsSheet';
import { GifPickerPanel } from '@/src/components/chat/GifPickerPanel';
import { AuthedMediaImage } from '@/src/components/media/AuthedMediaImage';
import { AuthedMediaVideo } from '@/src/components/media/AuthedMediaVideo';
import { FullscreenMediaModal } from '@/src/components/media/FullscreenMediaModal';
import { ImageCropModal } from '@/src/components/media/ImageCropModal';
import { AvatarPreviewModal } from '@/src/components/ui/AvatarPreviewModal';
import {
    confirmDeleteItem,
    smittenAlertFromError,
} from '@/src/components/ui/SmittenAlertProvider';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { useChat, type ChatRow } from '@/src/hooks/useChat';
import { useKeyboardInset } from '@/src/hooks/useKeyboardInset';
import { useRefreshSessionOnFocus } from '@/src/hooks/useRefreshSessionOnFocus';
import { apiFetchHeaders } from '@/src/services/apiConfig';
import { isCoupleAuthedMediaUrl } from '@/src/services/authedMediaCache';
import { resolveChatMessageMediaUrl } from '@/src/services/mediaUrl';
import { editVideoForUpload } from '@/src/services/videoEditor';
import { usePushActivityStore } from '@/src/store/pushActivityStore';
import { useAppLockStore } from '@/src/store/useAppLockStore';
import { getPartnerChatLabel, useAuthStore } from '@/src/store/useAuthStore';
import { useNotificationInboxStore } from '@/src/store/useNotificationInboxStore';
import {
    getEmojiCellSize,
    getPickerHeight,
    getStickerCellSize,
} from '@/src/utils/responsiveLayout';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image, type ImageLoadEventData } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
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
const PICKER_DEFAULT_HEIGHT = getPickerHeight();
const PICKER_MAX_HEIGHT = Math.min(560, Math.max(360, SCREEN_H * 0.68));
const EMOJI_COLS = 6;
const EMOJI_GAP = 8;
const emojiCell = getEmojiCellSize(EMOJI_COLS);
const STICKER_COLS = 5;
const stickerGap = 10;
const stickerCell = getStickerCellSize(STICKER_COLS);

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
  const [imageAspectRatio, setImageAspectRatio] = useState(4 / 3);

  const handleImageLoad = useCallback((event: ImageLoadEventData) => {
    const { width, height } = event.source;
    if (width <= 0 || height <= 0) return;
    setImageAspectRatio(Math.max(9 / 16, Math.min(16 / 9, width / height)));
  }, []);

  return (
    <View
      style={[
        styles.gifWrap,
        styles.chatMediaWrap,
        { aspectRatio: imageAspectRatio },
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
            contentFit="contain"
            onLoad={handleImageLoad}
          />
        ) : (
          <Image
            source={{ uri, headers: Object.fromEntries(apiFetchHeaders().entries()) }}
            style={styles.gifImg}
            contentFit="contain"
            onLoad={handleImageLoad}
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
  previewOpen,
}: {
  uri: string;
  openPreview: () => void;
  renderMessageMeta: (msg: any, opts?: any) => React.ReactNode;
  msg: any;
  onLongPress?: () => void;
  previewOpen: boolean;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const longPressedRef = useRef(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(9 / 16);

  const handleVideoSize = useCallback((width: number, height: number) => {
    const ratio = width / height;
    setVideoAspectRatio(Math.max(9 / 16, Math.min(16 / 9, ratio)));
  }, []);

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      damping: 15,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View
      style={[
        styles.gifWrap,
        styles.videoWrap,
        { aspectRatio: videoAspectRatio },
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.gifPressable}>
        {previewOpen ? (
          <View style={[styles.gifImg, styles.videoSurfacePlaceholder]} />
        ) : (
          <AuthedMediaVideo
            uri={uri}
            cacheKey={`chat-video-${msg.id}`}
            style={styles.gifImg}
            muted
            contentFit="contain"
            onVideoSize={handleVideoSize}
          />
        )}
        <Pressable
          onPress={() => {
            if (longPressedRef.current) {
              longPressedRef.current = false;
              return;
            }
            openPreview();
          }}
          onLongPress={() => {
            longPressedRef.current = true;
            onLongPress?.();
          }}
          onPressOut={() => {
            requestAnimationFrame(() => {
              longPressedRef.current = false;
            });
          }}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel="Play video"
          style={styles.videoGestureLayer}
        />
        <View pointerEvents="none" style={styles.videoPlayBadge}>
          <Ionicons name="play" size={28} color="#fff" />
        </View>
      </View>
      <View pointerEvents="none" style={styles.mediaMetaOverlay}>
        {renderMessageMeta(msg, { overlay: true })}
      </View>
    </Animated.View>
  );
});

const PendingVideoBubble = React.memo(function PendingVideoBubble({
  align,
}: {
  align: 'flex-start' | 'flex-end';
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.62,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.pendingVideo,
        {
          alignSelf: align,
          opacity: pulse,
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0.62, 1],
                outputRange: [0.985, 1],
              }),
            },
          ],
        },
      ]}
    >
      <ActivityIndicator color="#fff" />
      <Text style={styles.pendingVideoText}>Preparing video…</Text>
    </Animated.View>
  );
});

function SwipeReplyWrapper({ children, onReply, isMe }: { children: React.ReactNode; onReply: () => void; isMe: boolean }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 8,
      onPanResponderMove: (_event, gesture) => {
        const next = isMe ? Math.min(0, Math.max(-92, gesture.dx)) : Math.max(0, Math.min(92, gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        const shouldReply = isMe ? gesture.dx <= -54 : gesture.dx >= 54;
        Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        if (shouldReply) onReply();
      },
      onPanResponderTerminate: () => {
        Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      },
    }),
    [isMe, onReply, translateX],
  );

  return (
    <View style={styles.swipeRow} {...panResponder.panHandlers}>
      <Animated.View style={[styles.swipeReplyIndicator, isMe ? styles.swipeReplyIndicatorRight : styles.swipeReplyIndicatorLeft, { opacity: isMe ? translateX.interpolate({ inputRange: [-92, -18, 0], outputRange: [1, 0, 0] }) : translateX.interpolate({ inputRange: [0, 18, 92], outputRange: [0, 0, 1] }), transform: [{ translateX: isMe ? translateX.interpolate({ inputRange: [-92, 0], outputRange: [0, 34] }) : translateX.interpolate({ inputRange: [0, 92], outputRange: [-34, 0] }) }] }]}>
        <Ionicons name="arrow-undo-outline" size={18} color="#D45274" />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>
    </View>
  );
}

function ReplyPreviewMedia({ message }: { message: ChatRow }) {
  if (message.kind === 'text') return null;
  if (message.kind === 'sticker') {
    const source = getChatPickerImageSource(message.body);
    return source ? <Image source={source} style={styles.replyMediaImage} contentFit="contain" /> : <Ionicons name="image-outline" size={20} color="#D45274" />;
  }
  if (message.kind === 'video') return <Ionicons name="videocam-outline" size={20} color="#D45274" />;
  const uri = resolveChatMessageMediaUrl(message.body);
  if (!uri) return <Ionicons name="image-outline" size={20} color="#D45274" />;
  return isCoupleAuthedMediaUrl(uri)
    ? <AuthedMediaImage uri={uri} recyclingKey={`reply-${message.id}`} mediaCacheKey={`reply-${message.id}`} style={styles.replyMediaImage} contentFit="cover" />
    : <Image source={{ uri, headers: Object.fromEntries(apiFetchHeaders().entries()) }} style={styles.replyMediaImage} contentFit="cover" />;
}

const ALL_REACTION_OPTIONS = Array.from(new Set(CHAT_EMOJI_PALETTE));
const QUICK_REACTION_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

function copyChatText(text: string) {
  void Share.share({ message: text });
}

function ReactionPopover({ onPick, alignRight }: { onPick: (emoji: string) => void; alignRight: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const popoverWidth = Math.min(292, screenWidth - 32);
  const reactionOptionWidth = (popoverWidth - 12) / 7;

  return (
    <>
      <View style={[styles.reactionPopover, { width: popoverWidth }, alignRight ? styles.reactionPopoverRight : styles.reactionPopoverLeft]}>
        {QUICK_REACTION_OPTIONS.map((emoji, index) => (
          <TouchableOpacity key={`${emoji}-${index}`} onPress={() => onPick(emoji)} style={[styles.reactionOption, { width: reactionOptionWidth }]}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setExpanded(true)} style={[styles.reactionOption, { width: reactionOptionWidth }]} accessibilityLabel="More emoji reactions">
          <Ionicons name="add" size={24} color="#D45274" />
        </TouchableOpacity>
      </View>
      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <Pressable style={styles.fullReactionBackdrop} onPress={() => setExpanded(false)}>
          <Pressable style={styles.fullReactionSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.fullReactionTitle}>React with an emoji</Text>
            <FlatList
              data={ALL_REACTION_OPTIONS}
              numColumns={8}
              keyExtractor={(emoji, index) => `${emoji}-${index}`}
              showsVerticalScrollIndicator
              initialNumToRender={48}
              maxToRenderPerBatch={64}
              windowSize={7}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setExpanded(false); onPick(item); }} style={styles.fullReactionOption}>
                  <Text style={styles.fullReactionEmoji}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function HighlightedMessageRow({
  showHighlight,
  align,
  onPress,
  onLongPress,
  children,
  meta,
  contentMaxWidth = '78%',
  marginBottom = 10,
}: {
  showHighlight: boolean;
  align: 'flex-start' | 'flex-end';
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  meta?: React.ReactNode;
  contentMaxWidth?: number | `${number}%`;
  marginBottom?: number;
}) {
  return (
    <View style={{ width: '100%', marginBottom }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        style={[
          styles.highlightRow,
          { alignItems: align },
          showHighlight && styles.highlightedBubble,
        ]}
      >
        <View style={{ maxWidth: contentMaxWidth, alignSelf: align }}>{children}</View>
      </Pressable>
      {meta ? (
        <View style={{ alignSelf: align, maxWidth: contentMaxWidth, marginHorizontal: 4 }}>
          {meta}
        </View>
      ) : null}
    </View>
  );
}

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
  const listRef = useRef<FlatList<ChatRow>>(null);

  const {
    messages: chatHistory,
    partnerOnline,
    partnerTyping,
    loading: chatLoading,
    sendMessage,
    deleteMessage,
    editMessage,
    updateSettings,
    reactMessage,
    reload: reloadChat,
    markPartnerMessagesRead,
    notifyTyping,
    stopTyping,
    canChat,
    uploading,
    uploadProgress,
  } = useChat();
  const { keyboardVisible } = useKeyboardInset();

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
      useNotificationInboxStore.getState().markCategoryRead('chat');
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
  const initialRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomRef = useRef(true);
  const messageCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const [messageListReady, setMessageListReady] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    uri: string;
    cacheKey: string;
    remote: boolean;
    mediaType: 'image' | 'video';
    messageId: string;
    canDelete: boolean;
  } | null>(null);
  const [partnerAvatarVisible, setPartnerAvatarVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatRow | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatRow | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatRow | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [reactionViewer, setReactionViewer] = useState<ChatRow | null>(null);
  const [croppingAsset, setCroppingAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [editBody, setEditBody] = useState('');

  const clearSelection = useCallback(() => {
    setSelectedMessage(null);
    setSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  const applySelection = useCallback((next: Set<string>, fallbackMsg?: ChatRow) => {
    if (next.size === 0) {
      setSelectedMessages(next);
      setSelectedMessage(null);
      setSelectionMode(false);
      return;
    }
    setSelectedMessages(next);
    setSelectionMode(true);
    if (next.size === 1) {
      const id = [...next][0];
      const found =
        fallbackMsg?.id === id
          ? fallbackMsg
          : chatHistory.find((message) => message.id === id) ?? null;
      setSelectedMessage(found);
      return;
    }
    setSelectedMessage(null);
  }, [chatHistory]);

  const enterSingleSelect = useCallback((msg: ChatRow) => {
    if (msg.isDeleted || msg.id.startsWith('pending-')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    applySelection(new Set([msg.id]), msg);
  }, [applySelection]);

  const toggleSelected = useCallback((msg: ChatRow) => {
    if (msg.isDeleted || msg.id.startsWith('pending-')) return;
    const next = new Set(selectedMessages);
    if (next.has(msg.id)) {
      next.delete(msg.id);
    } else {
      next.add(msg.id);
    }
    applySelection(next, msg);
  }, [applySelection, selectedMessages]);

  const openMessageActions = useCallback(
    (msg: ChatRow) => {
      enterSingleSelect(msg);
    },
    [enterSingleSelect],
  );

  const reactToSelectedMessage = useCallback(async (reaction: string) => {
    if (!selectedMessage) return;
    const isOwnReaction = selectedMessage.reactionUserId === apiUser?.id;
    const nextReaction = isOwnReaction && selectedMessage.reaction === reaction ? null : reaction;
    try {
      await reactMessage(selectedMessage.id, nextReaction);
      clearSelection();
    } catch (error) {
      smittenAlertFromError(error, 'Could not add reaction', 'error');
    }
  }, [apiUser?.id, clearSelection, reactMessage, selectedMessage]);

  const removeReaction = useCallback(async (msg: ChatRow) => {
    if (msg.reactionUserId !== apiUser?.id) return;
    try {
      await reactMessage(msg.id, null);
      setReactionViewer(null);
    } catch (error) {
      smittenAlertFromError(error, 'Could not remove reaction', 'error');
    }
  }, [apiUser?.id, reactMessage]);

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

  const scrollToMessage = useCallback((messageId: string) => {
    const index = chatHistory.findIndex((message) => message.id === messageId);
    if (index < 0) return;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId((current) => current === messageId ? null : current), 2600);
  }, [chatHistory]);

  const handleListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom <= SCROLL_NEAR_BOTTOM_PX;
  }, []);

  const revealMessageListAtBottom = useCallback(() => {
    if (messageListReady || chatHistory.length === 0) {
      return false;
    }

    if (initialRevealTimerRef.current) {
      clearTimeout(initialRevealTimerRef.current);
    }
    listRef.current?.scrollToEnd({ animated: false });
    initialRevealTimerRef.current = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
      requestAnimationFrame(() => {
        initialRevealTimerRef.current = null;
        setMessageListReady(true);
      });
    }, 80);
    return true;
  }, [chatHistory.length, messageListReady]);

  useEffect(
    () => () => {
      if (initialRevealTimerRef.current) {
        clearTimeout(initialRevealTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (chatHistory.length === 0) return;

    const prevCount = messageCountRef.current;
    const grew = chatHistory.length > prevCount;
    messageCountRef.current = chatHistory.length;

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      isNearBottomRef.current = true;
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
    void sendMessage({ kind: 'text', body: t, replyToId: replyingTo?.id ?? null })
      .then(() => setReplyingTo(null))
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
        allowsEditing: false,
        allowsMultipleSelection: false,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        const asset = res.assets[0];
        if (asset.type === 'video') {
          try {
            const editedUri = await editVideoForUpload(asset.uri, asset.fileSize, asset.duration);
            if (!editedUri) return;
            sendLocalMedia({ ...asset, uri: editedUri });
          } catch (error) {
            smittenAlertFromError(error, 'Could not prepare video', 'error');
          }
        } else {
          setCroppingAsset(asset);
        }
        Keyboard.dismiss();
      }
    } finally {
      useAppLockStore.getState().setSystemOverlayActive(false);
    }
  };

  const pickEmoji = useCallback(
    (body: string) => {
      Haptics.selectionAsync();
      if (body.startsWith('asset:')) {
        sendSticker(body);
        return;
      }
      setChatMessage((prev) => prev + body);
    },
    [sendSticker],
  );

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
          {msg.reaction ? (
            <Pressable onPress={() => setReactionViewer(msg)} style={styles.reactionBadge}>
              <Text style={styles.reactionBadgeText}>{msg.reaction}</Text>
            </Pressable>
          ) : null}
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
      const isSelected = selectedMessages.has(msg.id) || selectedMessage?.id === msg.id;
      const showHighlight = highlightedMessageId === msg.id || isSelected;

      if (msg.kind === 'system') {
        return (
          <View style={styles.systemMessage}>
            <Text className="text-[12px] font-sans text-muted text-center">{msg.body}</Text>
          </View>
        );
      }

      if (msg.kind === 'text') {
        const isDeleted = msg.isDeleted;
        const replyTarget = msg.replyToId ? chatHistory.find((candidate) => candidate.id === msg.replyToId) : null;
        return (
          <HighlightedMessageRow
            showHighlight={showHighlight}
            align={align}
            onPress={() => {
              if (selectionMode) toggleSelected(msg);
            }}
            onLongPress={isDeleted ? undefined : () => {
              if (selectionMode) {
                toggleSelected(msg);
              } else {
                enterSingleSelect(msg);
              }
            }}
            meta={renderMessageMeta(msg)}
          >
            {selectedMessage?.id === msg.id ? <ReactionPopover alignRight={msg.isMe} onPick={(emoji) => void reactToSelectedMessage(emoji)} /> : null}
            {replyTarget ? (
              <Pressable onPress={() => scrollToMessage(replyTarget.id)} style={styles.replyPreview}>
                <Text style={styles.replyPreviewLabel}>{replyTarget.isMe ? 'You' : partnerTitle}</Text>
                {replyTarget.kind === 'text' ? (
                  <Text numberOfLines={2} style={styles.replyPreviewText}>{replyTarget.body}</Text>
                ) : (
                  <View style={styles.replyPreviewContent}>
                    <ReplyPreviewMedia message={replyTarget} />
                    <Text style={styles.replyPreviewText}>{replyTarget.kind === 'video' ? 'Video' : replyTarget.kind === 'sticker' ? 'Sticker' : replyTarget.kind === 'gif' ? 'GIF' : 'Image'}</Text>
                  </View>
                )}
              </Pressable>
            ) : null}
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
                {isDeleted ? 'Deleted message' : msg.body}
              </Text>
            </View>
          </HighlightedMessageRow>
        );
      }

      if (msg.kind === 'sticker') {
        const emojiAsset = isChatEmojiAsset(msg.body);
        const imageSource = getChatPickerImageSource(msg.body);
        return (
          <HighlightedMessageRow
            showHighlight={showHighlight}
            align={align}
            marginBottom={8}
            onPress={() => {
              if (selectionMode) toggleSelected(msg);
            }}
            onLongPress={() => {
              if (selectionMode) {
                toggleSelected(msg);
              } else {
                enterSingleSelect(msg);
              }
            }}
            meta={renderMessageMeta(msg)}
          >
            {selectedMessage?.id === msg.id ? <ReactionPopover alignRight={msg.isMe} onPick={(emoji) => void reactToSelectedMessage(emoji)} /> : null}
            <View style={[styles.stickerWrap, { borderColor: 'rgba(26,26,26,0.06)' }]}>
              {imageSource ? (
                <Image
                  source={imageSource}
                  style={emojiAsset ? styles.emojiImg : styles.stickerImg}
                  contentFit="contain"
                  recyclingKey={msg.body}
                />
              ) : (
                <Text style={styles.missingStickerText}>Sticker unavailable</Text>
              )}
            </View>
          </HighlightedMessageRow>
        );
      }

      if (msg.kind === 'video' && msg.id.startsWith('pending-')) {
        return <PendingVideoBubble align={align} />;
      }

      const gifUri = resolveChatMessageMediaUrl(msg.body);
      const useAuthed = isCoupleAuthedMediaUrl(gifUri);
      const mediaType: 'video' | 'image' = msg.kind === 'video' ? 'video' : 'image';
      const isGif = msg.body.endsWith('.gif');

      const openPreview = () => {
        if (selectionMode) {
          toggleSelected(msg);
          return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!msg.isMe) void markPartnerMessagesRead();
        setMediaPreview({
          uri: gifUri,
          cacheKey: useAuthed ? `chat-${mediaType}-${msg.id}` : gifUri,
          remote: !useAuthed,
          mediaType: isGif ? 'image' : mediaType,
          messageId: msg.id,
          canDelete: msg.isMe && !msg.id.startsWith('pending-'),
        });
      };

      const handleMediaLongPress = () => {
        if (selectionMode) {
          toggleSelected(msg);
        } else {
          enterSingleSelect(msg);
        }
      };

      return (
        <HighlightedMessageRow
          showHighlight={showHighlight}
          align={align}
          contentMaxWidth="88%"
          marginBottom={8}
          onLongPress={msg.isDeleted ? undefined : handleMediaLongPress}
          meta={renderMessageMeta(msg)}
        >
          {selectedMessage?.id === msg.id ? <ReactionPopover alignRight={msg.isMe} onPick={(emoji) => void reactToSelectedMessage(emoji)} /> : null}
          {msg.isDeleted ? (
            <View style={[styles.bubble, styles.deletedTextBubble]}>
              <Text style={styles.deletedBubbleText}>
                {mediaType === 'video' ? 'Deleted video' : isGif ? 'Deleted GIF' : 'Deleted image'}
              </Text>
            </View>
          ) : mediaType === 'video' ? (
            <ChatVideoRenderer
              uri={gifUri}
              openPreview={openPreview}
              renderMessageMeta={() => null}
              msg={msg}
              onLongPress={handleMediaLongPress}
              previewOpen={mediaPreview?.mediaType === 'video' && mediaPreview.cacheKey === `chat-video-${msg.id}`}
            />
          ) : (
            <ChatMediaRenderer
              uri={gifUri}
              msgId={msg.id}
              useAuthed={useAuthed}
              openPreview={openPreview}
              renderMessageMeta={() => null}
              msg={msg}
              onLongPress={handleMediaLongPress}
            />
          )}
        </HighlightedMessageRow>
      );
    },
    [chatHistory, enterSingleSelect, highlightedMessageId, partnerTitle, reactToSelectedMessage, renderMessageMeta, markPartnerMessagesRead, mediaPreview, scrollToMessage, selectedMessage, selectedMessages, selectionMode, themeColor, toggleSelected],
  );

  const selectedRows = useMemo(
    () => chatHistory.filter((message) => selectedMessages.has(message.id)),
    [chatHistory, selectedMessages],
  );
  const canDeleteSelected = selectedRows.length > 0 && selectedRows.every((message) => message.isMe);
  const selectedCopyText = useMemo(
    () => selectedRows
      .filter((message) => message.kind === 'text' && !message.isDeleted)
      .map((message) => message.body)
      .join('\n\n'),
    [selectedRows],
  );

  const headerPad = 10;

  const listRenderItem = useCallback(
    ({ item }: { item: ChatRow }) => (
      <SwipeReplyWrapper isMe={item.isMe} onReply={() => setReplyingTo(item)}>{renderBubble(item)}</SwipeReplyWrapper>
    ),
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
      {replyingTo ? (
        <View style={styles.replyComposer}>
          <Pressable onPress={() => scrollToMessage(replyingTo.id)} style={{ flex: 1 }}>
            <Text style={styles.replyComposerLabel}>Replying to {replyingTo.isMe ? 'yourself' : partnerTitle}</Text>
            {replyingTo.kind === 'text' ? (
              <Text numberOfLines={2} style={styles.replyComposerText}>{replyingTo.body}</Text>
            ) : (
              <View style={styles.replyPreviewContent}>
                <ReplyPreviewMedia message={replyingTo} />
                <Text style={styles.replyComposerText}>{replyingTo.kind === 'video' ? 'Video' : replyingTo.kind === 'sticker' ? 'Sticker' : 'Image'}</Text>
              </View>
            )}
          </Pressable>
          <TouchableOpacity onPress={() => setReplyingTo(null)}><Ionicons name="close-circle" size={20} color="#9a8fa0" /></TouchableOpacity>
        </View>
      ) : null}
      <View
        className="flex-row items-end rounded-[26px] px-2 py-2"
        style={styles.composerInputShell}
      >
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
        // Android's keyboardDidHide event can retain stale frame metrics inside
        // KeyboardAvoidingView. Dropping the height behavior while closed removes
        // that stale reduced height and lets flex return the composer to bottom.
        behavior={Platform.OS === 'ios' ? 'padding' : keyboardVisible ? 'height' : undefined}
        keyboardVerticalOffset={0}
        enabled
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
        {selectedMessage || selectionMode ? (
          <>
            <TouchableOpacity onPress={clearSelection} style={styles.headerBtn}>
              <Ionicons name="close" size={22} color={SmittenColors.ink} />
            </TouchableOpacity>
            <Text style={styles.selectionCount}>{selectedMessages.size || (selectedMessage ? 1 : 0)}</Text>
            <View style={styles.selectionActions}>
              {selectedMessage ? (
                <>
                  <TouchableOpacity
                    disabled={selectedMessage.kind !== 'text' || !selectedMessage.isMe}
                    onPress={() => {
                      if (selectedMessage.kind !== 'text' || !selectedMessage.isMe) return;
                      setEditingMessage(selectedMessage);
                      setEditBody(selectedMessage.body);
                      clearSelection();
                    }}
                    style={[styles.selectionIconButton, (selectedMessage.kind !== 'text' || !selectedMessage.isMe) && styles.selectionIconDisabled]}
                  >
                    <Ionicons name="create-outline" size={20} color={SmittenColors.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setReplyingTo(selectedMessage); clearSelection(); }} style={styles.selectionIconButton}>
                    <Ionicons name="arrow-undo-outline" size={20} color={SmittenColors.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      confirmDeleteItem('This message will be removed for both of you.', () => {
                        void deleteMessage(selectedMessage.id).catch((error) => smittenAlertFromError(error, 'Could not delete', 'error'));
                      });
                      clearSelection();
                    }}
                    disabled={!selectedMessage.isMe}
                    style={[styles.selectionIconButton, !selectedMessage.isMe && styles.selectionIconDisabled]}
                  >
                    <Ionicons name="trash-outline" size={20} color={SmittenColors.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={selectedMessage.kind !== 'text'}
                    onPress={() => { copyChatText(selectedMessage.body); clearSelection(); }}
                    style={[styles.selectionIconButton, selectedMessage.kind !== 'text' && styles.selectionIconDisabled]}
                  >
                    <Ionicons name="copy-outline" size={20} color={SmittenColors.ink} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {canDeleteSelected ? (
                    <TouchableOpacity
                      onPress={() => {
                        confirmDeleteItem(`${selectedMessages.size} messages will be removed for both of you.`, () => {
                          Promise.all([...selectedMessages].map((id) => deleteMessage(id)))
                            .then(() => {
                              clearSelection();
                            })
                            .catch((error) => smittenAlertFromError(error, 'Could not delete messages', 'error'));
                        });
                      }}
                      style={styles.selectionIconButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={SmittenColors.ink} />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    disabled={!selectedCopyText}
                    onPress={() => {
                      if (!selectedCopyText) return;
                      copyChatText(selectedCopyText);
                      clearSelection();
                    }}
                    style={[styles.selectionIconButton, !selectedCopyText && styles.selectionIconDisabled]}
                  >
                    <Ionicons name="copy-outline" size={20} color={SmittenColors.ink} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={22} color={SmittenColors.ink} />
            </TouchableOpacity>
            <View style={styles.waHeaderCenter}>
              <Pressable onPress={() => setPartnerAvatarVisible(true)} style={styles.avatarWrap}>
                <UserAvatar uri={partnerAvatar} size={40} />
                {partnerOnline && <View style={styles.onlineDot} />}
              </Pressable>
              <Pressable onPress={openSettings} style={styles.waHeaderText}>
                <Text className="font-sans-semibold text-[17px] text-ink" numberOfLines={1}>{partnerTitle}</Text>
                <Text className="text-[13px] font-sans" numberOfLines={1} style={{ color: '#aa939e' }}>
                  {partnerTyping ? <Text style={{ color: '#ffa0b8', fontStyle: 'italic' }}>typing…</Text> : <><Text style={partnerOnline ? { color: '#2ecc71', fontWeight: '500' } : undefined}>{partnerOnline ? '● Active now' : 'offline'}</Text>{user?.partnerMood ? ` • ${user.partnerMood}` : ''}</>}
                </Text>
              </Pressable>
            </View>
            <TouchableOpacity style={styles.headerBtn} onPress={openSettings}>
              <Ionicons name="ellipsis-horizontal" size={20} color={SmittenColors.ink} />
            </TouchableOpacity>
          </>
        )}
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
        onDelete={
          mediaPreview?.canDelete
            ? () => {
                const message = chatHistory.find((item) => item.id === mediaPreview.messageId);
                setMediaPreview(null);
                if (message) {
                  setTimeout(() => openMessageActions(message), 220);
                }
              }
            : undefined
        }
      />
      <AvatarPreviewModal
        visible={partnerAvatarVisible}
        uri={partnerAvatar}
        name={partnerTitle}
        onClose={() => setPartnerAvatarVisible(false)}
      />
      <ImageCropModal
        visible={!!croppingAsset}
        uri={croppingAsset?.uri ?? null}
        onCancel={() => setCroppingAsset(null)}
        onDone={(uri) => {
          if (!croppingAsset) return;
          sendLocalMedia({ ...croppingAsset, uri });
          setCroppingAsset(null);
        }}
      />
      <Modal visible={!!reactionViewer} transparent animationType="fade" onRequestClose={() => setReactionViewer(null)}>
        <Pressable style={styles.reactionViewerBackdrop} onPress={() => setReactionViewer(null)}>
          <Pressable style={styles.reactionViewerCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.reactionViewerEmoji}>{reactionViewer?.reaction}</Text>
            <Text style={styles.reactionViewerLabel}>
              {reactionViewer?.reactionUserId === apiUser?.id
                ? 'You reacted'
                : `${reactionViewer?.reactionUserName || partnerTitle} reacted`}
            </Text>
            {reactionViewer?.reactionUserId === apiUser?.id ? (
              <TouchableOpacity
                onPress={() => {
                  if (reactionViewer) void removeReaction(reactionViewer);
                }}
                style={styles.reactionRemoveButton}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={14} color={SmittenColors.ink} />
                <Text style={styles.reactionRemoveText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <ChatSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeColor={themeColor}
        chatDisappearingAfterMs={chatDisappearingAfterMs}
        onSave={(patch) => void updateSettings(patch)}
        bottomInset={insets.bottom}
      />

      <Modal visible={!!editingMessage} transparent animationType="fade" onRequestClose={() => setEditingMessage(null)}>
        <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled>
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
        </KeyboardAvoidingView>
      </Modal>

      <View
        style={[
          styles.chatBody,
          { backgroundColor: '#fff' },
        ]}
      >
          {uploading ? (
            <View style={styles.uploadOverlay} pointerEvents="auto">
              <View style={styles.uploadBox}>
                <ActivityIndicator size="large" color={themeColor} />
                <Text style={{ marginTop: 8, color: '#111' }}>
                  {uploadProgress?.phase === 'preparing' ? 'Preparing media…' : 'Uploading media…'}
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
                  {uploadProgress?.phase === 'preparing'
                    ? uploadProgress.detail ?? 'Checking the selected video…'
                    : `${Math.round((uploadProgress?.progress ?? 0) * 100)}%`}
                </Text>
              </View>
            </View>
          ) : null}
          <FlatList
            ref={listRef}
            data={chatHistory}
            keyExtractor={(item) => item.id}
            renderItem={listRenderItem}
            style={[
              styles.messageList,
              chatHistory.length > 0 && !messageListReady && styles.messageListPreparing,
            ]}
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
              paddingBottom: 12,
              flexGrow: chatHistory.length === 0 ? 1 : undefined,
            }}
            onScroll={handleListScroll}
            onLayout={() => {
              if (revealMessageListAtBottom()) return;
              if (isNearBottomRef.current) scrollToBottom(false, true);
            }}
            onContentSizeChange={() => {
              if (revealMessageListAtBottom()) return;
              if (isNearBottomRef.current) scrollToBottom(false, true);
            }}
            scrollEventThrottle={16}
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              listRef.current?.scrollToOffset({ offset: Math.max(0, averageItemLength * index), animated: true });
            }}
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

          <View
            style={[
              styles.chatFooter,
              {
                backgroundColor: '#fff',
                paddingBottom: keyboardVisible
                  ? 8
                  : embeddedInTabs
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

              {pickerTab === 'emoji' && (
                <CategorizedAssetPicker
                  categories={CHAT_EMOJI_CATEGORIES}
                  assets={CHAT_EMOJI_ASSETS}
                  onPick={pickEmoji}
                  maxHeight={pickerHeight - 92}
                  columns={EMOJI_COLS}
                  cellSize={emojiCell}
                  gap={EMOJI_GAP}
                  padding={PICKER_PAD}
                />
              )}
              {pickerTab === 'sticker' && (
                <CategorizedAssetPicker
                  categories={CHAT_STICKER_CATEGORIES}
                  assets={CHAT_STICKER_ASSETS}
                  onPick={sendSticker}
                  maxHeight={pickerHeight - 92}
                  columns={STICKER_COLS}
                  cellSize={stickerCell}
                  gap={stickerGap}
                  padding={PICKER_PAD}
                />
              )}
              {pickerTab === 'gif' && <GifPickerPanel themeColor={themeColor} onPick={sendGif} maxHeight={pickerHeight - 92} />}
            </View>
            )}

            {renderComposerBox()}
          </View>
      </View>
    </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalKeyboard: { flex: 1 },
  chatBody: { flex: 1 },
  messageList: { flex: 1 },
  messageListPreparing: { opacity: 0 },
  swipeRow: { position: 'relative', width: '100%', overflow: 'visible' },
  reactionPopover: { position: 'absolute', bottom: '100%', zIndex: 30, flexDirection: 'row', padding: 5, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eadbe0', shadowColor: '#301923', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 10 },
  reactionPopoverLeft: { left: 8 },
  reactionPopoverRight: { right: 8 },
  reactionOption: { height: 38, alignItems: 'center', justifyContent: 'center' },
  reactionEmoji: { fontSize: 22 },
  fullReactionBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, backgroundColor: 'rgba(26,26,26,0.36)' },
  fullReactionSheet: { maxHeight: '72%', borderRadius: 22, padding: 14, backgroundColor: '#fff', shadowColor: '#301923', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 14 },
  fullReactionTitle: { marginBottom: 8, color: '#2f2731', fontFamily: 'Inter_700Bold', fontSize: 15 },
  fullReactionOption: { width: '12.5%', height: 42, alignItems: 'center', justifyContent: 'center' },
  fullReactionEmoji: { fontSize: 24 },
  highlightRow: {
    marginHorizontal: -10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  highlightedBubble: { backgroundColor: 'rgba(229,101,130,0.16)' },
  swipeReplyIndicator: { position: 'absolute', top: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f4' },
  swipeReplyIndicatorLeft: { left: 12 },
  swipeReplyIndicatorRight: { right: 12 },
  chatFooter: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
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
  selectionCount: { marginLeft: 2, color: SmittenColors.ink, fontFamily: 'Inter_700Bold', fontSize: 17 },
  selectionActions: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  selectionIconButton: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  selectionIconDisabled: { opacity: 0.3 },
  selectionEmojiButton: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  selectionEmoji: { fontSize: 20 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#f1e3e7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  incomingTextBubble: {
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#f1e4e8',
    shadowColor: '#4b1c2d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  outgoingTextBubble: { backgroundColor: '#d94e74' },
  deletedTextBubble: { backgroundColor: '#f5f1f2' },
  replyPreview: { alignSelf: 'flex-start', maxWidth: '100%', marginBottom: 5, paddingHorizontal: 9, paddingVertical: 7, borderLeftWidth: 3, borderLeftColor: '#D45274', backgroundColor: 'rgba(255,255,255,0.52)', borderRadius: 8 },
  replyPreviewLabel: { color: '#D45274', fontFamily: 'Inter_700Bold', fontSize: 10 },
  replyPreviewContent: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, minHeight: 0 },
  replyMediaImage: { width: 76, height: 54, borderRadius: 7, backgroundColor: '#f5f5f4' },
  replyPreviewText: { flexShrink: 1, maxWidth: 150, color: '#3c3441', fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 19 },
  incomingBubbleText: { color: '#3c3441' },
  outgoingBubbleText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  deletedBubbleText: { color: '#a8a0a3', fontStyle: 'italic' },
  systemMessage: {
    alignSelf: 'center',
    maxWidth: '88%',
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#efdfe4',
    backgroundColor: '#f5f5f4',
  },
  reactionBadge: { marginLeft: 6, minWidth: 28, minHeight: 24, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f5f5f4', borderWidth: 1, borderColor: '#f2d7df' },
  reactionBadgeText: { fontSize: 14, lineHeight: 17 },
  reactionViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  reactionViewerCard: {
    minWidth: 132,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eadbe0',
  },
  reactionViewerEmoji: { fontSize: 48, lineHeight: 58 },
  reactionViewerLabel: {
    marginTop: 4,
    marginBottom: 2,
    color: SmittenColors.ink,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  reactionRemoveButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f5f5f4',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#f2d7df',
  },
  reactionRemoveText: { color: SmittenColors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
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
  emojiImg: { width: 64, height: 64 },
  missingStickerText: { fontSize: 12, color: SmittenColors.muted },
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
  chatMediaWrap: {
    width: Math.min(280, WIN * 0.76),
    backgroundColor: '#f5f5f4',
  },
  videoWrap: {
    width: Math.min(280, WIN * 0.76),
    borderColor: 'rgba(26,26,26,0.06)',
    backgroundColor: '#111',
  },
  videoSurfacePlaceholder: { backgroundColor: '#111' },
  videoGestureLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    elevation: 8,
  },
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
  replyComposer: { width: '100%', minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7, paddingHorizontal: 12, paddingVertical: 9, borderLeftWidth: 3, borderLeftColor: '#D45274', borderRadius: 8, backgroundColor: '#f5f5f4' },
  replyComposerLabel: { color: '#D45274', fontFamily: 'Inter_700Bold', fontSize: 11 },
  replyComposerText: { flex: 1, color: '#2f2731', fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  composerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  composerInputShell: {
    borderWidth: 1,
    borderColor: '#ecdde2',
    backgroundColor: '#fff',
    shadowColor: '#5d2639',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  composerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginRight: 2,
    backgroundColor: '#f5f5f4',
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
