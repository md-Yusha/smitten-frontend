import { loadNativeVideoTools } from '@/src/services/nativeVideoTools';

let editorOpen = false;

/** Opens the native preview/trimmer and resolves with its new local MP4. */
export async function editVideoForUpload(uri: string): Promise<string | null> {
  if (editorOpen) throw new Error('The video editor is already open.');
  const tools = loadNativeVideoTools();
  const native = tools.default as import('react-native-video-trim').Spec;
  const validation = await tools.isValidFile(uri);
  if (!validation.isValid || validation.fileType !== 'video') {
    throw new Error('The selected file is not a valid video.');
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
        maxDuration: 120_000,
        minDuration: 1_000,
        outputExt: 'mp4',
        theme: 'dark',
        durationFormat: 'mm:ss',
        headerText: 'Preview & trim video',
        cancelButtonText: 'Back',
        saveButtonText: 'Use video',
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
