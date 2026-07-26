import { loadNativeVideoTools } from '@/src/services/nativeVideoTools';
import { fileSize } from '@/src/services/mediaCompression';
import { Alert } from 'react-native';
import {
  formatVideoDuration,
  MAX_VIDEO_COMPRESSION_SOURCE_BYTES,
  videoEditorMaxDurationMs,
} from '@/src/services/videoUploadLimits';

let editorOpen = false;

/** Opens the native preview/trimmer and resolves with its new local MP4. */
export async function editVideoForUpload(
  uri: string,
  reportedSizeBytes?: number | null,
): Promise<string | null> {
  if (editorOpen) throw new Error('The video editor is already open.');
  const tools = loadNativeVideoTools();
  const native = tools.default as import('react-native-video-trim').Spec;
  const validation = await tools.isValidFile(uri);
  if (!validation.isValid || validation.fileType !== 'video') {
    throw new Error('The selected file is not a valid video.');
  }
  const sourceBytes = reportedSizeBytes ?? fileSize(uri);
  const maxDuration = videoEditorMaxDurationMs(sourceBytes, validation.duration);
  const requiresSizeTrim =
    sourceBytes !== null && sourceBytes > MAX_VIDEO_COMPRESSION_SOURCE_BYTES;
  if (sourceBytes !== null && sourceBytes > MAX_VIDEO_COMPRESSION_SOURCE_BYTES) {
    const shouldTrim = await new Promise<boolean>((resolve) => {
      let resolved = false;
      const finish = (value: boolean) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
      };
      Alert.alert(
        'Video file is too large',
        `This video is ${Math.ceil(sourceBytes / (1024 * 1024))} MB. Trim it to ${formatVideoDuration(maxDuration)} or less so it can be compressed and uploaded.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => finish(false) },
          { text: 'Trim video', onPress: () => finish(true) },
        ],
        { cancelable: true, onDismiss: () => finish(false) },
      );
    });
    if (!shouldTrim) return null;
  }

  editorOpen = true;
  return new Promise<string | null>((resolve, reject) => {
    let settled = false;
    const recentLogs: string[] = [];
    const subscriptions: { remove: () => void }[] = [];
    const finish = (value: string | null, error?: Error) => {
      if (settled) return;
      settled = true;
      editorOpen = false;
      subscriptions.forEach((subscription) => subscription.remove());
      if (error) reject(error);
      else resolve(value);
    };

    subscriptions.push(
      native.onFinishTrimming(({ outputPath }) => finish(outputPath)),
      native.onCancel(() => finish(null)),
      native.onLog(({ level, message }) => {
        recentLogs.push(`[${level}] ${message}`);
        if (recentLogs.length > 8) recentLogs.shift();
      }),
      native.onError(({ message, errorCode }) => {
        const detail = message || 'Video editing failed.';
        console.error('[videoEditor] native trim error', {
          errorCode,
          message: detail,
          logs: recentLogs,
        });
        finish(null, new Error(`Video editing failed${errorCode ? ` (${errorCode})` : ''}: ${detail}`));
      }),
    );

    try {
      tools.showEditor(uri, {
        maxDuration,
        minDuration: 1_000,
        outputExt: 'mp4',
        theme: 'dark',
        durationFormat: 'mm:ss',
        headerText: requiresSizeTrim
          ? `Trim to ${formatVideoDuration(maxDuration)} or less`
          : 'Preview & trim video',
        cancelButtonText: 'Back',
        saveButtonText: requiresSizeTrim ? 'Use trimmed clip' : 'Use video',
        trimmingText: 'Trimming video…',
        trimmerColor: '#F05A28',
        autoplay: true,
        enableSaveDialog: false,
        // Stream-copy trimming avoids device-specific MediaCodec failures. The
        // shared upload step performs size compression separately when needed.
        enablePreciseTrimming: false,
        enableCancelTrimming: true,
        fullScreenModalIOS: true,
      });
    } catch (error) {
      finish(null, error instanceof Error ? error : new Error('Could not open the video editor.'));
    }
  });
}
