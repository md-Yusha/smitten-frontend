import { loadNativeVideoTools } from '@/src/services/nativeVideoTools';
import { File } from 'expo-file-system';
import { videoEditorMaxDurationMs } from '@/src/services/videoUploadLimits';

let editorOpen = false;

function localFileSize(uri: string): number | null {
  try {
    return new File(uri).size;
  } catch {
    return null;
  }
}

async function openNativeEditor(
  uri: string,
  config: Record<string, unknown>,
): Promise<string | null> {
  if (editorOpen) throw new Error('The editor is already open.');
  const tools = loadNativeVideoTools();
  const native = tools.default as import('react-native-video-trim').Spec;

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
      native.onStartTrimming(() => {
        native.closeEditor();
      }),
      native.onFinishTrimming(({ outputPath }) => finish(outputPath)),
      native.onCancel(() => finish(null)),
      native.onLog(({ level, message }) => {
        recentLogs.push(`[${level}] ${message}`);
        if (recentLogs.length > 8) recentLogs.shift();
      }),
      native.onError(({ message, errorCode }) => {
        const detail = message || 'Editing failed.';
        if (errorCode === 'FAIL_TO_LOAD_MEDIA') {
          finish(null, new Error(`FAIL_TO_LOAD_MEDIA: ${detail}`));
          return;
        }
        console.warn('[videoEditor] native editor error', {
          errorCode,
          message: detail,
          logs: recentLogs,
        });
        finish(null, new Error(`Editing failed${errorCode ? ` (${errorCode})` : ''}: ${detail}`));
      }),
    );

    try {
      tools.showEditor(uri, config as Parameters<typeof tools.showEditor>[1]);
    } catch (error) {
      finish(null, error instanceof Error ? error : new Error('Could not open the editor.'));
    }
  });
}

/** Opens the native preview/trimmer and resolves with its new local MP4. */
export async function editVideoForUpload(
  uri: string,
  reportedSizeBytes?: number | null,
  reportedDurationMs?: number | null,
): Promise<string | null> {
  const tools = loadNativeVideoTools();
  let durationMs = reportedDurationMs ?? null;
  if (durationMs === null || !Number.isFinite(durationMs) || durationMs <= 0) {
    const validation = await tools.isValidFile(uri);
    if (!validation.isValid || validation.fileType !== 'video') {
      throw new Error('The selected file is not a valid video.');
    }
    durationMs = validation.duration;
  }
  const sourceBytes = reportedSizeBytes ?? localFileSize(uri);
  const maxDuration = videoEditorMaxDurationMs(sourceBytes, durationMs);

  return openNativeEditor(uri, {
    maxDuration,
    minDuration: 1_000,
    outputExt: 'mp4',
    theme: 'light',
    durationFormat: 'mm:ss',
    headerText: 'Preview & trim video',
    cancelButtonText: 'Back',
    saveButtonText: 'Use video',
    trimmingText: ' ',
    trimmerColor: '#D94E74',
    autoplay: true,
    enableSaveDialog: false,
    enableEditTools: true,
    enablePreciseTrimming: false,
    enableCancelTrimming: true,
    fullScreenModalIOS: true,
  });
}
