'use client';

import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Copy,
  FileDown,
  FileUp,
  Loader2,
  Minus,
  ShieldAlert,
  Square,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextEditor } from '@/components/ui/text-editor';
import { buildRawHttpRequest, parseRawHttpRequest } from '@/lib/http-message';
import {
  PROMPT_INJECTION_IMPORTED_PAYLOADS,
  PROMPT_INJECTION_PREDEFINED_PAYLOADS,
} from '../lib/payloads';

type PayloadMode = 'manual' | 'import' | 'predefined';
type AttackType = 'sniper';

interface AttackSettings {
  throttle: number;
  timeout: number;
  followRedirects: boolean;
}

interface TestResult {
  id: string;
  index: number;
  payload: string;
  requestUrl: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  latency: number;
  length: number;
  lengthDelta: number;
  success: boolean;
  isAnomaly: boolean;
  findings: string[];
  error?: string;
}

interface ToolConfig {
  title: string;
  description: string;
  payloadLabel: string;
  predefinedPayloads: readonly string[];
  importedPayloads: readonly string[];
  responseKeywords: string[];
  defaultRequest: string;
}

interface PromptInjectionRouteState {
  promptInjectionRequest?: {
    raw: string;
    endpoint: string;
  };
}

const DEFAULT_SETTINGS: AttackSettings = {
  throttle: 0,
  timeout: 30000,
  followRedirects: true,
};

const DEFAULT_REQUEST = buildRawHttpRequest({
  method: 'POST',
  url: 'http://localhost:3000/api/chat',
  headers: {
    Host: 'localhost:3000',
    'Content-Type': 'application/json',
  },
  body: '{"messages":[{"role":"user","content":"§test§"}]}',
});

const TOOL_CONFIGS = {
  'prompt-injection': {
    title: 'Prompt Injection',
    description: 'Replay override-style payloads against a chat endpoint and flag unusual responses.',
    payloadLabel: 'Injection Payloads',
    predefinedPayloads: PROMPT_INJECTION_PREDEFINED_PAYLOADS,
    importedPayloads: PROMPT_INJECTION_IMPORTED_PAYLOADS,
    responseKeywords: ['admin mode', 'debug mode', 'system override', 'hidden system prompt', 'internal data'],
    defaultRequest: DEFAULT_REQUEST,
  },
} satisfies Record<string, ToolConfig>;

function parsePayloadLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getPayloadModeLabel(mode: PayloadMode) {
  if (mode === 'manual') {
    return 'Manual';
  }

  if (mode === 'import') {
    return 'Imported';
  }

  return 'Library';
}

function detectFindings(body: string, keywords: string[]) {
  const lowerBody = body.toLowerCase();

  return keywords.filter((keyword) => lowerBody.includes(keyword.toLowerCase()));
}

function countMarkedTargets(value: string) {
  return value.match(/§[^§]*§/g)?.length ?? 0;
}

function replaceMarkedTargets(value: string, payload: string) {
  return value.replace(/§[^§]*§/g, payload);
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

interface AIPayloadTesterProps {
  tool: keyof typeof TOOL_CONFIGS;
}

function AIPayloadTester({ tool }: AIPayloadTesterProps) {
  const location = useLocation();
  const config = TOOL_CONFIGS[tool];
  const [payloadMode, setPayloadMode] = React.useState<PayloadMode>('predefined');
  const [manualPayloads, setManualPayloads] = React.useState('');
  const [importedPayloads, setImportedPayloads] = React.useState<string[]>([]);
  const [selectedPayloads, setSelectedPayloads] = React.useState<Set<string>>(new Set(config.predefinedPayloads));
  const [payloadDialogOpen, setPayloadDialogOpen] = React.useState(false);
  const [draftPayloadMode, setDraftPayloadMode] = React.useState<PayloadMode>('predefined');
  const [draftManualPayloads, setDraftManualPayloads] = React.useState('');
  const [draftImportedPayloads, setDraftImportedPayloads] = React.useState<string[]>([]);
  const [draftSelectedPayloads, setDraftSelectedPayloads] = React.useState<Set<string>>(new Set(config.predefinedPayloads));
  const [requestBody, setRequestBody] = React.useState(config.defaultRequest);
  const [endpoint, setEndpoint] = React.useState('http://localhost:3000/api/chat');
  const [attackType, setAttackType] = React.useState<AttackType>('sniper');
  const [attackSettings, setAttackSettings] = React.useState<AttackSettings>(DEFAULT_SETTINGS);
  const [isRunning, setIsRunning] = React.useState(false);
  const [results, setResults] = React.useState<TestResult[]>([]);
  const [currentRunningIndex, setCurrentRunningIndex] = React.useState(-1);
  const [runTotal, setRunTotal] = React.useState(0);
  const [selectedResultId, setSelectedResultId] = React.useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const isCancelledRef = React.useRef(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const requestEditorRef = React.useRef<any>(null);

  React.useEffect(() => {
    setSelectedPayloads(new Set(config.predefinedPayloads));
    setImportedPayloads([]);
    setManualPayloads('');
    setRequestBody(config.defaultRequest);
    setResults([]);
    setSelectedResultId(null);
    setPayloadMode('predefined');
    setPayloadDialogOpen(false);
    setDraftPayloadMode('predefined');
    setDraftImportedPayloads([]);
    setDraftManualPayloads('');
    setDraftSelectedPayloads(new Set(config.predefinedPayloads));
  }, [config]);

  React.useEffect(() => {
    const routeState = location.state as PromptInjectionRouteState | null;
    const promptInjectionRequest = routeState?.promptInjectionRequest;

    if (!promptInjectionRequest) {
      return;
    }

    setRequestBody(promptInjectionRequest.raw);
    setEndpoint(promptInjectionRequest.endpoint);
    setResults([]);
    setSelectedResultId(null);
  }, [location.key, location.state]);

  React.useEffect(() => {
    if (!payloadDialogOpen) {
      return;
    }

    setDraftPayloadMode(payloadMode);
    setDraftManualPayloads(manualPayloads);
    setDraftImportedPayloads(importedPayloads);
    setDraftSelectedPayloads(new Set(selectedPayloads));
  }, [importedPayloads, manualPayloads, payloadDialogOpen, payloadMode, selectedPayloads]);

  const allPayloads = React.useMemo(() => {
    if (payloadMode === 'manual') {
      return parsePayloadLines(manualPayloads);
    }

    if (payloadMode === 'import') {
      return importedPayloads;
    }

    return [...config.predefinedPayloads];
  }, [config.predefinedPayloads, importedPayloads, manualPayloads, payloadMode]);

  const draftAllPayloads = React.useMemo(() => {
    if (draftPayloadMode === 'manual') {
      return parsePayloadLines(draftManualPayloads);
    }

    if (draftPayloadMode === 'import') {
      return draftImportedPayloads;
    }

    return [...config.predefinedPayloads];
  }, [config.predefinedPayloads, draftImportedPayloads, draftManualPayloads, draftPayloadMode]);

  const payloadsToRun = React.useMemo(() => {
    if (payloadMode === 'manual') {
      return allPayloads;
    }

    return allPayloads.filter((payload) => selectedPayloads.has(payload));
  }, [allPayloads, payloadMode, selectedPayloads]);

  const selectedResult = React.useMemo(() => {
    return results.find((result) => result.id === selectedResultId) || results[results.length - 1] || null;
  }, [results, selectedResultId]);

  const anomalyCount = results.filter((result) => result.isAnomaly).length;
  const successCount = results.filter((result) => result.success).length;
  const markedTargetCount = countMarkedTargets(requestBody);

  const selectAllPayloads = () => {
    setDraftSelectedPayloads((current) => {
      if (current.size === draftAllPayloads.length) {
        return new Set();
      }

      return new Set(draftAllPayloads);
    });
  };

  const loadBundledPayloads = () => {
    setDraftImportedPayloads([...config.importedPayloads]);
    setDraftSelectedPayloads(new Set(config.importedPayloads));
    toast.success('Bundled payloads loaded');
  };

  const loadPayloadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const payloads = parsePayloadLines(String(reader.result || ''));
      setDraftImportedPayloads(payloads);
      setDraftSelectedPayloads(new Set(payloads));
      toast.success(`${payloads.length} payloads imported`);
    };
    reader.onerror = () => toast.error('Failed to read payload file');
    reader.readAsText(file);
    event.target.value = '';
  };

  const toggleDraftPayload = (payload: string) => {
    setDraftSelectedPayloads((current) => {
      const next = new Set(current);

      if (next.has(payload)) {
        next.delete(payload);
      } else {
        next.add(payload);
      }

      return next;
    });
  };

  const savePayloadConfig = () => {
    setPayloadMode(draftPayloadMode);
    setManualPayloads(draftManualPayloads);
    setImportedPayloads(draftImportedPayloads);
    setSelectedPayloads(new Set(draftSelectedPayloads));
    setPayloadDialogOpen(false);
    toast.success('Payload config saved');
  };

  const markRequestTarget = () => {
    const editor = requestEditorRef.current;
    const model = editor?.getModel?.();
    const selection = editor?.getSelection?.();

    if (!editor || !model || !selection) {
      return;
    }

    const selectedText = model.getValueInRange(selection);
    editor.executeEdits('mark-prompt-injection-target', [
      {
        range: selection,
        text: `§${selectedText}§`,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
    setRequestBody(editor.getValue());
  };

  const sendRequest = async (payload: string, index: number): Promise<TestResult> => {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), attackSettings.timeout);
    abortControllerRef.current = controller;

    try {
      const modifiedRequest = replaceMarkedTargets(requestBody, payload);
      const parsedRequest = parseRawHttpRequest(modifiedRequest, {
        fallbackUrl: endpoint.trim(),
        defaultUrl: 'http://localhost:3000',
        defaultMethod: 'GET',
        defaultTarget: '/',
        stripHeaders: ['host', 'content-length'],
        uppercaseMethod: true,
      })!;
      const canSendBody = !['GET', 'HEAD'].includes(parsedRequest.method);
      const response = await fetch(parsedRequest.url, {
        method: parsedRequest.method,
        headers: parsedRequest.headers,
        body: canSendBody && parsedRequest.body ? parsedRequest.body : undefined,
        redirect: attackSettings.followRedirects ? 'follow' : 'manual',
        signal: controller.signal,
      });
      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        id: `${tool}-${Date.now()}-${index}`,
        index,
        payload,
        requestUrl: parsedRequest.url,
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        latency: Date.now() - startTime,
        length: body.length,
        lengthDelta: 0,
        success: true,
        isAnomaly: false,
        findings: detectFindings(body, config.responseKeywords),
      };
    } catch (error) {
      return {
        id: `${tool}-${Date.now()}-${index}`,
        index,
        payload,
        requestUrl: endpoint,
        status: 0,
        statusText: 'Request failed',
        headers: {},
        body: '',
        latency: Date.now() - startTime,
        length: 0,
        lengthDelta: 0,
        success: false,
        isAnomaly: false,
        findings: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const runAttack = async (payloads: string[]) => {
    if (payloads.length === 0 || isRunning) {
      return;
    }

    if (markedTargetCount === 0) {
      toast.error('Mark a request target before running');
      return;
    }

    setResults([]);
    setSelectedResultId(null);
    setCurrentRunningIndex(0);
    setRunTotal(payloads.length);
    setIsRunning(true);
    isCancelledRef.current = false;

    let baselineLength: number | null = null;

    for (let index = 0; index < payloads.length; index += 1) {
      if (isCancelledRef.current) {
        break;
      }

      setCurrentRunningIndex(index);

      if (attackSettings.throttle > 0 && index > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, attackSettings.throttle));
      }

      if (isCancelledRef.current) {
        break;
      }

      const result = await sendRequest(payloads[index], index);

      if (baselineLength === null && result.success) {
        baselineLength = result.length;
      }

      const lengthDelta = baselineLength === null ? 0 : result.length - baselineLength;
      const lengthThreshold = baselineLength ? Math.max(100, baselineLength * 0.1) : 100;
      const isAnomaly = !result.success || result.findings.length > 0 || Math.abs(lengthDelta) > lengthThreshold;
      const finalResult = {
        ...result,
        lengthDelta,
        isAnomaly,
      };

      setResults((current) => [...current, finalResult]);
      setSelectedResultId(finalResult.id);
    }

    setIsRunning(false);
    setCurrentRunningIndex(-1);
    abortControllerRef.current = null;
    isCancelledRef.current = false;
  };

  const stopAttack = () => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setCurrentRunningIndex(-1);
  };

  const clearResults = () => {
    setResults([]);
    setSelectedResultId(null);
    setRunTotal(0);
  };

  const copySelectedResponse = async () => {
    if (!selectedResult) {
      return;
    }

    await navigator.clipboard.writeText(selectedResult.body || selectedResult.error || '');
    toast.success('Response copied');
  };

  const exportResults = () => {
    const payload = JSON.stringify(results, null, 2);
    downloadFile(payload, `${tool}-results-${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-medium">{config.title}</h3>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{successCount} completed</Badge>
          {anomalyCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {anomalyCount} flagged
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Payload type</span>
          <Badge variant="secondary">{getPayloadModeLabel(payloadMode)}</Badge>
          <span>{payloadsToRun.length} selected</span>
          {payloadMode !== 'manual' && allPayloads.length !== payloadsToRun.length && (
            <span>{allPayloads.length} available</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" className="gap-1" onClick={() => setPayloadDialogOpen(true)} disabled={isRunning}>
            <Target className="h-3.5 w-3.5" />
            Payload Config
          </Button>
          <Button size="xs" variant="outline" onClick={() => runAttack(allPayloads)} disabled={allPayloads.length === 0 || markedTargetCount === 0 || isRunning}>
            Run All
          </Button>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="flex min-h-0 flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Request</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap text-xs">Raw Request</Label>
                  <Badge variant={markedTargetCount > 0 ? 'default' : 'secondary'}>
                    {markedTargetCount} marked
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={markRequestTarget}
                  >
                    <Target className="mr-1 h-4 w-4" />
                    Mark Target
                  </Button>
                  <Select value={attackType} onValueChange={(value) => setAttackType(value as AttackType)}>
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sniper">Sniper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="min-h-[220px] flex-1 overflow-hidden rounded-md border">
                <TextEditor
                  language="http"
                  value={requestBody}
                  onChange={(value) => setRequestBody(value ?? '')}
                  onMount={(editor) => {
                    requestEditorRef.current = editor;
                  }}
                  options={{
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-xs">Base URL</Label>
                <Input
                  className="h-8 font-mono text-xs"
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap text-xs">Throttle</Label>
                  <Input
                    className="h-8 font-mono text-xs"
                    type="number"
                    min={0}
                    value={attackSettings.throttle}
                    onChange={(event) => setAttackSettings((current) => ({ ...current, throttle: Number(event.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap text-xs">Timeout</Label>
                  <Input
                    className="h-8 font-mono text-xs"
                    type="number"
                    min={100}
                    value={attackSettings.timeout}
                    onChange={(event) => setAttackSettings((current) => ({ ...current, timeout: Number(event.target.value) || 30000 }))}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={attackSettings.followRedirects}
                  onCheckedChange={(checked) => setAttackSettings((current) => ({ ...current, followRedirects: checked === true }))}
                />
                Follow redirects
              </label>

              <div className="flex gap-2">
                <Button size="xs" className="flex-1 gap-2" onClick={() => runAttack(payloadsToRun)} disabled={payloadsToRun.length === 0 || markedTargetCount === 0 || isRunning}>
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {isRunning ? 'Running' : 'Start'}
                </Button>
                {isRunning && (
                  <Button size="xs" variant="outline" onClick={stopAttack}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Results</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="xs" className="h-8 px-2" onClick={copySelectedResponse} disabled={!selectedResult}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="xs" className="h-8 px-2" onClick={exportResults} disabled={results.length === 0}>
                  <FileDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="xs" className="h-8 px-2" onClick={clearResults} disabled={results.length === 0 || isRunning}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
              {isRunning && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Testing {currentRunningIndex + 1} of {runTotal}
                </div>
              )}

              <ScrollArea className="min-h-[180px] rounded-md border">
                {results.length === 0 ? (
                  <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ShieldAlert className="h-8 w-8" />
                    <p className="text-xs">No test results yet.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        className={`grid w-full grid-cols-[42px_minmax(0,1fr)_72px_72px] items-center gap-2 p-2 text-left text-xs hover:bg-muted/50 ${selectedResult?.id === result.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedResultId(result.id)}
                      >
                        <span className="text-muted-foreground">#{result.index + 1}</span>
                        <span className="truncate font-mono" title={result.payload}>{result.payload}</span>
                        <StatusBadge result={result} />
                        <span className={`flex items-center justify-end gap-1 ${result.lengthDelta > 0 ? 'text-green-600' : result.lengthDelta < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {result.lengthDelta > 0 ? <ArrowUp className="h-3 w-3" /> : result.lengthDelta < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {result.lengthDelta === 0 ? '-' : Math.abs(result.lengthDelta)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex min-h-0 flex-1 flex-col rounded-md border">
                <div className="flex items-center justify-between border-b p-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{selectedResult?.payload || 'Response Preview'}</p>
                    <p className="truncate text-xs text-muted-foreground">{selectedResult?.requestUrl || 'Select a result to inspect the response body.'}</p>
                  </div>
                  {selectedResult?.isAnomaly && (
                    <Badge variant="destructive" className="ml-2 gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Flagged
                    </Badge>
                  )}
                </div>
                <ScrollArea className="min-h-[220px] flex-1">
                  {selectedResult ? (
                    <div className="space-y-3 p-3">
                      {selectedResult.findings.length > 0 && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
                          Matched response terms: {selectedResult.findings.join(', ')}
                        </div>
                      )}
                      {selectedResult.error ? (
                        <pre className="whitespace-pre-wrap text-xs text-destructive">{selectedResult.error}</pre>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs">{selectedResult.body || '(empty response)'}</pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center text-xs text-muted-foreground">
                      Response details will appear here.
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

      <Dialog open={payloadDialogOpen} onOpenChange={setPayloadDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{config.payloadLabel}</DialogTitle>
            <DialogDescription>Select or import the payloads used when this tool runs.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Selected payload type</span>
            <Badge variant="secondary">{getPayloadModeLabel(draftPayloadMode)}</Badge>
          </div>

          <Tabs value={draftPayloadMode} onValueChange={(value) => setDraftPayloadMode(value as PayloadMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="predefined">Library</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-3">
              <div className="h-[260px] overflow-hidden rounded-md border">
                <TextEditor
                  language="plaintext"
                  value={draftManualPayloads}
                  onChange={(value) => setDraftManualPayloads(value ?? '')}
                  options={{
                    lineNumbers: 'off',
                    scrollBeyondLastLine: false,
                    wordWrap: 'off',
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="import" className="mt-3">
              <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.list,.csv" onChange={loadPayloadFile} />
              <div className="mb-2 flex gap-2">
                <Button variant="outline" size="xs" className="flex-1 gap-1" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="h-3.5 w-3.5" />
                  File
                </Button>
                <Button variant="outline" size="xs" className="flex-1" onClick={loadBundledPayloads}>
                  Bundled
                </Button>
              </div>
              <PayloadChecklist
                payloads={draftImportedPayloads}
                selectedPayloads={draftSelectedPayloads}
                emptyText="No imported payloads yet."
                onTogglePayload={toggleDraftPayload}
              />
            </TabsContent>

            <TabsContent value="predefined" className="mt-3">
              <PayloadChecklist
                payloads={[...config.predefinedPayloads]}
                selectedPayloads={draftSelectedPayloads}
                onTogglePayload={toggleDraftPayload}
              />
            </TabsContent>
          </Tabs>

          {draftPayloadMode !== 'manual' && draftAllPayloads.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{draftSelectedPayloads.size} selected</span>
              <Button variant="ghost" size="xs" className="h-7 px-2" onClick={selectAllPayloads}>
                {draftSelectedPayloads.size === draftAllPayloads.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="xs" onClick={() => setPayloadDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="xs" onClick={savePayloadConfig}>
              Save Config
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PayloadChecklistProps {
  payloads: string[];
  selectedPayloads: Set<string>;
  emptyText?: string;
  onTogglePayload: (payload: string) => void;
}

function PayloadChecklist({ payloads, selectedPayloads, emptyText = 'No payloads available.', onTogglePayload }: PayloadChecklistProps) {
  return (
    <ScrollArea className="h-[226px] rounded-md border">
      {payloads.length === 0 ? (
        <p className="p-3 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="flex flex-col p-1">
          {payloads.map((payload) => (
            <label key={payload} className="flex cursor-pointer items-start gap-2 rounded p-2 hover:bg-muted/50">
              <Checkbox checked={selectedPayloads.has(payload)} onCheckedChange={() => onTogglePayload(payload)} />
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={payload}>{payload}</span>
            </label>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

function StatusBadge({ result }: { result: TestResult }) {
  if (!result.success) {
    return (
      <Badge variant="destructive" className="justify-center gap-1">
        Error
      </Badge>
    );
  }

  if (result.isAnomaly) {
    return (
      <Badge variant="destructive" className="justify-center gap-1">
        {result.status}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="justify-center gap-1">
      <CheckCircle className="h-3 w-3" />
      {result.status}
    </Badge>
  );
}

export function PromptInjectionTool() {
  return <AIPayloadTester tool="prompt-injection" />;
}
