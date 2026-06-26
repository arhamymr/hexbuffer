import type { InspectorConsoleLog } from '../types';

export function exportConsoleLogs(
  logs: InspectorConsoleLog[],
  format: 'json' | 'csv'
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `console-export-${timestamp}.${format}`;

  let content: string;
  let mime: string;

  if (format === 'json') {
    content = JSON.stringify(logs, null, 2);
    mime = 'application/json';
  } else {
    const header = 'Time,Level,URL,Message';
    const rows = logs.map((log) => {
      const time = new Date(log.timestamp).toISOString();
      const escapedMsg = log.text.replace(/"/g, '""');
      const escapedUrl = log.url.replace(/"/g, '""');
      return `"${time}","${log.level}","${escapedUrl}","${escapedMsg}"`;
    });
    content = [header, ...rows].join('\n');
    mime = 'text/csv';
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
