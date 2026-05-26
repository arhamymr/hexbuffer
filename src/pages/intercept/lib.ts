import { buildRawHttpRequest } from '@/lib/http-message';
import type { PausedRequest } from './types';

const textDecoder = new TextDecoder();

export function decodeRequestBody(body: number[]): string {
  return textDecoder.decode(new Uint8Array(body));
}

export function buildRawPausedRequest(pausedRequest: PausedRequest | null): string {
  if (!pausedRequest) {
    return '';
  }

  return buildRawHttpRequest(
    {
      method: pausedRequest.request.method,
      url: pausedRequest.request.uri,
      headers: pausedRequest.request.headers,
      body: decodeRequestBody(pausedRequest.request.body),
    },
    { addHostHeader: false }
  );
}

export function getRequestHost(pausedRequest: PausedRequest): string {
  try {
    return new URL(pausedRequest.request.uri).host;
  } catch {
    return pausedRequest.request.uri;
  }
}

export function getRequestPath(pausedRequest: PausedRequest): string {
  try {
    const url = new URL(pausedRequest.request.uri);
    return `${url.pathname}${url.search}` || '/';
  } catch {
    return pausedRequest.request.uri;
  }
}

export function formatRequestTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}
