import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface Target {
  id: string;
  name: string;
  description: string;
  scope: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProxyStatus {
  running: boolean;
  port: number | null;
  connections: number;
}

export interface ApiCall {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  host: string;
  path: string;
  headers: Record<string, string>;
  requestBody?: string;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  duration: number;
  sessionId: string;
  targetId: string;
}

export async function startProxy(port: number = 8888): Promise<string> {
  return invoke('start_proxy', { port });
}

export async function stopProxy(): Promise<string> {
  return invoke('stop_proxy');
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  return invoke('get_proxy_status');
}

export async function getTargets(): Promise<Target[]> {
  return invoke('get_targets');
}

export async function createTarget(name: string, scope: string[]): Promise<Target> {
  return invoke('create_target', { name, scope });
}

export async function deleteTarget(id: string): Promise<boolean> {
  return invoke('delete_target', { id });
}

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  follow_redirects: boolean;
  max_hops: number;
}

export interface HttpResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
  final_url: string;
}

export interface AttackConfig {
  name: string;
  mode: 'Sniper' | 'BatteringRam';
  base_request: HttpRequest;
  positions: PayloadPosition[];
  payload_config: PayloadConfig;
  concurrency: number;
  delay_ms: number;
  delay_max_ms?: number;
  retries: number;
}

export interface PayloadPosition {
  name: string;
  start: number;
  end: number;
}

export interface PayloadConfig {
  payload_type: 'SimpleList' | 'RuntimeFile' | 'NumberRange';
  values: string[];
  file_path?: string;
  number_start?: number;
  number_end?: number;
  number_step?: number;
  number_format?: string;
}

export interface AttackResult {
  id: string;
  payload: string;
  status?: number;
  response_length?: number;
  response_time_ms?: number;
  error?: string;
  comment?: string;
}

export async function sendHttpRequest(request: HttpRequest): Promise<HttpResponse> {
  return invoke('send_http_request', { request });
}

export async function startIntruderAttack(config: AttackConfig): Promise<string> {
  return invoke('start_intruder_attack', { config });
}

export async function stopIntruderAttack(attackId: string): Promise<void> {
  return invoke('stop_intruder_attack', { attackId });
}

export async function getIntruderAttackStatus(attackId: string): Promise<boolean> {
  return invoke('get_intruder_attack_status', { attackId });
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingStatus = 'open' | 'in_progress' | 'verified' | 'fixed' | 'false_positive';

export interface Finding {
  id: string;
  target_id: string;
  title: string;
  description: string;
  severity: Severity;
  steps_to_reproduce: string;
  impact: string;
  remediation: string;
  request_data: string | null;
  response_data: string | null;
  status: FindingStatus;
  created_at: number;
  updated_at: number;
}

export async function getFindings(targetId?: string): Promise<Finding[]> {
  return invoke('get_findings', { targetId: targetId || null });
}

export async function createFinding(finding: Finding): Promise<Finding> {
  return invoke('create_finding', { finding });
}

export async function updateFinding(finding: Finding): Promise<Finding> {
  return invoke('update_finding', { finding });
}

export async function deleteFinding(id: string): Promise<boolean> {
  return invoke('delete_finding', { id });
}

export { listen };