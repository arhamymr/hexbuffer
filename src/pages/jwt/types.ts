export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';

export type JwtMode = 'decode' | 'generate';

export type JwtVulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface JwtDecoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  algorithm: string;
  parts: [string, string, string];
}

export interface JwtVulnerability {
  id: string;
  severity: JwtVulnerabilitySeverity;
  title: string;
  description: string;
}
