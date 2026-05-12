'use client';

import * as React from 'react';
import { Play, Square, Download, Upload, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBruteForceConfig, useBruteForceAttack } from './hooks';
import { parseRawRequest } from './types';
import { useAppStore } from '@/stores/appStore';
import Editor from '@monaco-editor/react';

export function BruteForcePage() {
  const {
    config,
    setConfig,
    updateConfig,
    updateAttackMode,
    updatePayloadType,
    updatePayloadValues,
    updateNumberRange,
    addProcessingStep,
    removeProcessingStep,
    updateGrepMatch,
    updateGrepExtract,
    updateSessionHandling,
    setBaseRequest,
  } = useBruteForceConfig();

  const {
    results,
    isRunning,
    progress,
    selectedResult,
    setSelectedResult,
    startAttack,
    stopAttack,
    clearResults,
  } = useBruteForceAttack();

  const [configDialogOpen, setConfigDialogOpen] = React.useState(false);
  const [rawRequestDialogOpen, setRawRequestDialogOpen] = React.useState(false);
  const [rawRequestContent, setRawRequestContent] = React.useState('');
  const [payloadDialogOpen, setPayloadDialogOpen] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterPayload, setFilterPayload] = React.useState('');
  const [filterGrep, setFilterGrep] = React.useState(false);

  const pendingRequest = useAppStore((s) => s.pendingBruteForceRequest);

  React.useEffect(() => {
    if (pendingRequest) {
      setBaseRequest({
        ...pendingRequest,
        follow_redirects: true,
        max_hops: 10,
      } as any);
      useAppStore.getState().setPendingBruteForceRequest(null);
    }
  }, [pendingRequest, setBaseRequest]);

  const handleStartAttack = () => {
    startAttack(config);
  };

  const handleStopAttack = () => {
    stopAttack();
  };

  const handleParseRawRequest = () => {
    const parsed = parseRawRequest(rawRequestContent);
    if (parsed) {
      setBaseRequest(parsed as any);
    }
    setRawRequestDialogOpen(false);
    setRawRequestContent('');
  };

  const handleLoadPayloads = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const values = content.split('\n').filter((line) => line.trim());
      updatePayloadValues(values);
    };
    reader.readAsText(file);
  };

  const filteredResults = results.filter((result) => {
    if (filterStatus && result.status?.toString() !== filterStatus) return false;
    if (filterPayload) {
      const payloadStr = Object.entries(result.payload_values).map(([k, v]) => `${k}=${v}`).join(', ');
      if (!payloadStr.toLowerCase().includes(filterPayload.toLowerCase())) return false;
    }
    if (filterGrep && !result.grep_match) return false;
    return true;
  });

  const handleExportResults = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const data = JSON.stringify(results, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brute-force-results-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['#', 'Payload Values', 'Status', 'Length', 'Time (ms)', 'Grep Match', 'Error'];
      const rows = results.map((r, i) => [
        i + 1,
        JSON.stringify(r.payload_values),
        r.status || '',
        r.response_length || '',
        r.response_time_ms || '',
        r.grep_match ? 'Yes' : 'No',
        r.error || '',
      ]);
      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brute-force-results-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatPayloadValues = (payloadValues: Record<string, string>) => {
    return Object.entries(payloadValues).map(([k, v]) => `${k}=${v}`).join(', ');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl">Brute Force</h1>
          {isRunning && progress && (
            <Badge variant="secondary" className="animate-pulse">
              {progress.current} / {progress.total}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigDialogOpen(true)}
          >
            Configure
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRawRequestDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            Import Request
          </Button>
          <div className="h-6 w-px bg-border" />
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={handleStopAttack}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          ) : (
            <Button size="sm" onClick={handleStartAttack} disabled={!config.base_request.url}>
              <Play className="h-4 w-4 mr-1" />
              Start Attack
            </Button>
          )}
        </div>
      </div>

      {progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Progress</span>
            <span>
              {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Status:</Label>
          <Input
            placeholder="Filter by status..."
            className="h-8 w-24 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Payload:</Label>
          <Input
            placeholder="Filter by payload..."
            className="h-8 w-40 text-sm"
            value={filterPayload}
            onChange={(e) => setFilterPayload(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="filterGrep"
            checked={filterGrep}
            onCheckedChange={(checked) => setFilterGrep(checked as boolean)}
          />
          <Label htmlFor="filterGrep" className="text-xs cursor-pointer">Grep Match Only</Label>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => handleExportResults('csv')} disabled={results.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExportResults('json')} disabled={results.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          JSON
        </Button>
        <Button variant="outline" size="sm" onClick={clearResults} disabled={results.length === 0}>
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 border-b">
            <span className="text-sm font-medium">Results ({filteredResults.length})</span>
          </div>
          <div className="overflow-auto h-[calc(100%-40px)]">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium w-12">#</th>
                  <th className="px-3 py-2 text-left font-medium">Payload</th>
                  <th className="px-3 py-2 text-left font-medium w-16">Status</th>
                  <th className="px-3 py-2 text-left font-medium w-20">Length</th>
                  <th className="px-3 py-2 text-left font-medium w-16">Grep</th>
                  <th className="px-3 py-2 text-left font-medium w-20">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, index) => (
                  <tr
                    key={result.id}
                    className={`border-b cursor-pointer hover:bg-muted/50 ${
                      selectedResult?.id === result.id ? 'bg-muted' : ''
                    } ${result.error ? 'text-destructive' : ''}`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-[200px]">
                      {formatPayloadValues(result.payload_values)}
                    </td>
                    <td className="px-3 py-2">
                      {result.status && (
                        <Badge
                          variant={
                            result.status >= 200 && result.status < 300
                              ? 'default'
                              : result.status >= 400
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {result.status}
                        </Badge>
                      )}
                      {result.error && <span className="text-xs">Error</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {result.response_length ?? '-'}
                    </td>
                    <td className="px-3 py-2">
                      {result.grep_match && (
                        <Badge variant="default" className="text-xs">Match</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {result.response_time_ms ? `${result.response_time_ms}ms` : '-'}
                    </td>
                  </tr>
                ))}
                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      {isRunning ? 'Running attack...' : 'No results yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-muted/50 px-3 py-2 border-b">
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="flex-1 overflow-auto">
            {selectedResult ? (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Payload:</span>{' '}
                    <span className="font-mono text-xs">{formatPayloadValues(selectedResult.payload_values)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge
                      variant={
                        (selectedResult.status || 0) >= 200 && (selectedResult.status || 0) < 300
                          ? 'default'
                          : (selectedResult.status || 0) >= 400
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {selectedResult.status || 'Error'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grep Match:</span>{' '}
                    <Badge variant={selectedResult.grep_match ? 'default' : 'secondary'}>
                      {selectedResult.grep_match ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Length:</span>{' '}
                    {selectedResult.response_length ?? '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>{' '}
                    {selectedResult.response_time_ms
                      ? `${selectedResult.response_time_ms}ms`
                      : '-'}
                  </div>
                  {selectedResult.grep_extracted && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Extracted:</span>{' '}
                      <span className="font-mono text-xs">{selectedResult.grep_extracted}</span>
                    </div>
                  )}
                </div>
                {selectedResult.error && (
                  <div className="text-sm text-destructive">Error: {selectedResult.error}</div>
                )}
                {selectedResult.response && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Response Body</Label>
                    <div className="border rounded-md h-64">
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedResult.response!.body), null, 2);
                          } catch {
                            return selectedResult.response!.body;
                          }
                        })()}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12,
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a result to preview
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attack Configuration</DialogTitle>
            <DialogDescription>Configure the Brute Force attack settings</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="attack" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="attack">Attack</TabsTrigger>
              <TabsTrigger value="payloads">Payloads</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>

            <TabsContent value="attack" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Attack Name</Label>
                  <Input
                    value={config.name}
                    onChange={(e) => updateConfig({ name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Attack Mode</Label>
                  <Select
                    value={config.mode}
                    onValueChange={(value) => updateAttackMode(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sniper">Sniper</SelectItem>
                      <SelectItem value="BatteringRam">Battering Ram</SelectItem>
                      <SelectItem value="Pitchfork">Pitchfork</SelectItem>
                      <SelectItem value="ClusterBomb">Cluster Bomb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label>Concurrency</Label>
                  <Input
                    type="number"
                    value={config.concurrency}
                    onChange={(e) => updateConfig({ concurrency: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Delay (ms)</Label>
                  <Input
                    type="number"
                    value={config.delay_ms}
                    onChange={(e) => updateConfig({ delay_ms: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Max Delay</Label>
                  <Input
                    type="number"
                    value={config.delay_max_ms || ''}
                    onChange={(e) =>
                      updateConfig({ delay_max_ms: e.target.value ? parseInt(e.target.value) : undefined })
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Retries</Label>
                  <Input
                    type="number"
                    value={config.retries}
                    onChange={(e) => updateConfig({ retries: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payloads" className="space-y-4">
              <div className="grid gap-2">
                <Label>Payload Type</Label>
                <Select
                  value={config.payload_config.payload_type}
                  onValueChange={(value) => updatePayloadType(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SimpleList">Simple List</SelectItem>
                    <SelectItem value="RuntimeFile">Runtime File</SelectItem>
                    <SelectItem value="NumberRange">Number Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.payload_config.payload_type === 'SimpleList' && (
                <div className="grid gap-2">
                  <Label>Payloads (one per line)</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono h-32"
                    placeholder="payload1&#10;payload2&#10;payload3"
                    value={config.payload_config.values.join('\n')}
                    onChange={(e) => updatePayloadValues(e.target.value.split('\n').filter((v) => v.trim()))}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPayloadDialogOpen(true)}>
                      Load from File
                    </Button>
                  </div>
                </div>
              )}

              {config.payload_config.payload_type === 'NumberRange' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label>Start</Label>
                    <Input
                      type="number"
                      value={config.payload_config.number_start || 0}
                      onChange={(e) => updateNumberRange({ number_start: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End</Label>
                    <Input
                      type="number"
                      value={config.payload_config.number_end || 100}
                      onChange={(e) => updateNumberRange({ number_end: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Step</Label>
                    <Input
                      type="number"
                      value={config.payload_config.number_step || 1}
                      onChange={(e) => updateNumberRange({ number_step: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Format</Label>
                    <Input
                      value={config.payload_config.number_format || '{}'}
                      onChange={(e) => updateNumberRange({ number_format: e.target.value })}
                      placeholder="{}"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="processing" className="space-y-4">
              <div className="grid gap-2">
                <Label>Payload Processing Pipeline</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {config.payload_config.processing.map((step, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {step}
                      <button
                        type="button"
                        onClick={() => removeProcessingStep(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {config.payload_config.processing.length === 0 && (
                    <span className="text-sm text-muted-foreground">No processing steps added</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => addProcessingStep('UrlEncode')}>
                    URL Encode
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addProcessingStep('UrlDecode')}>
                    URL Decode
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addProcessingStep('Base64Encode')}>
                    Base64 Encode
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addProcessingStep('Base64Decode')}>
                    Base64 Decode
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addProcessingStep('Md5Hash')}>
                    MD5 Hash
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addProcessingStep('Sha1Hash')}>
                    SHA1 Hash
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addProcessingStep('Sha256Hash')}>
                    SHA256 Hash
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="options" className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="grepMatchEnabled"
                    checked={config.grep_match.enabled}
                    onCheckedChange={(checked) => updateGrepMatch(checked as boolean, config.grep_match.keyword, config.grep_match.case_sensitive)}
                  />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="grepMatchEnabled">Grep - Match</Label>
                    <Input
                      placeholder="Keyword to search in response..."
                      value={config.grep_match.keyword}
                      onChange={(e) => updateGrepMatch(config.grep_match.enabled, e.target.value, config.grep_match.case_sensitive)}
                      disabled={!config.grep_match.enabled}
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="grepMatchCaseSensitive"
                        checked={config.grep_match.case_sensitive}
                        onCheckedChange={(checked) => updateGrepMatch(config.grep_match.enabled, config.grep_match.keyword, checked as boolean)}
                        disabled={!config.grep_match.enabled}
                      />
                      <Label htmlFor="grepMatchCaseSensitive" className="text-xs">Case Sensitive</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="grepExtractEnabled"
                    checked={config.grep_extract.enabled}
                    onCheckedChange={(checked) => updateGrepExtract(checked as boolean, config.grep_extract.regex, config.grep_extract.replacement)}
                  />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="grepExtractEnabled">Grep - Extract</Label>
                    <Input
                      placeholder='Regex pattern (e.g., csrf_token" value="([^"]+)")...'
                      value={config.grep_extract.regex}
                      onChange={(e) => updateGrepExtract(config.grep_extract.enabled, e.target.value, config.grep_extract.replacement)}
                      disabled={!config.grep_extract.enabled}
                    />
                    <Input
                      placeholder="Replacement (optional, leave empty to capture full match)..."
                      value={config.grep_extract.replacement || ''}
                      onChange={(e) => updateGrepExtract(config.grep_extract.enabled, config.grep_extract.regex, e.target.value || undefined)}
                      disabled={!config.grep_extract.enabled}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="sessionEnabled"
                    checked={config.session_handling.enabled}
                    onCheckedChange={(checked) => updateSessionHandling(checked as boolean, config.session_handling.extract_token_name, config.session_handling.update_header_name)}
                  />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="sessionEnabled">Session Handling</Label>
                    <Input
                      placeholder="Token/Cookie name to extract..."
                      value={config.session_handling.extract_token_name || ''}
                      onChange={(e) => updateSessionHandling(config.session_handling.enabled, e.target.value || undefined, config.session_handling.update_header_name)}
                      disabled={!config.session_handling.enabled}
                    />
                    <Input
                      placeholder="Header name to update (e.g., Authorization)..."
                      value={config.session_handling.update_header_name || ''}
                      onChange={(e) => updateSessionHandling(config.session_handling.enabled, config.session_handling.extract_token_name, e.target.value || undefined)}
                      disabled={!config.session_handling.enabled}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setConfigDialogOpen(false)}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rawRequestDialogOpen} onOpenChange={setRawRequestDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Import Raw HTTP Request</DialogTitle>
            <DialogDescription>Paste a raw HTTP request to use as the base. Use § to mark payload positions.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Raw Request</Label>
              <textarea
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="GET /path?id=§123§ HTTP/1.1&#10;Host: example.com&#10;&#10;"
                value={rawRequestContent}
                onChange={(e) => setRawRequestContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRawRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleParseRawRequest} disabled={!rawRequestContent.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payloadDialogOpen} onOpenChange={setPayloadDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Load Payloads from File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <input type="file" onChange={handleLoadPayloads} accept=".txt,.lst,.wordlist" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayloadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}