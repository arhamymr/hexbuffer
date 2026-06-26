export type PortScanState = 'open' | 'closed' | 'filtered' | 'cancelled';

export interface PortScanResult {
  host: string;
  port: number;
  state: PortScanState;
  service: string;
  banner?: string | null;
  response_time_ms?: number | null;
  error?: string | null;
}
