import type { SqliVulnerability, SqliExtractedDatabase } from '../types';

export interface SqliExportData {
  vulnerabilities: SqliVulnerability[];
  databases: SqliExtractedDatabase[];
  url: string;
  timestamp: number;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportAsJson(data: SqliExportData): void {
  downloadFile(JSON.stringify(data, null, 2), `sqli-scan-${Date.now()}.json`, 'application/json');
}

export function exportAsCsv(vulnerabilities: SqliVulnerability[]): void {
  const rows = [
    ['Parameter', 'Location', 'Technique', 'DBMS', 'Severity', 'PoC'],
    ...vulnerabilities.map(v => [v.param_name, v.param_location, v.technique, v.dbms, v.severity, v.poc_request]),
  ];
  const csv = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadFile(csv, `sqli-scan-${Date.now()}.csv`, 'text/csv');
}
