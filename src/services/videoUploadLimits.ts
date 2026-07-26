export const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;
export const SAFE_VIDEO_TARGET_BYTES = 47 * 1024 * 1024;
export const MIN_VIDEO_COMPRESSION_BITRATE_BPS = 300_000;

const VIDEO_PAYLOAD_FRACTION = 0.9;

/**
 * Calculate the longest clip expected to fit the upload pipeline.
 *
 * The output-rate limit uses the smaller of the source bitrate and our lowest
 * compression bitrate, reserving 10% for audio and container overhead.
 */
export function videoEditorMaxDurationMs(sourceBytes: number | null, durationMs: number): number {
  if (
    sourceBytes === null ||
    !Number.isFinite(sourceBytes) ||
    sourceBytes <= 0 ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return Math.max(1_000, Math.floor(durationMs));
  }

  const sourceBytesPerMs = sourceBytes / durationMs;
  const minimumCompressedBytesPerMs =
    MIN_VIDEO_COMPRESSION_BITRATE_BPS / 8 / VIDEO_PAYLOAD_FRACTION / 1_000;
  const estimatedOutputBytesPerMs = Math.min(
    sourceBytesPerMs,
    minimumCompressedBytesPerMs,
  );
  const outputLimitedDurationMs =
    SAFE_VIDEO_TARGET_BYTES / estimatedOutputBytesPerMs;

  return Math.max(
    1_000,
    Math.floor(Math.min(durationMs, outputLimitedDurationMs)),
  );
}

export function formatVideoDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
}
