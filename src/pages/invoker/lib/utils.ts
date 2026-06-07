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
  search: string
) {
  if (!search) return results;

  const term = search.toLowerCase();
  return results.filter((result) => {
    if (result.status?.toString().includes(term)) return true;
    const payloadStr = formatPayloadValues(result.payload_values);
    if (payloadStr.toLowerCase().includes(term)) return true;
    return false;
  });
}
