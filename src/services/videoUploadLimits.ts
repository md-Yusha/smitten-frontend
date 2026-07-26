export const MAX_VIDEO_DURATION_MS = 120_000;
export const MAX_VIDEO_COMPRESSION_SOURCE_BYTES = 500 * 1024 * 1024;

/**
 * Large source videos are stream-trimmed before transcoding. The 10% headroom
 * accounts for keyframe-aligned trimming producing a slightly larger clip.
 */
export function videoEditorMaxDurationMs(sourceBytes: number | null, durationMs: number): number {
  if (
    sourceBytes === null ||
    sourceBytes <= MAX_VIDEO_COMPRESSION_SOURCE_BYTES ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return MAX_VIDEO_DURATION_MS;
  }

  return Math.max(
    1_000,
    Math.min(
      MAX_VIDEO_DURATION_MS,
      Math.floor(
        durationMs * ((MAX_VIDEO_COMPRESSION_SOURCE_BYTES * 0.9) / sourceBytes),
      ),
    ),
  );
}

export function formatVideoDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
}
