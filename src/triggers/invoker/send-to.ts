import { getHttpLogDetail } from '@/pages/http-history/api';
import { useInvokerStore } from '@/stores/invoker';
import { useNavStore } from '@/stores/nav';
import {
  createDefaultAttackConfig,
  findRequestPayloadPositions,
} from '@/pages/invoker/types';

export interface SendToInvokerOptions {
  logId: string;
  rawRequest?: string;
  payloadValues?: string[];
  delayMs?: number;
}

export async function sendToInvoker(options: SendToInvokerOptions): Promise<void> {
  const { logId, rawRequest, payloadValues, delayMs } = options;
  if (!logId) return;

  const detail = await getHttpLogDetail(logId);
  const body = new TextDecoder().decode(new Uint8Array(detail.request.body));
  const baseRequest = {
    method: detail.request.method,
    url: detail.request.uri,
    headers: detail.request.headers,
    body: rawRequest ?? body,
    follow_redirects: true,
    max_hops: 10,
  };

  const config = {
    ...createDefaultAttackConfig(),
    name: `${detail.request.method} ${detail.request.uri}`,
    base_request: baseRequest,
    positions: findRequestPayloadPositions(baseRequest),
    ...(delayMs !== undefined ? { delay_ms: delayMs } : {}),
  };

  const invokerStore = useInvokerStore.getState();
  invokerStore.addAttackTab(config);

  if (payloadValues?.length) {
    invokerStore.updatePayloadValues(payloadValues);
  }

  useNavStore.getState().triggerNavBlink('/invoker');
  useNavStore.getState().openWindow('/invoker', 'Invoker');
  useNavStore.getState().focusWindow('/invoker');
}
