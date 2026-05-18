import type { AttackResult } from '../types';

export function formatPayloadValues(payloadValues: Record<string, string>) {
  return Object.entries(payloadValues)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

export function filterResults(
  results: AttackResult[],
  filters: {
    status: string;
    payload: string;
    grepOnly: boolean;
  }
) {
  return results.filter((result) => {
    if (filters.status && result.status?.toString() !== filters.status) {
      return false;
    }

    if (filters.payload) {
      const payloadStr = formatPayloadValues(result.payload_values);
      if (!payloadStr.toLowerCase().includes(filters.payload.toLowerCase())) {
        return false;
      }
    }

    if (filters.grepOnly && !result.grep_match) {
      return false;
    }

    return true;
  });
}

export function downloadResults(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
