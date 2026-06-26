import { buildRawHttpRequest, buildRawHttpResponse } from '@/lib/http-message';
import type { PausedRequest } from './types';

const textDecoder = new TextDecoder();

export function decodeRequestBody(body: number[]): string {
  return textDecoder.decode(new Uint8Array(body));
}

export function getPausedDirection(pausedRequest: PausedRequest): 'request' | 'response' {
  return pausedRequest.response ? 'response' : 'request';
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

export function buildRawPausedResponse(pausedRequest: PausedRequest | null): string {
  if (!pausedRequest?.response) {
    return '';
  }

  return buildRawHttpResponse({
    status: pausedRequest.response.status_code,
    status_text: pausedRequest.response.status_text,
    headers: pausedRequest.response.headers,
    body: decodeRequestBody(pausedRequest.response.body),
  });
}

export function buildRawPausedMessage(pausedRequest: PausedRequest | null): string {
  if (!pausedRequest) {
    return '';
  }

  return pausedRequest.response ? buildRawPausedResponse(pausedRequest) : buildRawPausedRequest(pausedRequest);
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
