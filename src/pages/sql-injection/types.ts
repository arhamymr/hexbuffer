export type SqliParamLocation = 'url' | 'body' | 'header';
export type SqliRiskLevel = 'low' | 'medium' | 'high';
export type SqliTechnique = 'boolean_blind' | 'time_based' | 'union' | 'error_based';
export type SqliSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SqliParam {
  name: string;
  value: string;
  location: SqliParamLocation;
  inject: boolean;
}

export interface SqliVulnerability {
  id: string;
  param_name: string;
  param_location: string;
  technique: string;
  dbms: string;
  severity: SqliSeverity;
  poc_request: string;
  fingerprint: string;
}

export interface SqliExtractedColumn {
  name: string;
  data_type: string;
}

export interface SqliExtractedTable {
  name: string;
  columns: SqliExtractedColumn[];
  rows: string[][];
}

export interface SqliExtractedDatabase {
  name: string;
  tables: SqliExtractedTable[];
}

export interface SqliScanResult {
  scan_id: string;
  url: string;
  vulnerabilities: SqliVulnerability[];
  databases: SqliExtractedDatabase[];
  start_time: number;
  end_time?: number;
}

export type SqliProgressEvent =
  | { type: 'Update'; current: number; total: number; phase: string; message: string }
  | { type: 'VulnerabilityFound'; vulnerability: SqliVulnerability }
  | { type: 'DataExtracted'; database: string; table: string; row_count: number }
  | { type: 'Complete'; result: SqliScanResult }
  | { type: 'Error'; message: string }
  | { type: 'Cancelled' };
