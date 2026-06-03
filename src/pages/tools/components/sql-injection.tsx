'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { AlertTriangle, Database, Download,Play, Square, Table2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SqliProgressEvent, SqliScanResult, SqliVulnerability, SqliExtractedDatabase } from './types';

type RiskLevel = 'low' | 'medium' | 'high';
type InjectionTechnique = 'boolean_blind' | 'time_based' | 'union' | 'error_based';

interface Parameter {
  name: string;
  value: string;
  location: 'url' | 'body' | 'header';
  inject: boolean;
}

interface ProgressState {
  current: number;
  total: number;
  phase: string;
  message: string;
}

const TECHNIQUE_LABELS: Record<InjectionTechnique, string> = {
  boolean_blind: 'Boolean Blind',
  time_based: 'Time-Based',
  union: 'UNION-Based',
  error_based: 'Error-Based',
};

const SEVERITY_COLORS = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
};

export function SqlInjectionTool() {
  const [url, setUrl] = React.useState('');
  const [method, setMethod] = React.useState<'GET' | 'POST'>('GET');
  const [headers, setHeaders] = React.useState<Array<[string, string]>>([['Content-Type', 'application/x-www-form-urlencoded']]);
  const [parameters, setParameters] = React.useState<Parameter[]>([]);
  const [newParamName, setNewParamName] = React.useState('');
  const [newParamValue, setNewParamValue] = React.useState('');
  const [riskLevel, setRiskLevel] = React.useState<RiskLevel>('medium');
  const [techniques, setTechniques] = React.useState<Set<InjectionTechnique>>(new Set(['boolean_blind', 'time_based']));
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState<ProgressState>({ current: 0, total: 0, phase: '', message: '' });
  const [vulnerabilities, setVulnerabilities] = React.useState<SqliVulnerability[]>([]);
  const [databases, setDatabases] = React.useState<SqliExtractedDatabase[]>([]);
  const [selectedVuln, setSelectedVuln] = React.useState<string | null>(null);
  const [selectedDb, setSelectedDb] = React.useState<string | null>(null);
  const [selectedTable, setSelectedTable] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [scanIdRef, setScanIdRef] = React.useState<string | null>(null);

  const injectCount = parameters.filter(p => p.inject).length;

  const addParameter = () => {
    if (!newParamName.trim()) return;
    setParameters(prev => [...prev, { name: newParamName, value: newParamValue, location: method === 'GET' ? 'url' : 'body', inject: true }]);
    setNewParamName('');
    setNewParamValue('');
  };

  const removeParameter = (name: string) => {
    setParameters(prev => prev.filter(p => p.name !== name));
  };

  const toggleParamInject = (name: string) => {
    setParameters(prev => prev.map(p => p.name === name ? { ...p, inject: !p.inject } : p));
  };

  const toggleTechnique = (tech: InjectionTechnique) => {
    setTechniques(prev => {
      const next = new Set(prev);
      if (next.has(tech)) {
        next.delete(tech);
      } else {
        next.add(tech);
      }
      return next;
    });
  };

  const startScan = async () => {
    if (!url.trim() || parameters.length === 0) return;

    const scanId = crypto.randomUUID();
    setScanIdRef(scanId);
    setVulnerabilities([]);
    setDatabases([]);
    setProgress({ current: 0, total: parameters.filter(p => p.inject).length, phase: 'Initializing', message: 'Starting scan' });
    setError('');
    setIsRunning(true);

    const unlisteners: UnlistenFn[] = [];
    try {
      unlisteners.push(
        await listen<SqliProgressEvent>(`sqli-progress-${scanId}`, (event) => {
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
          headers: headers,
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
  };

  const stopScan = async () => {
    if (!scanIdRef) return;
    await invoke('stop_sqli_scan', { scanId: scanIdRef });
    setIsRunning(false);
  };

  const clearResults = () => {
    setVulnerabilities([]);
    setDatabases([]);
    setSelectedVuln(null);
    setSelectedDb(null);
    setSelectedTable(null);
    setProgress({ current: 0, total: 0, phase: '', message: '' });
    setError('');
  };

  const exportResults = (format: 'json' | 'csv') => {
    const data = { vulnerabilities, databases, url, timestamp: Date.now() };
    if (format === 'json') {
      downloadFile(JSON.stringify(data, null, 2), `sqli-scan-${Date.now()}.json`, 'application/json');
      return;
    }
    const rows = [
      ['Parameter', 'Location', 'Technique', 'DBMS', 'Severity', 'PoC'],
      ...vulnerabilities.map(v => [v.param_name, v.param_location, v.technique, v.dbms, v.severity, v.poc_request]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `sqli-scan-${Date.now()}.csv`, 'text/csv');
  };

  const selectedVulnData = vulnerabilities.find(v => v.id === selectedVuln);
  const selectedDbData = databases.find(d => d.name === selectedDb);
  const tableData = selectedDbData?.tables.find(t => t.name === selectedTable);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">SQL Injection Scanner</h3>
          <p className="text-xs text-muted-foreground">Detect and exploit SQL injection vulnerabilities with data extraction</p>
        </div>
        {isRunning && (
          <Badge variant="secondary" className="animate-pulse">
            {progress.phase}: {progress.current}/{progress.total}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="http://target.com/search?q="
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
            <Select value={method} onValueChange={v => setMethod(v as 'GET' | 'POST')}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md">
            <div className="bg-muted px-3 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">Parameters</span>
              <span className="text-xs text-muted-foreground">{injectCount} marked for injection</span>
            </div>
            <div className="p-2 space-y-2">
              {parameters.map(param => (
                <div key={param.name} className="flex items-center gap-2">
                  <Checkbox
                    checked={param.inject}
                    onCheckedChange={() => toggleParamInject(param.name)}
                  />
                  <span className="font-mono text-sm w-28 truncate">{param.name}</span>
                  <span className="text-xs text-muted-foreground w-16">{param.location}</span>
                  <Input
                    className="flex-1 h-7 text-xs"
                    value={param.value}
                    onChange={e => setParameters(prev => prev.map(p => p.name === param.name ? { ...p, value: e.target.value } : p))}
                    placeholder="value"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeParameter(param.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1 h-7 text-xs"
                  placeholder="parameter name"
                  value={newParamName}
                  onChange={e => setNewParamName(e.target.value)}
                />
                <Input
                  className="flex-1 h-7 text-xs"
                  placeholder="default value"
                  value={newParamValue}
                  onChange={e => setNewParamValue(e.target.value)}
                />
                <Button size="sm" onClick={addParameter}>Add</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="border rounded-md p-3 space-y-3">
            <Label className="text-xs">Risk Level</Label>
            <Select value={riskLevel} onValueChange={v => setRiskLevel(v as RiskLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (few tests)</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High (all tests)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md p-3 space-y-3">
            <Label className="text-xs">Techniques</Label>
            <div className="space-y-2">
              {(Object.keys(TECHNIQUE_LABELS) as InjectionTechnique[]).map(tech => (
                <div key={tech} className="flex items-center gap-2">
                  <Checkbox
                    checked={techniques.has(tech)}
                    onCheckedChange={() => toggleTechnique(tech)}
                  />
                  <span className="text-sm">{TECHNIQUE_LABELS[tech]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {isRunning ? (
              <Button variant="destructive" className="flex-1" onClick={stopScan}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button className="flex-1" onClick={startScan} disabled={!url.trim() || parameters.length === 0}>
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        </div>
      </div>

      {progress.total > 0 && (
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">{progress.message}</div>
        </div>
      )}

      <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
        <Tabs defaultValue="vulnerabilities" className="h-full flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="vulnerabilities">
              Vulnerabilities
              {vulnerabilities.length > 0 && <Badge className="ml-2">{vulnerabilities.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="extraction">
              Data Extraction
              {databases.length > 0 && <Badge className="ml-2">{databases.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vulnerabilities" className="flex-1 min-h-0 flex flex-col">
            {vulnerabilities.length === 0 && !isRunning ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-8 w-8" />
                <p className="text-sm">No vulnerabilities found. Configure target and start scan.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex">
                <ScrollArea className="flex-1 border-r">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Parameter</TableHead>
                        <TableHead className="w-20">Location</TableHead>
                        <TableHead className="w-28">Technique</TableHead>
                        <TableHead className="w-24">DBMS</TableHead>
                        <TableHead className="w-24">Severity</TableHead>
                        <TableHead>PoC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vulnerabilities.map(vuln => (
                        <TableRow
                          key={vuln.id}
                          className={selectedVuln === vuln.id ? 'bg-muted' : 'cursor-pointer'}
                          onClick={() => setSelectedVuln(vuln.id)}
                        >
                          <TableCell className="font-mono text-xs">{vuln.param_name}</TableCell>
                          <TableCell className="text-xs">{vuln.param_location}</TableCell>
                          <TableCell className="text-xs">{vuln.technique.replace('_', ' ')}</TableCell>
                          <TableCell className="text-xs">{vuln.dbms}</TableCell>
                          <TableCell>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${SEVERITY_COLORS[vuln.severity]}`}>
                              {vuln.severity}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[200px]" title={vuln.poc_request}>
                            {vuln.poc_request}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {selectedVulnData && (
                  <div className="w-80 flex flex-col">
                    <div className="p-3 border-b bg-muted">
                      <span className="text-sm font-medium">Vulnerability Details</span>
                    </div>
                    <ScrollArea className="flex-1 p-3 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Parameter</Label>
                        <p className="font-mono text-sm">{selectedVulnData.param_name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Technique</Label>
                        <p className="text-sm">{TECHNIQUE_LABELS[selectedVulnData.technique as InjectionTechnique]}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">DBMS</Label>
                        <p className="text-sm">{selectedVulnData.dbms}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Severity</Label>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${SEVERITY_COLORS[selectedVulnData.severity]}`}>
                          {selectedVulnData.severity}
                        </span>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Fingerprint</Label>
                        <p className="text-xs">{selectedVulnData.fingerprint}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Proof of Concept</Label>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-auto">
                          {selectedVulnData.poc_request}
                        </pre>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="extraction" className="flex-1 min-h-0 flex flex-col">
            {databases.length === 0 && !isRunning ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Database className="h-8 w-8" />
                <p className="text-sm">No data extracted yet. Vulnerabilities will enable data extraction.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex">
                <div className="w-64 border-r flex flex-col">
                  <div className="p-2 border-b bg-muted">
                    <span className="text-xs font-medium">Databases</span>
                  </div>
                  <ScrollArea className="flex-1">
                    {databases.map(db => (
                      <button
                        key={db.name}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 ${selectedDb === db.name ? 'bg-muted' : ''}`}
                        onClick={() => { setSelectedDb(db.name); setSelectedTable(null); }}
                      >
                        <Database className="inline h-3.5 w-3.5 mr-2" />
                        {db.name}
                      </button>
                    ))}
                  </ScrollArea>
                </div>

                <div className="w-64 border-r flex flex-col">
                  <div className="p-2 border-b bg-muted">
                    <span className="text-xs font-medium">Tables</span>
                  </div>
                  <ScrollArea className="flex-1">
                    {selectedDbData?.tables.map(table => (
                      <button
                        key={table.name}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 ${selectedTable === table.name ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedTable(table.name)}
                      >
                        <Table2 className="inline h-3.5 w-3.5 mr-2" />
                        {table.name}
                        <Badge variant="secondary" className="ml-2 text-xs">{table.rows.length}</Badge>
                      </button>
                    ))}
                  </ScrollArea>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-2 border-b bg-muted flex items-center justify-between">
                    <span className="text-xs font-medium">Data: {selectedTable || 'Select a table'}</span>
                    {tableData && (
                      <Badge variant="secondary">{tableData.rows.length} rows</Badge>
                    )}
                  </div>
                  <ScrollArea className="flex-1">
                    {tableData ? (
                      tableData.rows.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {tableData.columns.map((col, i) => (
                                <TableHead key={i} className="text-xs">{col.name}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableData.rows.slice(0, 100).map((row, rowIdx) => (
                              <TableRow key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                  <TableCell key={cellIdx} className="text-xs font-mono">{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No data in table
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Select a table to view data
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          Vulns: <span className="text-red-500 font-medium">{vulnerabilities.length}</span>
        </span>
        <span className="text-muted-foreground">
          Databases: <span className="font-medium">{databases.length}</span>
        </span>
        {error && <span className="text-destructive">{error}</span>}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => exportResults('json')} disabled={vulnerabilities.length === 0}>
          <Download className="h-3.5 w-3.5" />
          JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportResults('csv')} disabled={vulnerabilities.length === 0}>
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={clearResults} disabled={vulnerabilities.length === 0 && databases.length === 0}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
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