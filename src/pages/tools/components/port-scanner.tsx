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
      <div className="flex flex-col border-b bg-muted/40 shrink-0">
        {/* Controls row 1 */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/10">
          <Input
            className="h-7 text-xs bg-background max-w-[280px]"
            placeholder="Target host or CIDR (e.g. example.com)"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-7 text-xs w-[110px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="quick" className="text-xs">Quick</SelectItem>
              <SelectItem value="web" className="text-xs">Web</SelectItem>
              <SelectItem value="top100" className="text-xs">Top 100</SelectItem>
              <SelectItem value="full" className="text-xs">Full</SelectItem>
              <SelectItem value="custom" className="text-xs">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[360px] text-xs">
              {selectedPortLabel}
            </TooltipContent>
          </Tooltip>

          {preset === 'custom' && (
            <Input
              className="h-7 text-xs bg-background flex-1 max-w-[200px]"
              value={ports}
              onChange={(event) => setPorts(event.target.value)}
              placeholder="1-100 or 80,443"
            />
          )}

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Timeout</Label>
              <Input
                className="h-7 w-14 bg-background text-right text-xs px-1.5 focus-visible:ring-1"
                value={timeoutMs}
                onChange={(event) => setTimeoutMs(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Concurrency</Label>
              <Input
                className="h-7 w-14 bg-background text-right text-xs px-1.5 focus-visible:ring-1"
                value={concurrency}
                onChange={(event) => setConcurrency(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 rounded border bg-background h-7 px-2">
              <Checkbox
                id="banner-grab"
                checked={bannerGrab}
                onCheckedChange={(checked) => setBannerGrab(checked === true)}
              />
              <Label htmlFor="banner-grab" className="text-[10px] uppercase font-semibold text-muted-foreground cursor-pointer select-none">
                Banner
              </Label>
            </div>
          </div>
        </div>

        {/* Controls row 2 */}
        <div className="flex h-9 items-center justify-between px-3 gap-2 bg-muted/5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal text-[10px] py-0 h-5">
              SYN scan requires privileged helper
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={copyOpenPorts} disabled={!hasResults} className="h-6 text-[11px] gap-1 px-2">
              <Copy className="h-3.5 w-3.5" />
              Copy Ports
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportResults('json')} disabled={!hasResults} className="h-6 text-[11px] gap-1 px-2">
              <Download className="h-3.5 w-3.5" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportResults('csv')} disabled={!hasResults} className="h-6 text-[11px] gap-1 px-2">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="ghost" size="icon" onClick={clearResults} disabled={results.length === 0 && !error} className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border mx-0.5" />
            {isRunning ? (
              <Button variant="destructive" size="sm" onClick={stopScan} className="h-6 text-[11px] gap-1 px-2.5">
                <Square className="h-3 w-3 fill-current" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={startScan} disabled={!target.trim() || parsedPorts.length === 0} className="h-6 text-[11px] gap-1 px-2.5">
                <Play className="h-3 w-3 fill-current" />
                Start
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="min-h-0 flex-1 flex flex-col bg-background">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Open Ports</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">Host, service, latency & captured banners</span>
          </div>
          <div className="flex items-center gap-2">
            {error && <span className="max-w-[320px] truncate text-[10px] text-destructive font-mono">{error}</span>}
            {isRunning && (
              <Badge variant="secondary" className="animate-pulse text-[9px] h-4 py-0 px-1.5 font-mono">
                {progress.current} / {progress.total}
              </Badge>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {!hasResults ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Radar className="h-8 w-8 text-muted-foreground/60 animate-pulse" />
              <p className="text-xs">No open ports found</p>
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 py-0">Host</TableHead>
                  <TableHead className="h-8 py-0">Port</TableHead>
                  <TableHead className="h-8 py-0">State</TableHead>
                  <TableHead className="h-8 py-0">Service</TableHead>
                  <TableHead className="h-8 py-0">Time</TableHead>
                  <TableHead className="h-8 py-0">Banner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openResults.map((result) => (
                  <TableRow key={`${result.host}:${result.port}`} className="hover:bg-muted/30">
                    <TableCell className="font-mono py-1">{result.host}</TableCell>
                    <TableCell className="font-mono py-1">{result.port}</TableCell>
                    <TableCell className="py-1">
                      <Badge variant="outline" className="text-[9px] py-px h-4 font-normal border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                        {result.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1">{result.service}</TableCell>
                    <TableCell className="text-muted-foreground py-1">
                      {result.response_time_ms ? `${result.response_time_ms}ms` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[460px] truncate font-mono text-[11px] py-1" title={result.banner ?? ''}>
                      {result.banner || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
