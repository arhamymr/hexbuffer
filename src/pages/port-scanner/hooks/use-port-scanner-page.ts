import { useState, useMemo, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { PortScanResult } from '../types';
import { PORT_PRESETS } from '../constants';
import type { PortPreset } from '../constants';
import { parsePorts, sortScanResults, describePortPreset } from '../lib/port-helpers';
import { exportAsJson, exportAsCsv } from '../lib/export-helpers';

type ProgressEvent =
  | { type: 'Update'; current: number; total: number }
  | { type: 'Complete' }
  | { type: 'Cancelled' };

export function usePortScannerPage() {
  // ── Config state ────────────────────────────
  const [target, setTarget] = useState('');
  const [preset, setPreset] = useState<PortPreset>('quick');
  const [ports, setPorts] = useState(PORT_PRESETS.quick);
  const [timeoutMs, setTimeoutMs] = useState('800');
  const [concurrency, setConcurrency] = useState('100');
  const [bannerGrab, setBannerGrab] = useState(true);

  // ── Scan state ──────────────────────────────
  const [results, setResults] = useState<PortScanResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const scanIdRef = useRef<string | null>(null);

  // ── Derived ──────────────────────────────────
  const parsedPorts = useMemo(() => parsePorts(ports), [ports]);
  const openResults = useMemo(() => results.filter((r) => r.state === 'open'), [results]);
  const selectedPortLabel = preset === 'custom' ? ports || 'Custom ports' : describePortPreset(preset);
  const hasResults = openResults.length > 0;
  const canScan = !!target.trim() && parsedPorts.length > 0;

  // ── Preset ───────────────────────────────────
  const handlePresetChange = useCallback((value: string) => {
    const nextPreset = value as PortPreset;
    setPreset(nextPreset);
    if (nextPreset !== 'custom') {
      setPorts(PORT_PRESETS[nextPreset]);
    }
  }, []);

  // ── Scan ─────────────────────────────────────
  const startScan = useCallback(async () => {
    if (!canScan) return;

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
      setResults(finalResults.filter((r) => r.state === 'open').sort(sortScanResults));
      setProgress((c) => ({ current: c.total || finalResults.length, total: c.total || finalResults.length }));
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError));
    } finally {
      setIsRunning(false);
      unlisteners.forEach((u) => u());
      scanIdRef.current = null;
    }
  }, [canScan, target, parsedPorts, timeoutMs, concurrency, bannerGrab]);

  const stopScan = useCallback(async () => {
    if (!scanIdRef.current) return;
    await invoke('stop_port_scan', { scanId: scanIdRef.current });
    setIsRunning(false);
  }, []);

  // ── Actions ──────────────────────────────────
  const clearResults = useCallback(() => {
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setError('');
  }, []);

  const copyOpenPorts = useCallback(async () => {
    await navigator.clipboard.writeText(
      openResults.map((r) => `${r.host}:${r.port}`).join('\n'),
    );
  }, [openResults]);

  const handleExportJson = useCallback(() => {
    exportAsJson(openResults);
  }, [openResults]);

  const handleExportCsv = useCallback(() => {
    exportAsCsv(openResults);
  }, [openResults]);

  return {
    // Config
    target,
    setTarget,
    preset,
    ports,
    setPorts,
    timeoutMs,
    setTimeoutMs,
    concurrency,
    setConcurrency,
    bannerGrab,
    setBannerGrab,
    // Scan
    results,
    progress,
    isRunning,
    error,
    // Derived
    parsedPorts,
    openResults,
    selectedPortLabel,
    hasResults,
    canScan,
    // Handlers
    handlePresetChange,
    startScan,
    stopScan,
    clearResults,
    copyOpenPorts,
    handleExportJson,
    handleExportCsv,
  };
}
