/** Uploads have no application-enforced byte limit. */
export const MAX_VIDEO_UPLOAD_BYTES = Number.POSITIVE_INFINITY;
/** Preferred optimization target, not an upload limit. */
export const SAFE_VIDEO_TARGET_BYTES = 15 * 1024 * 1024;
export const MIN_VIDEO_COMPRESSION_BITRATE_BPS = 220_000;

/**
 * The editor allows the full selected clip. Users can still trim voluntarily.
 */
export function videoEditorMaxDurationMs(sourceBytes: number | null, durationMs: number): number {
  void sourceBytes;
  return Math.max(1_000, Math.floor(durationMs));
}

export function formatVideoDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
}
