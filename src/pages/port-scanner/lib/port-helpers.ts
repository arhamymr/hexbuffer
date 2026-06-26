import type { PortScanResult } from '../types';
import { PORT_PRESETS } from '../constants';
import type { PortPreset } from '../constants';

export function parsePorts(value: string): number[] {
  const ports = new Set<number>();
  value.split(',').forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map((item) => Number(item.trim()));
      if (!Number.isInteger(start) || !Number.isInteger(end)) return;
      for (let port = Math.max(1, start); port <= Math.min(65535, end); port += 1) {
        ports.add(port);
      }
      return;
    }
    const port = Number(trimmed);
    if (Number.isInteger(port) && port >= 1 && port <= 65535) {
      ports.add(port);
    }
  });
  return Array.from(ports).sort((a, b) => a - b);
}

export function sortScanResults(a: PortScanResult, b: PortScanResult): number {
  return a.host.localeCompare(b.host) || a.port - b.port;
}

export function describePortPreset(preset: PortPreset): string {
  if (preset === 'quick') return `Quick ports: ${PORT_PRESETS.quick}`;
  if (preset === 'web') return `Web ports: ${PORT_PRESETS.web}`;
  if (preset === 'top100') return `Top 100 common ports: ${PORT_PRESETS.top100}`;
  return 'Full scan: 1-65535';
}
