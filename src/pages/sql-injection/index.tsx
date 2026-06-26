import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { AlertTriangle, Database, Download, Play, Square, Table2, Trash2 } from 'lucide-react';
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
  critical: 'border-red-500/20 text-red-500 bg-red-500/5',
  high: 'border-orange-500/20 text-orange-500 bg-orange-500/5',
  medium: 'border-yellow-500/20 text-yellow-500 bg-yellow-500/5',
  low: 'border-blue-500/20 text-blue-500 bg-blue-500/5',
};

export function SqlInjectionPage() {
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header Controls */}
      <div className="flex flex-col border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/10">
          <Input
            className="h-7 text-xs bg-background max-w-[280px]"
            placeholder="http://target.com/search?q="
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <Select value={method} onValueChange={v => setMethod(v as 'GET' | 'POST')}>
            <SelectTrigger className="h-7 text-xs w-20 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="GET" className="text-xs">GET</SelectItem>
              <SelectItem value="POST" className="text-xs">POST</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Risk</Label>
              <Select value={riskLevel} onValueChange={v => setRiskLevel(v as RiskLevel)}>
                <SelectTrigger className="h-7 text-xs w-[120px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="low" className="text-xs">Low (few tests)</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="high" className="text-xs">High (all tests)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Techniques</span>
              <div className="flex items-center gap-3">
                {(Object.keys(TECHNIQUE_LABELS) as InjectionTechnique[]).map(tech => (
                  <label key={tech} className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                    <Checkbox
                      checked={techniques.has(tech)}
                      onCheckedChange={() => toggleTechnique(tech)}
                    />
                    <span>{TECHNIQUE_LABELS[tech]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex h-9 items-center justify-between px-3 gap-2 bg-muted/5">
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge variant="secondary" className="animate-pulse text-[9px] h-5 py-0 font-mono">
                {progress.phase}: {progress.current}/{progress.total}
              </Badge>
            )}
            {error && <span className="text-[10px] text-destructive font-mono max-w-[320px] truncate">{error}</span>}
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => exportResults('json')} disabled={vulnerabilities.length === 0} className="h-6 text-[11px] gap-1 px-2">
              <Download className="h-3 w-3" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportResults('csv')} disabled={vulnerabilities.length === 0} className="h-6 text-[11px] gap-1 px-2">
              <Download className="h-3 w-3" />
              CSV
            </Button>
            <Button variant="ghost" size="icon" onClick={clearResults} disabled={vulnerabilities.length === 0 && databases.length === 0} className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border mx-0.5" />
            {isRunning ? (
              <Button variant="destructive" size="sm" onClick={stopScan} className="h-6 text-[11px] gap-1 px-2.5">
                <Square className="h-3 w-3 fill-current" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={startScan} disabled={!url.trim() || parameters.length === 0} className="h-6 text-[11px] gap-1 px-2.5">
                <Play className="h-3 w-3 fill-current" />
                Start
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="min-h-0 flex-1 flex flex-col">
        {progress.total > 0 && (
          <div className="px-3 py-1 bg-muted/5 border-b space-y-1">
            <div className="h-1 bg-muted rounded-full overflow-hidden w-full">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">{progress.message}</div>
          </div>
        )}

        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-3">
          {/* Left: Params configuration */}
          <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Parameters</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">{injectCount} marked for injection</span>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1 p-2">
              <div className="space-y-2">
                {parameters.map(param => (
                  <div key={param.name} className="flex items-center gap-2 border p-1.5 rounded bg-muted/5">
                    <Checkbox
                      checked={param.inject}
                      onCheckedChange={() => toggleParamInject(param.name)}
                    />
                    <span className="font-mono text-xs w-20 truncate" title={param.name}>{param.name}</span>
                    <span className="text-[10px] text-muted-foreground w-10 shrink-0">{param.location}</span>
                    <Input
                      className="flex-1 h-7 text-xs bg-background"
                      value={param.value}
                      onChange={e => setParameters(prev => prev.map(p => p.name === param.name ? { ...p, value: e.target.value } : p))}
                      placeholder="value"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeParameter(param.name)} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex items-center gap-2 border border-dashed p-1.5 rounded bg-background pt-2">
                  <Input
                    className="flex-1 h-7 text-xs"
                    placeholder="name"
                    value={newParamName}
                    onChange={e => setNewParamName(e.target.value)}
                  />
                  <Input
                    className="flex-1 h-7 text-xs"
                    placeholder="value"
                    value={newParamValue}
                    onChange={e => setNewParamValue(e.target.value)}
                  />
                  <Button size="sm" onClick={addParameter} className="h-7 text-xs px-2.5">Add</Button>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right 2 columns: Results tabs */}
          <div className="lg:col-span-2 flex flex-col min-h-0 bg-background">
            <Tabs defaultValue="vulnerabilities" className="h-full flex flex-col min-h-0">
              <div className="flex h-8 shrink-0 items-center border-b bg-muted/15 px-2">
                <TabsList className="h-6 bg-background p-0.5 border">
                  <TabsTrigger value="vulnerabilities" className="h-5 text-[11px] px-2.5">
                    Vulnerabilities
                    {vulnerabilities.length > 0 && (
                      <Badge variant="outline" className="ml-1 px-1 h-4 text-[9px] border-amber-500/20 text-amber-600 bg-amber-500/5 font-semibold">
                        {vulnerabilities.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="extraction" className="h-5 text-[11px] px-2.5">
                    Data Extraction
                    {databases.length > 0 && (
                      <Badge variant="outline" className="ml-1 px-1 h-4 text-[9px] font-semibold">
                        {databases.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="vulnerabilities" className="flex-1 min-h-0 flex flex-col m-0">
                {vulnerabilities.length === 0 && !isRunning ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground/55" />
                    <p className="text-xs">No vulnerabilities found. Configure target and start scan.</p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex">
                    <ScrollArea className="flex-1 border-r">
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 z-10 bg-background">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-8 py-0">Parameter</TableHead>
                            <TableHead className="h-8 py-0">Location</TableHead>
                            <TableHead className="h-8 py-0">Technique</TableHead>
                            <TableHead className="h-8 py-0">DBMS</TableHead>
                            <TableHead className="h-8 py-0">Severity</TableHead>
                            <TableHead className="h-8 py-0">PoC</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vulnerabilities.map(vuln => (
                            <TableRow
                              key={vuln.id}
                              className={`hover:bg-muted/30 cursor-pointer ${selectedVuln === vuln.id ? 'bg-muted/65' : ''}`}
                              onClick={() => setSelectedVuln(vuln.id)}
                            >
                              <TableCell className="font-mono py-1">{vuln.param_name}</TableCell>
                              <TableCell className="py-1">{vuln.param_location}</TableCell>
                              <TableCell className="py-1">{vuln.technique.replace('_', ' ')}</TableCell>
                              <TableCell className="py-1">{vuln.dbms}</TableCell>
                              <TableCell className="py-1">
                                <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 uppercase ${SEVERITY_COLORS[vuln.severity]}`}>
                                  {vuln.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-[11px] py-1 truncate max-w-[120px]" title={vuln.poc_request}>
                                {vuln.poc_request}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {selectedVulnData && (
                      <div className="w-72 flex flex-col shrink-0 border-l">
                        <div className="p-2 border-b bg-muted/10">
                          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Details</span>
                        </div>
                        <ScrollArea className="flex-1 p-3">
                          <div className="space-y-3 text-xs">
                            <div>
                              <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Parameter</Label>
                              <p className="font-mono text-xs font-semibold">{selectedVulnData.param_name} ({selectedVulnData.param_location})</p>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Technique</Label>
                              <p>{TECHNIQUE_LABELS[selectedVulnData.technique as InjectionTechnique]}</p>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">DBMS</Label>
                              <p>{selectedVulnData.dbms}</p>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Severity</Label>
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 uppercase mt-0.5 ${SEVERITY_COLORS[selectedVulnData.severity]}`}>
                                {selectedVulnData.severity}
                              </Badge>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Fingerprint</Label>
                              <p className="font-mono text-[10px] bg-muted/10 p-1 rounded break-all">{selectedVulnData.fingerprint}</p>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Proof of Concept</Label>
                              <pre className="mt-1 p-2 bg-muted/20 border rounded text-[10px] font-mono whitespace-pre-wrap break-all max-h-36 overflow-auto">
                                {selectedVulnData.poc_request}
                              </pre>
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="extraction" className="flex-1 min-h-0 flex flex-col m-0">
                {databases.length === 0 && !isRunning ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Database className="h-8 w-8 text-muted-foreground/55" />
                    <p className="text-xs">No data extracted yet. Vulnerabilities enable extraction.</p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex">
                    {/* Database Column */}
                    <div className="w-48 border-r flex flex-col">
                      <div className="p-2 border-b bg-muted/10 shrink-0">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Databases</span>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="divide-y">
                          {databases.map(db => (
                            <button
                              key={db.name}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/40 flex items-center transition-colors ${selectedDb === db.name ? 'bg-muted/70 font-semibold' : ''}`}
                              onClick={() => { setSelectedDb(db.name); setSelectedTable(null); }}
                            >
                              <Database className="h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{db.name}</span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Tables Column */}
                    <div className="w-48 border-r flex flex-col">
                      <div className="p-2 border-b bg-muted/10 shrink-0">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Tables</span>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="divide-y">
                          {selectedDbData?.tables.map(table => (
                            <button
                              key={table.name}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/40 flex items-center transition-colors ${selectedTable === table.name ? 'bg-muted/70 font-semibold' : ''}`}
                              onClick={() => setSelectedTable(table.name)}
                            >
                              <Table2 className="h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                              <span className="truncate flex-1">{table.name}</span>
                              <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-4 font-normal shrink-0">{table.rows.length}</Badge>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Data Rows Column */}
                    <div className="flex-1 flex flex-col min-h-0 bg-background">
                      <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-8">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider truncate">
                          Data: {selectedTable || 'Select a table'}
                        </span>
                        {tableData && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">{tableData.rows.length} rows</Badge>
                        )}
                      </div>
                      <ScrollArea className="flex-1">
                        {tableData ? (
                          tableData.rows.length > 0 ? (
                            <Table className="text-xs">
                              <TableHeader className="sticky top-0 z-10 bg-background">
                                <TableRow className="hover:bg-transparent">
                                  {tableData.columns.map((col, i) => (
                                    <TableHead key={i} className="h-8 py-0 font-semibold">{col.name}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tableData.rows.slice(0, 100).map((row, rowIdx) => (
                                  <TableRow key={rowIdx} className="hover:bg-muted/30">
                                    {row.map((cell, cellIdx) => (
                                      <TableCell key={cellIdx} className="font-mono py-1 text-[11px]">{cell}</TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-6">
                              No data in table
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-6">
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
        </div>
      </main>
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
