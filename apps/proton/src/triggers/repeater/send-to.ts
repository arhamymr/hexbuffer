import { getHttpLogDetail } from '@/pages/live-traffic/api';
import { buildRawHttpRequest } from '@/lib/http-message';
import { useRepeaterStore } from '@/stores/repeater';
import { useNavStore } from '@/stores/nav';

export interface SendToRepeaterOptions {
  logId: string;
}

export async function sendToRepeater(options: SendToRepeaterOptions): Promise<void> {
  const { logId } = options;
  if (!logId) return;

  const detail = await getHttpLogDetail(logId);
  const body = new TextDecoder().decode(new Uint8Array(detail.request.body));
  const raw = buildRawHttpRequest({
    method: detail.request.method,
    url: detail.request.uri,
    headers: detail.request.headers,
    body,
  });

  useRepeaterStore.getState().addRequestTab({ raw, url: detail.request.uri });
  useNavStore.getState().triggerNavBlink('/repeater');
}
