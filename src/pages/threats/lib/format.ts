export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function formatEntropy(value?: number) {
  if (value === undefined || Number.isNaN(value)) return 'n/a';
  return value.toFixed(3);
}

export function formatDate(value?: string) {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString();
}

export function lowerIncludes(value: unknown, query: string) {
  return String(value ?? '').toLowerCase().includes(query);
}
