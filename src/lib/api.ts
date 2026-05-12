export interface Target {
  id: string;
  name: string;
  description: string;
  scope: string[];
  createdAt: string;
  updatedAt: string;
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

export async function getTargets(): Promise<Target[]> {
  return [];
}

export async function createTarget(name: string, scope: string[]): Promise<Target> {
  return { id: '1', name, description: '', scope, createdAt: '', updatedAt: '' };
}

export async function deleteTarget(id: string): Promise<boolean> {
  return true;
}