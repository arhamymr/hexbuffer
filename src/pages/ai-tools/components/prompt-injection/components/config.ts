import { buildRawHttpRequest } from '@/lib/http-message';
import {
  PROMPT_INJECTION_IMPORTED_PAYLOADS,
  PROMPT_INJECTION_PREDEFINED_PAYLOADS,
} from '../../../lib/payloads';
import type { AttackSettings, ToolConfig } from './types';

export const DEFAULT_SETTINGS: AttackSettings = {
  throttle: 0,
  timeout: 30000,
  followRedirects: true,
};

const DEFAULT_REQUEST = buildRawHttpRequest({
  method: 'POST',
  url: 'http://localhost:3000/api/chat',
  headers: {
    Host: 'localhost:3000',
    'Content-Type': 'application/json',
  },
  body: '{"messages":[{"role":"user","content":"§test§"}]}',
});

export const TOOL_CONFIGS = {
  'prompt-injection': {
    title: 'Prompt Injection',
    description: 'Replay override-style payloads against a chat endpoint and flag unusual responses.',
    payloadLabel: 'Injection Payloads',
    predefinedPayloads: PROMPT_INJECTION_PREDEFINED_PAYLOADS,
    importedPayloads: PROMPT_INJECTION_IMPORTED_PAYLOADS,
    responseKeywords: ['admin mode', 'debug mode', 'system override', 'hidden system prompt', 'internal data'],
    defaultRequest: DEFAULT_REQUEST,
  },
} satisfies Record<string, ToolConfig>;
