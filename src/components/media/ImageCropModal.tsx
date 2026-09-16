import { SmittenColors } from '@/constants/smittenTheme';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import { smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  uri: string | null;
  /** When set, crop stays this shape and the photo is pinched/dragged behind it. */
  aspectRatio?: number;
  onCancel: () => void;
  onDone: (uri: string) => void;
};

const PREVIEW_INSET = 20;
const FREE_CROP_PAD = 16;
const MAX_ZOOM = 4;
const MIN_CROP = 72;
const HANDLE = 28;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function ImageCropModal({ visible, uri, aspectRatio, onCancel, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [workingUri, setWorkingUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startCropX = useSharedValue(0);
  const startCropY = useSharedValue(0);
  const startCropW = useSharedValue(0);
  const startCropH = useSharedValue(0);
  const minScale = useSharedValue(1);
  const displayW = useSharedValue(1);
  const displayH = useSharedValue(1);
  const viewW = useSharedValue(0);
  const viewH = useSharedValue(0);
  const cropX = useSharedValue(0);
  const cropY = useSharedValue(0);
  const cropW = useSharedValue(0);
  const cropH = useSharedValue(0);
  const dragMode = useSharedValue<'image' | 'move' | 'tl' | 'tr' | 'bl' | 'br'>('image');
  const lockCover = useSharedValue(aspectRatio ? 1 : 0);

  useEffect(() => {
    if (!visible) {
      setSaving(false);
      setWorkingUri(null);
      setImageSize({ width: 0, height: 0 });
      setDisplaySize({ width: 0, height: 0 });
      setReady(false);
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
    }
  }, [scale, translateX, translateY, visible]);

  useEffect(() => {
    if (!visible || !uri) return;
    let cancelled = false;
    void ImageManipulator.manipulate(uri)
      .renderAsync()
      .then((rendered) => rendered.saveAsync({ compress: 1, format: SaveFormat.JPEG }))
      .then((saved) => {
        if (cancelled || saved.width <= 0 || saved.height <= 0) return;
        setWorkingUri(saved.uri);
        setImageSize({ width: saved.width, height: saved.height });
      })
      .catch((error) => {
        if (cancelled) return;
        RNImage.getSize(
          uri,
          (width, height) => {
            if (!cancelled && width > 0 && height > 0) {
              setWorkingUri(uri);
              setImageSize({ width, height });
            }
          },
          () => {
            if (!cancelled) smittenAlertFromError(error, 'Could not open photo', 'error');
          },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [uri, visible]);

  useEffect(() => {
    if (!viewport.width || !viewport.height || !imageSize.width || !imageSize.height) return;
    const pad = aspectRatio ? PREVIEW_INSET : FREE_CROP_PAD;
    const maxW = Math.max(120, viewport.width - pad * 2);
    const maxH = Math.max(120, viewport.height - pad * 2);
    let cropWidth: number;
    let cropHeight: number;
    let nextDisplay: { width: number; height: number };
    if (aspectRatio && aspectRatio > 0) {
      if (maxW / maxH > aspectRatio) {
        cropHeight = maxH;
        cropWidth = cropHeight * aspectRatio;
      } else {
        cropWidth = maxW;
        cropHeight = cropWidth / aspectRatio;
      }
      const cover = Math.max(cropWidth / imageSize.width, cropHeight / imageSize.height);
      nextDisplay = { width: imageSize.width * cover, height: imageSize.height * cover };
    } else {
      const contain = Math.min(maxW / imageSize.width, maxH / imageSize.height);
      nextDisplay = { width: imageSize.width * contain, height: imageSize.height * contain };
      cropWidth = nextDisplay.width;
      cropHeight = nextDisplay.height;
    }
    setDisplaySize(nextDisplay);
    displayW.value = nextDisplay.width;
    displayH.value = nextDisplay.height;
    viewW.value = viewport.width;
    viewH.value = viewport.height;
    lockCover.value = aspectRatio ? 1 : 0;
    minScale.value = 1;
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    cropW.value = cropWidth;
    cropH.value = cropHeight;
    cropX.value = (viewport.width - cropWidth) / 2;
    cropY.value = (viewport.height - cropHeight) / 2;
    setReady(true);
  }, [
    aspectRatio,
    cropH,
    cropW,
    cropX,
    cropY,
    displayH,
    displayW,
    imageSize.height,
    imageSize.width,
    lockCover,
    minScale,
    scale,
    translateX,
    translateY,
    viewH,
    viewW,
    viewport.height,
    viewport.width,
  ]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(startScale.value * event.scale, minScale.value, MAX_ZOOM);
      scale.value = nextScale;
      if (lockCover.value) {
        const maxX = Math.max(0, (displayW.value * nextScale - cropW.value) / 2);
        const maxY = Math.max(0, (displayH.value * nextScale - cropH.value) / 2);
        translateX.value = clamp(translateX.value, -maxX, maxX);
        translateY.value = clamp(translateY.value, -maxY, maxY);
      }
    });

  const pan = Gesture.Pan()
    .onBegin((event) => {
      const x = event.x;
      const y = event.y;
      const left = cropX.value;
      const top = cropY.value;
      const right = left + cropW.value;
      const bottom = top + cropH.value;
      if (lockCover.value) {
        dragMode.value = 'image';
      } else if (Math.abs(x - left) <= HANDLE && Math.abs(y - top) <= HANDLE) dragMode.value = 'tl';
      else if (Math.abs(x - right) <= HANDLE && Math.abs(y - top) <= HANDLE) dragMode.value = 'tr';
      else if (Math.abs(x - left) <= HANDLE && Math.abs(y - bottom) <= HANDLE) dragMode.value = 'bl';
      else if (Math.abs(x - right) <= HANDLE && Math.abs(y - bottom) <= HANDLE) dragMode.value = 'br';
      else if (x >= left && x <= right && y >= top && y <= bottom) dragMode.value = 'move';
      else dragMode.value = 'image';
      startX.value = translateX.value;
      startY.value = translateY.value;
      startCropX.value = cropX.value;
      startCropY.value = cropY.value;
      startCropW.value = cropW.value;
      startCropH.value = cropH.value;
    })
    .onUpdate((event) => {
      const shownW = displayW.value * scale.value;
      const shownH = displayH.value * scale.value;
      const imageLeft = (viewW.value - shownW) / 2 + translateX.value;
      const imageTop = (viewH.value - shownH) / 2 + translateY.value;
      const imageRight = imageLeft + shownW;
      const imageBottom = imageTop + shownH;
      const mode = dragMode.value;

      if (mode === 'image') {
        let nextX = startX.value + event.translationX;
        let nextY = startY.value + event.translationY;
        if (lockCover.value) {
          const maxX = Math.max(0, (displayW.value * scale.value - cropW.value) / 2);
          const maxY = Math.max(0, (displayH.value * scale.value - cropH.value) / 2);
          nextX = clamp(nextX, -maxX, maxX);
          nextY = clamp(nextY, -maxY, maxY);
        }
        translateX.value = nextX;
        translateY.value = nextY;
        return;
      }

      if (mode === 'move') {
        cropX.value = clamp(startCropX.value + event.translationX, imageLeft, imageRight - cropW.value);
        cropY.value = clamp(startCropY.value + event.translationY, imageTop, imageBottom - cropH.value);
        return;
      }

      const right = startCropX.value + startCropW.value;
      const bottom = startCropY.value + startCropH.value;
      let nextX = startCropX.value;
      let nextY = startCropY.value;
      let nextW = startCropW.value;
      let nextH = startCropH.value;

      if (mode === 'tl' || mode === 'bl') {
        nextX = clamp(startCropX.value + event.translationX, imageLeft, right - MIN_CROP);
        nextW = right - nextX;
      }
      if (mode === 'tr' || mode === 'br') {
        nextW = clamp(startCropW.value + event.translationX, MIN_CROP, imageRight - startCropX.value);
      }
      if (mode === 'tl' || mode === 'tr') {
        nextY = clamp(startCropY.value + event.translationY, imageTop, bottom - MIN_CROP);
        nextH = bottom - nextY;
      }
      if (mode === 'bl' || mode === 'br') {
        nextH = clamp(startCropH.value + event.translationY, MIN_CROP, imageBottom - startCropY.value);
      }

      cropX.value = nextX;
      cropY.value = nextY;
      cropW.value = nextW;
      cropH.value = nextH;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const translateStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cropStyle = useAnimatedStyle(() => ({
    left: cropX.value,
    top: cropY.value,
    width: cropW.value,
    height: cropH.value,
  }));

  const topDimStyle = useAnimatedStyle(() => ({ height: Math.max(0, cropY.value) }));
  const bottomDimStyle = useAnimatedStyle(() => ({
    height: Math.max(0, viewH.value - cropY.value - cropH.value),
  }));
  const leftDimStyle = useAnimatedStyle(() => ({
    top: cropY.value,
    width: Math.max(0, cropX.value),
    height: cropH.value,
  }));
  const rightDimStyle = useAnimatedStyle(() => ({
    top: cropY.value,
    width: Math.max(0, viewW.value - cropX.value - cropW.value),
    height: cropH.value,
  }));

  const applyCrop = async () => {
    const sourceUri = workingUri ?? uri;
    if (!sourceUri || !imageSize.width || !imageSize.height || !displaySize.width || saving) return;
    setSaving(true);
    try {
      const currentScale = scale.value;
      const currentX = translateX.value;
      const currentY = translateY.value;
      const currentCropX = cropX.value;
      const currentCropY = cropY.value;
      const currentCropW = cropW.value;
      const currentCropH = cropH.value;
      const shownW = displaySize.width * currentScale;
      const shownH = displaySize.height * currentScale;
      const imageLeft = (viewport.width - displaySize.width) / 2 + (displaySize.width - shownW) / 2 + currentX;
      const imageTop = (viewport.height - displaySize.height) / 2 + (displaySize.height - shownH) / 2 + currentY;
      const scaleX = imageSize.width / shownW;
      const scaleY = imageSize.height / shownH;
      const originX = Math.max(0, (currentCropX - imageLeft) * scaleX);
      const originY = Math.max(0, (currentCropY - imageTop) * scaleY);
      const cropWidth = Math.min(imageSize.width - originX, currentCropW * scaleX);
      const cropHeight = Math.min(imageSize.height - originY, currentCropH * scaleY);

      const rendered = await ImageManipulator.manipulate(sourceUri)
        .crop({
          originX: Math.round(originX),
          originY: Math.round(originY),
          width: Math.max(1, Math.round(cropWidth)),
          height: Math.max(1, Math.round(cropHeight)),
        })
        .renderAsync();
      const result = await rendered.saveAsync({
        compress: 0.92,
        format: SaveFormat.JPEG,
      });
      onDone(result.uri);
    } catch (error) {
      smittenAlertFromError(error, 'Could not crop photo', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible && !!uri} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.flex}>
        <View style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}>
          <View style={styles.header}>
            <Pressable onPress={onCancel} disabled={saving} hitSlop={10} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Crop</Text>
            <Pressable
              onPress={() => void applyCrop()}
              disabled={saving || !ready}
              hitSlop={10}
              style={[styles.doneBtn, smittenGlassButton, (saving || !ready) && styles.doneBtnDisabled]}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.doneBtnText}>Done</Text>}
            </Pressable>
          </View>

          <GestureDetector gesture={composed}>
            <View
              style={styles.preview}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setViewport({ width, height });
              }}
            >
              {workingUri && displaySize.width > 0 ? (
                <View style={styles.stage}>
                  <Animated.View style={translateStyle}>
                    <Animated.View
                      style={[
                        { width: displaySize.width, height: displaySize.height, overflow: 'hidden' },
                        scaleStyle,
                      ]}
                    >
                      <Image
                        source={{ uri: workingUri }}
                        style={{ width: displaySize.width, height: displaySize.height }}
                        contentFit="fill"
                      />
                    </Animated.View>
                  </Animated.View>
                </View>
              ) : (
                <View style={styles.loading}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}

              {ready ? (
                <View pointerEvents="none" style={styles.mask}>
                  <Animated.View style={[styles.dim, styles.dimTop, topDimStyle]} />
                  <Animated.View style={[styles.dim, styles.dimBottom, bottomDimStyle]} />
                  <Animated.View style={[styles.dim, styles.dimLeft, leftDimStyle]} />
                  <Animated.View style={[styles.dim, styles.dimRight, rightDimStyle]} />
                  <Animated.View style={[styles.cropFrame, cropStyle]}>
                    {aspectRatio ? null : (
                      <>
                        <View style={[styles.handle, styles.handleTL]} />
                        <View style={[styles.handle, styles.handleTR]} />
                        <View style={[styles.handle, styles.handleBL]} />
                        <View style={[styles.handle, styles.handleBR]} />
                      </>
                    )}
                  </Animated.View>
                </View>
              ) : null}
            </View>
          </GestureDetector>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Text style={styles.hint}>
              {aspectRatio
                ? 'Pinch and drag to fit the photo'
                : 'Drag the box or its corners to crop freely. Pinch to zoom.'}
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#1a1216' },
  header: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: { minWidth: 72, paddingVertical: 8 },
  headerBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  headerTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 17 },
  doneBtn: {
    minWidth: 78,
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnDisabled: { opacity: 0.45 },
  doneBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  preview: { flex: 1, overflow: 'hidden', backgroundColor: '#110d10' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mask: { ...StyleSheet.absoluteFillObject },
  dim: { position: 'absolute', backgroundColor: 'rgba(10, 6, 8, 0.58)' },
  dimTop: { top: 0, left: 0, right: 0 },
  dimBottom: { bottom: 0, left: 0, right: 0 },
  dimLeft: { left: 0 },
  dimRight: { right: 0 },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },
  handle: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#C8103A',
  },
  handleTL: { top: -9, left: -9 },
  handleTR: { top: -9, right: -9 },
  handleBL: { bottom: -9, left: -9 },
  handleBR: { bottom: -9, right: -9 },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: '#1a1216',
  },
  hint: {
    color: SmittenColors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
});
