import { getHttpLogDetail } from '@/pages/live-traffic/http-history/api';
import { buildRawHttpRequest } from '@/lib/http-message';
import { useRepeaterStore } from '@/stores/repeater';
import { useNavStore } from '@/stores/nav';
import { cleanUrl } from '@/lib/utils';

export interface SendToRepeaterOptions {
  logId: string;
}

/**
 * @deprecated Use {@link sendToCollection} from './send-to-collection' instead.
 * The new function allows selecting a target collection and saves the API call
 * as an endpoint within that collection, which integrates with the collection tab workspace.
 */
export async function sendToRepeater(options: SendToRepeaterOptions): Promise<void> {
  const { logId } = options;
  if (!logId) return;

  const detail = await getHttpLogDetail(logId);
  const body = new TextDecoder().decode(new Uint8Array(detail.request.body));
  const cleanedUrl = cleanUrl(detail.request.uri);
  const raw = buildRawHttpRequest({
    method: detail.request.method,
    url: cleanedUrl,
    headers: detail.request.headers,
    body,
  });

  useRepeaterStore.getState().addRequestTab({ raw, url: cleanedUrl });
  useNavStore.getState().triggerNavBlink('/repeater');
  useNavStore.getState().openWindow('/repeater', 'Repeater');
  useNavStore.getState().focusWindow('/repeater');
}
