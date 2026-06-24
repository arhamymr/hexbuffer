import { buildRawHttpRequest, parseRawHttpRequest } from '@/lib/http-message';

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  follow_redirects: boolean;
  max_hops: number;
}

export type AttackMode = 'Sniper';

export type PayloadType = 'SimpleList' | 'RuntimeFile' | 'NumberRange';

export type PayloadProcessingStep =
  | 'UrlEncode'
  | 'UrlDecode'
  | 'Base64Encode'
  | 'Base64Decode'
  | 'Md5Hash'
  | 'Sha1Hash'
  | 'Sha256Hash';

export interface PayloadPosition {
  name: string;
  start: number;
  end: number;
  default_value: string;
}

export interface PayloadConfig {
  payload_type: PayloadType;
  values: string[];
  file_path?: string;
  number_start?: number;
  number_end?: number;
  number_step?: number;
  number_format?: string;
  processing: PayloadProcessingStep[];
}

export interface GrepMatchConfig {
  enabled: boolean;
  keyword: string;
  case_sensitive: boolean;
}

export interface GrepExtractConfig {
  enabled: boolean;
  regex: string;
  replacement?: string;
}

export interface SessionHandlingConfig {
  enabled: boolean;
  extract_token_name?: string;
  extract_from_response?: string;
  update_header_name?: string;
}

export interface AttackConfig {
  name: string;
  mode: AttackMode;
  base_request: HttpRequest;
  positions: PayloadPosition[];
  payload_config: PayloadConfig;
  position_payloads: Record<string, PayloadConfig>;
  concurrency: number;
  delay_ms: number;
  delay_max_ms?: number;
  retries: number;
  grep_match: GrepMatchConfig;
  grep_extract: GrepExtractConfig;
  session_handling: SessionHandlingConfig;
}

export interface AttackProgress {
  type: 'Update' | 'Complete';
  current?: number;
  total?: number;
}

export interface AttackResult {
  id: string;
  payload_values: Record<string, string>;
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
  grep_match: boolean;
  grep_extracted?: string;
}

export function createDefaultAttackConfig(): AttackConfig {
  const payloadConfig = createDefaultPayloadConfig();

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
    payload_config: payloadConfig,
    position_payloads: {},
    concurrency: 10,
    delay_ms: 100,
    retries: 0,
    grep_match: {
      enabled: false,
      keyword: '',
      case_sensitive: false,
    },
    grep_extract: {
      enabled: false,
      regex: '',
      replacement: undefined,
    },
    session_handling: {
      enabled: false,
      extract_token_name: undefined,
      extract_from_response: undefined,
      update_header_name: undefined,
    },
  };
}

export function createDefaultPayloadConfig(): PayloadConfig {
  return {
    payload_type: 'SimpleList',
    values: [],
    processing: [],
  };
}

export function syncPositionPayloads(
  positions: PayloadPosition[],
  current: Record<string, PayloadConfig> = {},
  fallback?: PayloadConfig
): Record<string, PayloadConfig> {
  return positions.reduce<Record<string, PayloadConfig>>((nextPayloads, position) => {
    nextPayloads[position.name] = current[position.name] ?? {
      ...(fallback ?? createDefaultPayloadConfig()),
      values: fallback?.values ?? [],
      file_path: fallback?.file_path,
    };
    return nextPayloads;
  }, {});
}

export function payloadConfigHasValues(config: PayloadConfig) {
  return (
    config.payload_type === 'NumberRange' ||
    config.values.length > 0 ||
    Boolean(config.file_path)
  );
}

export function allPositionsHavePayloads(config: AttackConfig) {
  if (config.positions.length === 0) {
    return false;
  }

  return config.positions.every((position) =>
    payloadConfigHasValues(config.position_payloads[position.name] ?? config.payload_config)
  );
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
      default_value: text.slice(startIdx + 1, endIdx),
    });

    searchStart = endIdx + 1;
  }

  return positions;
}

export function findRequestPayloadPositions(request: Partial<HttpRequest>): PayloadPosition[] {
  const positions: PayloadPosition[] = [];

  const collect = (text: string | undefined) => {
    if (!text) {
      return;
    }

    findPayloadPositions(text).forEach((position) => {
      positions.push({
        name: `position_${positions.length + 1}`,
        start: 0,
        end: 0,
        default_value: position.default_value,
      });
    });
  };

  collect(request.url);
  Object.entries(request.headers ?? {}).forEach(([name, value]) => {
    collect(name);
    collect(value);
  });
  collect(request.body);

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

export function buildRawRequest(request: Partial<HttpRequest>): string {
  return buildRawHttpRequest(request, { decodePayloadMarkers: true });
}

export function parseRawRequest(raw: string): Partial<HttpRequest> | null {
  const request = parseRawHttpRequest(raw, {
    invalidMode: 'null',
    trim: true,
    defaultProtocol: 'https',
  });

  if (!request) {
    return null;
  }

  return { ...request, follow_redirects: true, max_hops: 10 };
}
