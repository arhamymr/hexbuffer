import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  SqliParam,
  SqliRiskLevel,
  SqliTechnique,
  SqliVulnerability,
  SqliExtractedDatabase,
  SqliScanResult,
  SqliProgressEvent,
} from '../types';
import { exportAsJson, exportAsCsv } from '../lib/export-helpers';

export interface ProgressState {
  current: number;
  total: number;
  phase: string;
  message: string;
}

export function useSqliPage() {
  // ── Configuration state ──────────────────────
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [headers, setHeaders] = useState<Array<[string, string]>>([
    ['Content-TextT', 'application/x-www-form-urlencoded'],
  ]);
  const [parameters, setParameters] = useState<SqliParam[]>([]);
  const [newParamName, setNewParamName] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [riskLevel, setRiskLevel] = useState<SqliRiskLevel>('medium');
  const [techniques, setTechniques] = useState<Set<SqliTechnique>>(
    new Set(['boolean_blind', 'time_based']),
  );

  // ── Scan state ───────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total: 0,
    phase: '',
    message: '',
  });
  const [vulnerabilities, setVulnerabilities] = useState<SqliVulnerability[]>([]);
  const [databases, setDatabases] = useState<SqliExtractedDatabase[]>([]);
  const [selectedVuln, setSelectedVuln] = useState<string | null>(null);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [scanIdRef, setScanIdRef] = useState<string | null>(null);

  // ── Derived ───────────────────────────────────
  const injectCount = parameters.filter(p => p.inject).length;
  const selectedVulnData = vulnerabilities.find(v => v.id === selectedVuln) ?? null;
  const selectedDbData = databases.find(d => d.name === selectedDb) ?? null;
  const tableData = selectedDbData?.tables.find(t => t.name === selectedTable) ?? null;

  // ── Parameter management ─────────────────────
  const addParameter = useCallback(() => {
    if (!newParamName.trim()) return;
    setParameters(prev => [
      ...prev,
      {
        name: newParamName,
        value: newParamValue,
        location: method === 'GET' ? 'url' : 'body',
        inject: true,
      },
    ]);
    setNewParamName('');
    setNewParamValue('');
  }, [newParamName, newParamValue, method]);

  const removeParameter = useCallback((name: string) => {
    setParameters(prev => prev.filter(p => p.name !== name));
  }, []);

  const toggleParamInject = useCallback((name: string) => {
    setParameters(prev =>
      prev.map(p => (p.name === name ? { ...p, inject: !p.inject } : p)),
    );
  }, []);

  const toggleTechnique = useCallback((tech: SqliTechnique) => {
    setTechniques(prev => {
      const next = new Set(prev);
      if (next.has(tech)) {
        next.delete(tech);
      } else {
        next.add(tech);
      }
      return next;
    });
  }, []);

  // ── Scan ──────────────────────────────────────
  const startScan = useCallback(async () => {
    if (!url.trim() || parameters.length === 0) return;

    const scanId = crypto.randomUUID();
    setScanIdRef(scanId);
    setVulnerabilities([]);
    setDatabases([]);
    setProgress({
      current: 0,
      total: parameters.filter(p => p.inject).length,
      phase: 'Initializing',
      message: 'Starting scan',
    });
    setError('');
    setIsRunning(true);

    const unlisteners: UnlistenFn[] = [];
    try {
      unlisteners.push(
        await listen<SqliProgressEvent>(`sqli-progress-${scanId}`, event => {
          const payload = event.payload;
          if (payload.type === 'Update') {
            setProgress({
              current: payload.current,
              total: payload.total,
              phase: payload.phase,
              message: payload.message,
            });
          } else if (payload.type === 'VulnerabilityFound') {
            setVulnerabilities(prev => [...prev, payload.vulnerability]);
          } else if (payload.type === 'DataExtracted') {
            // handled by final result
          } else if (payload.type === 'Complete') {
            setIsRunning(false);
          } else if (payload.type === 'Error') {
            setError(payload.message);
            setIsRunning(false);
          } else if (payload.type === 'Cancelled') {
            setIsRunning(false);
          }
        }),
      );

      const result = await invoke<SqliScanResult>('start_sqli_scan', {
        config: {
          scan_id: scanId,
          url: url.trim(),
          method: method.toUpperCase(),
          headers,
          params: parameters.map(p => ({
            name: p.name,
            value: p.value,
            location: p.location,
            inject: p.inject,
          })),
          risk_level: riskLevel,
          techniques: Array.from(techniques),
          concurrency: 5,
          delay_ms: 0,
        },
      });

      setVulnerabilities(result.vulnerabilities);
      setDatabases(result.databases);
      if (result.vulnerabilities.length > 0) {
        setSelectedVuln(result.vulnerabilities[0].id);
      }
      if (result.databases.length > 0) {
        setSelectedDb(result.databases[0].name);
      }
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError));
    } finally {
      setIsRunning(false);
      unlisteners.forEach(u => u());
      setScanIdRef(null);
    }
  }, [url, method, headers, parameters, riskLevel, techniques]);

  const stopScan = useCallback(async () => {
    if (!scanIdRef) return;
    await invoke('stop_sqli_scan', { scanId: scanIdRef });
    setIsRunning(false);
  }, [scanIdRef]);

  // ── Clear ─────────────────────────────────────
  const clearResults = useCallback(() => {
    setVulnerabilities([]);
    setDatabases([]);
    setSelectedVuln(null);
    setSelectedDb(null);
    setSelectedTable(null);
    setProgress({ current: 0, total: 0, phase: '', message: '' });
    setError('');
  }, []);

  // ── Export ────────────────────────────────────
  const handleExportJson = useCallback(() => {
    exportAsJson({ vulnerabilities, databases, url, timestamp: Date.now() });
  }, [vulnerabilities, databases, url]);

  const handleExportCsv = useCallback(() => {
    exportAsCsv(vulnerabilities);
  }, [vulnerabilities]);

  return {
    // Config
    url,
    setUrl,
    method,
    setMethod,
    headers,
    setHeaders,
    parameters,
    setParameters,
    newParamName,
    setNewParamName,
    newParamValue,
    setNewParamValue,
    riskLevel,
    setRiskLevel,
    techniques,
    toggleTechnique,
    // Scan state
    isRunning,
    progress,
    vulnerabilities,
    databases,
    selectedVuln,
    setSelectedVuln,
    selectedDb,
    setSelectedDb,
    selectedTable,
    setSelectedTable,
    error,
    // Derived
    injectCount,
    selectedVulnData,
    selectedDbData,
    tableData,
    // Parameter actions
    addParameter,
    removeParameter,
    toggleParamInject,
    // Scan actions
    startScan,
    stopScan,
    clearResults,
    // Export
    handleExportJson,
    handleExportCsv,
  };
}
