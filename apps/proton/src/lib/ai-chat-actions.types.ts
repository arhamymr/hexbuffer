export interface AddTargetPayload {
  host: string;
  name: string | null;
}

export interface AddTargetsPayload {
  hosts: Array<{ host: string; name?: string | null }>;
  targetId?: string | null;
}

export interface DeleteTargetPayload {
  targetId: string;
}

export interface DeleteAllTargetsPayload {
  // empty — just a signal
}

export interface WriteDocumentPayload {
  documentId: string | null;
  sectionKey: string | null;
  title: string | null;
  content: string;
  mode: 'append' | 'replace';
}

export interface StartProxyPayload {
  port?: number;
  tlsPort?: number;
}

export interface TriggerScanPayload {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  headless?: boolean;
}

export interface SendToInvokerPayload {
  logId: string;
  rawRequest?: string;
  payloadValues?: string[];
  delayMs?: number;
}

export interface SendToRepeaterPayload {
  logId: string;
}

export interface NavigateToPayload {
  path: string;
}

export interface SubmitCrawlInputPayload {
  sessionId: string;
  url?: string;
  fields: Record<string, string>;
}

export type AiChatActionPayload =
  | { action: 'add_target'; payload: AddTargetPayload }
  | { action: 'add_targets'; payload: AddTargetsPayload }
  | { action: 'write_document'; payload: WriteDocumentPayload }
  | { action: 'start_proxy'; payload: StartProxyPayload }
  | { action: 'trigger_scan'; payload: TriggerScanPayload }
  | { action: 'send_to_invoker'; payload: SendToInvokerPayload }
  | { action: 'send_to_repeater'; payload: SendToRepeaterPayload }
  | { action: 'navigate_to'; payload: NavigateToPayload }
  | { action: 'submit_crawl_input'; payload: SubmitCrawlInputPayload }
  | { action: 'delete_target'; payload: DeleteTargetPayload }
  | { action: 'delete_all_targets'; payload: DeleteAllTargetsPayload };
