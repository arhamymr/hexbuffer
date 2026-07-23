export interface RepeaterRequest {
  raw: string;
  url: string;
}

export interface ParsedRepeaterRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface RepeaterResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
  final_url: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT';

// ── Workspace Tab ──

export interface WorkspaceTab {
  id: string;
  name: string;
}

export function createWorkspaceTab(name?: string, counter?: number, id?: string): WorkspaceTab {
  const num = counter ?? 1;
  return {
    id: id || `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name || `Workspace ${num}`,
  };
}
