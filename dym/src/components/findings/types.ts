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

export interface HttpRequestData {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface HttpResponseData {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
}

export function createNewFinding(targetId: string, requestData?: HttpRequestData, responseData?: HttpResponseData): Finding {
  const now = Date.now();
  return {
    id: `finding_${now}_${Math.random().toString(36).substr(2, 9)}`,
    target_id: targetId,
    title: '',
    description: '',
    severity: 'medium',
    steps_to_reproduce: '',
    impact: '',
    remediation: '',
    request_data: requestData ? JSON.stringify(requestData) : null,
    response_data: responseData ? JSON.stringify(responseData) : null,
    status: 'open',
    created_at: now,
    updated_at: now,
  };
}

export const SEVERITY_COLORS: Record<Severity, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-600', text: 'text-white' },
  high: { bg: 'bg-orange-600', text: 'text-white' },
  medium: { bg: 'bg-yellow-600', text: 'text-white' },
  low: { bg: 'bg-green-600', text: 'text-white' },
  info: { bg: 'bg-gray-500', text: 'text-white' },
};

export const STATUS_COLORS: Record<FindingStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-blue-500', text: 'text-white' },
  in_progress: { bg: 'bg-yellow-500', text: 'text-white' },
  verified: { bg: 'bg-green-500', text: 'text-white' },
  fixed: { bg: 'bg-purple-500', text: 'text-white' },
  false_positive: { bg: 'bg-gray-500', text: 'text-white' },
};

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
}