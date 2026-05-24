export type PayloadMode = 'manual' | 'import' | 'predefined';
export type AttackType = 'sniper';

export interface AttackSettings {
  throttle: number;
  timeout: number;
  followRedirects: boolean;
}

export interface TestResult {
  id: string;
  index: number;
  payload: string;
  requestUrl: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  latency: number;
  length: number;
  lengthDelta: number;
  success: boolean;
  isAnomaly: boolean;
  findings: string[];
  error?: string;
}

export interface ToolConfig {
  title: string;
  description: string;
  payloadLabel: string;
  predefinedPayloads: readonly string[];
  importedPayloads: readonly string[];
  responseKeywords: string[];
  defaultRequest: string;
}

export interface PromptInjectionRouteState {
  promptInjectionRequest?: {
    raw: string;
    endpoint: string;
  };
}
