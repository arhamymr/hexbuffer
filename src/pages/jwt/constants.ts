import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { JwtAlgorithm, JwtVulnerabilitySeverity } from './types';

// ── Severity styling ──────────────────────────────────────

export const SEVERITY_CONFIG: Record<
  JwtVulnerabilitySeverity,
  { color: string; icon: React.ElementType }
> = {
  critical: { color: 'text-red-500 border-red-500/20 bg-red-500/5', icon: ShieldAlert },
  high: { color: 'text-orange-500 border-orange-500/20 bg-orange-500/5', icon: Shield },
  medium: { color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5', icon: AlertTriangle },
  low: { color: 'text-blue-500 border-blue-500/20 bg-blue-500/5', icon: Info },
  info: { color: 'text-muted-foreground border-border bg-muted/50', icon: Info },
};

// ── Algorithm options ─────────────────────────────────────

export const ALGORITHM_OPTIONS: { value: JwtAlgorithm; label: string }[] = [
  { value: 'HS256', label: 'HS256' },
  { value: 'HS384', label: 'HS384' },
  { value: 'HS512', label: 'HS512' },
];

// ── Defaults ──────────────────────────────────────────────

export const DEFAULT_HEADER = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2);
export const DEFAULT_PAYLOAD = JSON.stringify(
  { sub: '1234567890', name: 'John Doe', iat: 1516239022 },
  null,
  2,
);
