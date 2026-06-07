export const proxyStatusLabel = {
  connected: 'Connected',
  starting: 'Starting',
  stopping: 'Stopping',
  disconnected: 'Disconnected',
} as const;

export function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return '0 MB';
  }

  const megabytes = bytes / 1024 / 1024;
  if (megabytes < 1) {
    return `${Math.max(1, Math.round(megabytes * 1024))} KB`;
  }

  return `${megabytes.toFixed(1)} MB`;
}
