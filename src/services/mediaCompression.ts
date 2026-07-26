import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { loadNativeVideoTools } from '@/src/services/nativeVideoTools';
import {
  formatVideoDuration,
  MAX_VIDEO_COMPRESSION_SOURCE_BYTES,
  videoEditorMaxDurationMs,
} from '@/src/services/videoUploadLimits';

export type UploadImagePreset = 'media' | 'avatar';
export type UploadMediaKind = 'image' | 'video';

export type PreparedUploadImage = {
  uri: string;
  name: string;
  type: 'image/jpeg';
  sizeBytes: number | null;
  width: number;
  height: number;
};

export type PreparedUploadMedia = PreparedUploadImage | {
  uri: string;
  name: string;
  type: 'video/mp4';
  sizeBytes: number | null;
  kind: 'video';
};

export const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;
const SAFE_VIDEO_TARGET_BYTES = 47 * 1024 * 1024;

const PRESETS: Record<
  UploadImagePreset,
  { maxDimension: number; targetBytes: number; qualities: readonly number[] }
> = {
  // Similar to the standard-quality path used by messaging apps: screen-sized,
  // visually clean, and normally a few hundred KB instead of several MB.
  media: {
    maxDimension: 1600,
    targetBytes: 500 * 1024,
    qualities: [0.82, 0.72, 0.62, 0.52, 0.44],
  },
  avatar: {
    maxDimension: 1080,
    targetBytes: 250 * 1024,
    qualities: [0.8, 0.68, 0.56, 0.46, 0.38],
  },
};

/** Return the size in bytes for a local file URI, or null if unknown. */
export function fileSize(uri: string): number | null {
  try {
    return new File(uri).size;
  } catch {
    return null;
  }
}

function removeCachedFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup is best effort; Expo also clears its cache automatically.
  }
}

export function cleanupPreparedMedia(originalUri: string, preparedUri: string): void {
  const original = normalizeLocalUri(originalUri);
  const prepared = normalizeLocalUri(preparedUri);
  if (original !== prepared) removeCachedFile(prepared);
  const originalName = original.split('/').pop()?.split('?')[0] ?? '';
  if (/^trimmedVideo_/i.test(originalName)) removeCachedFile(original);
}

function normalizeLocalUri(uri: string): string {
  return uri.startsWith('/') ? `file://${uri}` : uri;
}

/**
 * Resize and JPEG-encode a local photo before upload.
 *
 * The target is deliberately a range, not a promise: JPEG size depends on image
 * detail. We try progressively lower quality and then a smaller dimension until
 * the target is met, while retaining the best candidate produced.
 */
export async function prepareImageForUpload(
  uri: string,
  preset: UploadImagePreset = 'media',
): Promise<PreparedUploadImage> {
  const settings = PRESETS[preset];
  const probe = await ImageManipulator.manipulate(uri).renderAsync();
  const longestSide = Math.max(probe.width, probe.height);
  const firstMax = Math.min(longestSide, settings.maxDimension);
  const dimensionAttempts = [
    firstMax,
    Math.min(firstMax, Math.round(settings.maxDimension * 0.8)),
  ].filter((value, index, values) => value > 0 && values.indexOf(value) === index);

  let smallest: PreparedUploadImage | null = null;

  for (const maxDimension of dimensionAttempts) {
    const context = ImageManipulator.manipulate(uri);
    if (longestSide > maxDimension) {
      if (probe.width >= probe.height) context.resize({ width: maxDimension });
      else context.resize({ height: maxDimension });
    }
    const rendered = await context.renderAsync();

    for (const quality of settings.qualities) {
      const result = await rendered.saveAsync({
        compress: quality,
        format: SaveFormat.JPEG,
      });
      const sizeBytes = fileSize(result.uri);
      const candidate: PreparedUploadImage = {
        uri: result.uri,
        name: `smitten-${Date.now()}.jpg`,
        type: 'image/jpeg',
        sizeBytes,
        width: result.width,
        height: result.height,
      };

      if (sizeBytes !== null && sizeBytes <= settings.targetBytes) {
        if (smallest && smallest.uri !== candidate.uri) removeCachedFile(smallest.uri);
        return candidate;
      }

      if (
        !smallest ||
        (sizeBytes !== null && (smallest.sizeBytes === null || sizeBytes < smallest.sizeBytes))
      ) {
        if (smallest) removeCachedFile(smallest.uri);
        smallest = candidate;
      } else {
        removeCachedFile(candidate.uri);
      }

    }
  }

  if (!smallest) throw new Error('Could not prepare image for upload');
  return smallest;
}

/**
 * Transcode a local video to an upload-safe MP4. The bitrate is derived from
 * duration and retried at smaller resolutions until the result is safely below
 * the server's 50 MB multipart limit.
 */
export async function prepareVideoForUpload(
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<PreparedUploadMedia> {
  const normalizedUri = normalizeLocalUri(uri);
  const sizeBytes = fileSize(normalizedUri);
  if (sizeBytes !== null && sizeBytes <= SAFE_VIDEO_TARGET_BYTES) {
    onProgress?.(1);
    return {
      uri: normalizedUri,
      name: `smitten-${Date.now()}.mp4`,
      type: 'video/mp4',
      sizeBytes,
      kind: 'video',
    };
  }

  const videoTools = loadNativeVideoTools();
  const validation = await videoTools.isValidFile(normalizedUri);
  if (!validation.isValid || validation.fileType !== 'video') {
    throw new Error('The selected file is not a valid video.');
  }
  if (sizeBytes !== null && sizeBytes > MAX_VIDEO_COMPRESSION_SOURCE_BYTES) {
    const trimLimit = videoEditorMaxDurationMs(sizeBytes, validation.duration);
    throw new Error(
      `This clip is too large to compress safely. Trim it to ${formatVideoDuration(trimLimit)} or less and try again.`,
    );
  }

  const durationSeconds = Math.max(validation.duration / 1000, 1);
  // Reserve 10% for AAC audio and container overhead.
  const targetBitrate = Math.floor((SAFE_VIDEO_TARGET_BYTES * 8 * 0.9) / durationSeconds);
  const attempts = [
    { bitrate: Math.min(4_500_000, Math.max(700_000, targetBitrate)), width: -1 },
    { bitrate: Math.min(3_000_000, Math.max(550_000, Math.floor(targetBitrate * 0.82))), width: 1280 },
    { bitrate: Math.min(1_800_000, Math.max(400_000, Math.floor(targetBitrate * 0.62))), width: 960 },
    { bitrate: Math.min(1_000_000, Math.max(300_000, Math.floor(targetBitrate * 0.45))), width: 720 },
  ];

  let lastOutput: string | null = null;
  let lastError: unknown = null;
  for (let index = 0; index < attempts.length; index += 1) {
    onProgress?.(index / attempts.length);
    if (lastOutput) {
      await videoTools.deleteFile(lastOutput).catch(() => false);
      lastOutput = null;
    }
    try {
      const result = await videoTools.compress(normalizedUri, {
        bitrate: attempts[index].bitrate,
        width: attempts[index].width,
        frameRate: 30,
        outputExt: 'mp4',
        removeAudio: false,
      });
      lastOutput = normalizeLocalUri(result.outputPath);
      const outputBytes = fileSize(lastOutput);
      onProgress?.((index + 1) / attempts.length);
      if (outputBytes !== null && outputBytes <= SAFE_VIDEO_TARGET_BYTES) {
        return {
          uri: lastOutput,
          name: `smitten-${Date.now()}.mp4`,
          type: 'video/mp4',
          sizeBytes: outputBytes,
          kind: 'video',
        };
      }
    } catch (error) {
      lastError = error;
      console.warn('[videoCompression] attempt failed', {
        attempt: index + 1,
        width: attempts[index].width,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (lastOutput) await videoTools.deleteFile(lastOutput).catch(() => false);
  if (lastError) {
    console.error('[videoCompression] all encoder attempts failed', lastError);
  }
  throw new Error('Could not reduce this video below 50 MB. Trim it shorter and try again.');
}

export async function prepareMediaForUpload(
  uri: string,
  kind: UploadMediaKind,
  imagePreset: UploadImagePreset = 'media',
  onProgress?: (progress: number) => void,
): Promise<PreparedUploadMedia> {
  if (kind === 'video') return prepareVideoForUpload(uri, onProgress);
  const prepared = await prepareImageForUpload(uri, imagePreset);
  onProgress?.(1);
  return prepared;
}
