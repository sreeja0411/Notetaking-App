export const MAX_AUDIO_FILE_BYTES    = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_FILE_BYTES    = 8  * 1024 * 1024; // 8 MB
export const MAX_RECORDED_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB

export function formatBytesHuman(bytes) {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
