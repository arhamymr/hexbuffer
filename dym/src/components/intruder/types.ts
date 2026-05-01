import { HttpRequest } from '@/components/repeater/types';

export type AttackMode = 'Sniper' | 'BatteringRam';

export type PayloadType = 'SimpleList' | 'RuntimeFile' | 'NumberRange';

export interface PayloadPosition {
  name: string;
  start: number;
  end: number;
}

export interface PayloadConfig {
  payload_type: PayloadType;
  values: string[];
  file_path?: string;
  number_start?: number;
  number_end?: number;
  number_step?: number;
  number_format?: string;
}

export interface AttackConfig {
  name: string;
  mode: AttackMode;
  base_request: HttpRequest;
  positions: PayloadPosition[];
  payload_config: PayloadConfig;
  concurrency: number;
  delay_ms: number;
  delay_max_ms?: number;
  retries: number;
}

export interface AttackProgress {
  type: 'Update' | 'Complete';
  current?: number;
  total?: number;
}

export interface AttackResult {
  id: string;
  payload: string;
  status?: number;
  response_length?: number;
  response_time_ms?: number;
  error?: string;
  comment?: string;
  response?: {
    status: number;
    status_text: string;
    headers: Record<string, string>;
    body: string;
    time_ms: number;
    final_url: string;
  };
}

export function createDefaultAttackConfig(): AttackConfig {
  return {
    name: 'New Attack',
    mode: 'Sniper',
    base_request: {
      method: 'GET',
      url: 'http://localhost',
      headers: {},
      body: '',
      follow_redirects: true,
      max_hops: 10,
    },
    positions: [],
    payload_config: {
      payload_type: 'SimpleList',
      values: [],
    },
    concurrency: 10,
    delay_ms: 0,
    retries: 0,
  };
}

export function markPayloadPosition(
  text: string,
  start: number,
  end: number,
  _name: string
): string {
  const before = text.substring(0, start);
  const marked = text.substring(start, end);
  const after = text.substring(end);
  return `${before}§${marked}§${after}`;
}

export function findPayloadPositions(text: string): PayloadPosition[] {
  const positions: PayloadPosition[] = [];
  let searchStart = 0;

  while (true) {
    const startIdx = text.indexOf('§', searchStart);
    if (startIdx === -1) break;

    const endIdx = text.indexOf('§', startIdx + 1);
    if (endIdx === -1) break;

    positions.push({
      name: `position_${positions.length + 1}`,
      start: startIdx,
      end: endIdx,
    });

    searchStart = endIdx + 1;
  }

  return positions;
}

export function applyPayloadToPosition(
  text: string,
  position: PayloadPosition,
  payload: string
): string {
  const before = text.substring(0, position.start);
  const after = text.substring(position.end + 1);
  return `${before}${payload}${after}`;
}