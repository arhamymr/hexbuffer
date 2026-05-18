import { invoke } from '@tauri-apps/api/core';

import type { RepeaterRequest, RepeaterResponse } from './types';
import { parseHeaders } from './types';

export interface SendRepeaterRequestPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export async function sendRepeaterRequest(request: RepeaterRequest): Promise<RepeaterResponse> {
  return invoke<RepeaterResponse>('send_repeater_request', {
    request: {
      method: request.method,
      url: request.url,
      headers: parseHeaders(request.headers),
      body: request.body,
    } satisfies SendRepeaterRequestPayload,
  });
}
