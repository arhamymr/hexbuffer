import type { AttackResult } from '../types';

export function formatPayloadValues(payloadValues: Record<string, string>) {
  return Object.entries(payloadValues)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

export function getResultUrl(result: AttackResult) {
  return result.response?.final_url ?? '';
}

export function filterResults(
  results: AttackResult[],
  filters: {
    status: string;
    payload: string;
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

    return true;
  });
}
