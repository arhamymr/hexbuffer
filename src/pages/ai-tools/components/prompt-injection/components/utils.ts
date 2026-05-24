import type { PayloadMode } from './types';

export function parsePayloadLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getPayloadModeLabel(mode: PayloadMode) {
  if (mode === 'manual') {
    return 'Manual';
  }

  if (mode === 'import') {
    return 'Imported';
  }

  return 'Library';
}

export function detectFindings(body: string, keywords: string[]) {
  const lowerBody = body.toLowerCase();

  return keywords.filter((keyword) => lowerBody.includes(keyword.toLowerCase()));
}

export function countMarkedTargets(value: string) {
  return value.match(/§[^§]*§/g)?.length ?? 0;
}

export function replaceMarkedTargets(value: string, payload: string) {
  return value.replace(/§[^§]*§/g, payload);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
