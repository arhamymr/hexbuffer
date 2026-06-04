'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Download, Info, Play, Radar, Square, Trash2 } from 'lucide-react';
import type { PortScanResult } from '../types';

const PORT_PRESETS = {
  quick: '21,22,25,53,80,110,143,443,445,587,993,995,3306,3389,5432,6379,8080,8443',
  web: '80,443,8000,8080,8081,8443,8888,9000,9443',
  top100: '7,9,13,21,22,23,25,26,37,53,79,80,81,88,106,110,111,113,119,135,139,143,144,179,199,389,427,443,445,465,513,514,515,543,544,548,554,587,631,646,873,990,993,995,1025,1026,1027,1028,1029,1110,1433,1720,1723,1755,1900,2000,2001,2049,2121,2717,3000,3128,3306,3389,3986,4899,5000,5009,5051,5060,5101,5190,5357,5432,5631,5666,5800,5900,6000,6001,6646,7070,8000,8008,8009,8080,8081,8443,8888,9100,9999,10000,32768,49152,49153,49154,49155,49156,49157',
  full: '1-65535',
};

type PortPreset = keyof typeof PORT_PRESETS | 'custom';
type ProgressEvent =
  | { type: 'Update'; current: number; total: number }
  | { type: 'Complete' }
  | { type: 'Cancelled' };

export function PortScannerTool() {
  const [target, setTarget] = React.useState('');
  const [preset, setPreset] = React.useState<PortPreset>('quick');
  const [ports, setPorts] = React.useState(PORT_PRESETS.quick);
  const [timeoutMs, setTimeoutMs] = React.useState('800');
  const [concurrency, setConcurrency] = React.useState('100');
  const [bannerGrab, setBannerGrab] = React.useState(true);
  const [results, setResults] = React.useState<PortScanResult[]>([]);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });
  const [isRunning, setIsRunning] = React.useState(false);
  const [error, setError] = React.useState('');
  const scanIdRef = React.useRef<string | null>(null);

  const parsedPorts = React.useMemo(() => parsePorts(ports), [ports]);
  const openResults = React.useMemo(() => results.filter((result) => result.state === 'open'), [results]);
  const selectedPortLabel = preset === 'custom' ? ports || 'Custom ports' : describePortPreset(preset);
  const hasResults = openResults.length > 0;

  const handlePresetChange = (value: string) => {
    const nextPreset = value as PortPreset;
    setPreset(nextPreset);
    if (nextPreset !== 'custom') {
      setPorts(PORT_PRESETS[nextPreset]);
    }
  };

  const startScan = async () => {
    if (!target.trim() || parsedPorts.length === 0) return;

    const scanId = crypto.randomUUID();
    scanIdRef.current = scanId;
    setResults([]);
    setProgress({ current: 0, total: parsedPorts.length });
    setError('');
    setIsRunning(true);

    const unlisteners: UnlistenFn[] = [];
    try {
      unlisteners.push(
        await listen<PortScanResult>(`port-scan-result-${scanId}`, (event) => {
          if (event.payload.state !== 'open') return;
          setResults((current) => [...current, event.payload].sort(sortScanResults));
        }),
      );
      unlisteners.push(
        await listen<ProgressEvent>(`port-scan-progress-${scanId}`, (event) => {
          if (event.payload.type === 'Update') {
            setProgress({ current: event.payload.current, total: event.payload.total });
          }
          if (event.payload.type === 'Complete' || event.payload.type === 'Cancelled') {
            setIsRunning(false);
          }
        }),
      );

      const finalResults = await invoke<PortScanResult[]>('scan_ports', {
        request: {
          scan_id: scanId,
          target: target.trim(),
          ports: parsedPorts,
          timeout_ms: Number(timeoutMs) || 800,
          concurrency: Number(concurrency) || 100,
          banner_grab: bannerGrab,
          scan_type: 'connect',
        },
      });
      setResults(finalResults.filter((result) => result.state === 'open').sort(sortScanResults));
      setProgress((current) => ({ current: current.total || finalResults.length, total: current.total || finalResults.length }));
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError));
    } finally {
      setIsRunning(false);
      unlisteners.forEach((unlisten) => unlisten());
      scanIdRef.current = null;
    }
  };

  const stopScan = async () => {
    if (!scanIdRef.current) return;
    await invoke('stop_port_scan', { scanId: scanIdRef.current });
    setIsRunning(false);
  };

  const clearResults = () => {
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setError('');
  };

  const copyOpenPorts = async () => {
    await navigator.clipboard.writeText(openResults.map((result) => `${result.host}:${result.port}`).join('\n'));
  };

  const exportResults = (format: 'json' | 'csv') => {
    if (format === 'json') {
      downloadFile(JSON.stringify(openResults, null, 2), `port-scan-open-${Date.now()}.json`, 'application/json');
      return;
    }

    const headers = ['Host', 'Port', 'State', 'Service', 'Response Time', 'Banner'];
    const rows = openResults.map((result) => [
      result.host,
      String(result.port),
      result.state,
      result.service,
      result.response_time_ms ? `${result.response_time_ms}ms` : '',
      result.banner ?? '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    downloadFile(csv, `port-scan-${Date.now()}.csv`, 'text/csv');
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="bg-muted px-3 py-3">
        <div className="flex flex-col gap-3">
          <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(260px,1fr)_160px_auto]">
            <Input
              className="bg-background"
              placeholder="Target host or CIDR (example.com, 192.168.1.0/24)"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
            <div className="flex items-center gap-2">
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="top100">Top 100</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="shrink-0">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[360px]">
                  {selectedPortLabel}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Timeout</Label>
                <Input
                  className="h-8 w-20 bg-background text-right"
                  value={timeoutMs}
                  onChange={(event) => setTimeoutMs(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Concurrency</Label>
                <Input
                  className="h-8 w-20 bg-background text-right"
                  value={concurrency}
                  onChange={(event) => setConcurrency(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
                <Checkbox
                  id="banner-grab"
                  checked={bannerGrab}
                  onCheckedChange={(checked) => setBannerGrab(checked === true)}
                />
                <Label htmlFor="banner-grab" className="text-xs text-muted-foreground">
                  Banner
                </Label>
              </div>
            </div>

            {preset === 'custom' && (
              <Input
                className="bg-background lg:col-span-3"
                value={ports}
                onChange={(event) => setPorts(event.target.value)}
                placeholder="1-100 or 80,443,244"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              SYN scan requires privileged helper
            </Badge>
            <div className="flex-1" />
            <Button variant="outline" onClick={copyOpenPorts} disabled={!hasResults}>
              <Copy className="h-3.5 w-3.5" />
              Open
            </Button>
            <Button variant="outline" onClick={() => exportResults('json')} disabled={!hasResults}>
              <Download className="h-3.5 w-3.5" />
              JSON
            </Button>
            <Button variant="outline" onClick={() => exportResults('csv')} disabled={!hasResults}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={clearResults} disabled={results.length === 0 && !error}>
              <Trash2 className="h-4 w-4" />
            </Button>
            {isRunning ? (
              <Button variant="destructive" onClick={stopScan}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button onClick={startScan} disabled={!target.trim() || parsedPorts.length === 0}>
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 border-t">
        <section className="flex h-full min-h-0 flex-col bg-background">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
            <div>
              <div className="text-sm font-medium">Open Ports</div>
              <div className="text-xs text-muted-foreground">Host, service, latency, and captured banners.</div>
            </div>
            <div className="flex items-center gap-2">
              {error && <span className="max-w-[420px] truncate text-xs text-destructive">{error}</span>}
              {isRunning && (
                <Badge variant="secondary" className="animate-pulse">
                  {progress.current} / {progress.total}
                </Badge>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {!hasResults ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Radar className="h-8 w-8" />
                <p className="text-sm">No open ports found</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>Host</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Banner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openResults.map((result) => (
                    <TableRow key={`${result.host}:${result.port}`}>
                      <TableCell className="font-mono">{result.host}</TableCell>
                      <TableCell className="font-mono">{result.port}</TableCell>
                      <TableCell>
                        <Badge variant={result.state === 'open' ? 'default' : 'secondary'}>{result.state}</Badge>
                      </TableCell>
                      <TableCell>{result.service}</TableCell>
                      <TableCell className="text-muted-foreground">{result.response_time_ms ? `${result.response_time_ms}ms` : '-'}</TableCell>
                      <TableCell className="max-w-[460px] truncate font-mono text-xs" title={result.banner ?? ''}>
                        {result.banner || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function parsePorts(value: string) {
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

function sortScanResults(a: PortScanResult, b: PortScanResult) {
  return a.host.localeCompare(b.host) || a.port - b.port;
}

function describePortPreset(preset: keyof typeof PORT_PRESETS) {
  if (preset === 'quick') {
    return `Quick ports: ${PORT_PRESETS.quick}`;
  }
  if (preset === 'web') {
    return `Web ports: ${PORT_PRESETS.web}`;
  }
  if (preset === 'top100') {
    return `Top 100 common ports: ${PORT_PRESETS.top100}`;
  }
  return 'Full scan: 1-65535';
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
