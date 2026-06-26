import type { PortScanResult } from '../types';

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportAsJson(results: PortScanResult[]): void {
  downloadFile(JSON.stringify(results, null, 2), `port-scan-open-${Date.now()}.json`, 'application/json');
}

export function exportAsCsv(results: PortScanResult[]): void {
  const headers = ['Host', 'Port', 'State', 'Service', 'Response Time', 'Banner'];
  const rows = results.map((result) => [
    result.host,
    String(result.port),
    result.state,
    result.service,
    result.response_time_ms ? `${result.response_time_ms}ms` : '',
    result.banner ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  downloadFile(csv, `port-scan-${Date.now()}.csv`, 'text/csv');
}
