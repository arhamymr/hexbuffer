import { invoke } from '@tauri-apps/api/core';

import type { ParsedRepeaterRequest, RepeaterResponse } from './types';

export async function sendRepeaterRequest(request: ParsedRepeaterRequest): Promise<RepeaterResponse> {
  return invoke<RepeaterResponse>('send_repeater_request', { request });
}
