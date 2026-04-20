/** Limits for embedded media (localStorage-friendly). */
export const MAX_IMAGE_FILE_BYTES = 1_800_000;
export const MAX_AUDIO_FILE_BYTES = 4_000_000;
export const MAX_RECORDED_AUDIO_BYTES = 4_000_000;

export function formatBytesHuman(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} bytes`;
}
