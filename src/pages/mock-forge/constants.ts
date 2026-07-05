import type { MockForgeSubTab } from './types';

export const MOCK_FORGE_SUB_TABS: { id: MockForgeSubTab; label: string }[] = [
  { id: 'domains', label: 'Domains' },
  { id: 'routes', label: 'Routes' },
  { id: 'logs', label: 'Request Logs' },
];

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] as const;
export const DEFAULT_RESPONSE_BODY = `{
  "message": "Hello from MockForge",
  "id": ":id"
}`;
