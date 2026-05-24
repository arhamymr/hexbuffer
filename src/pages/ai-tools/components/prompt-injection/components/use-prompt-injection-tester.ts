import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { parseRawHttpRequest } from '@/lib/http-message';
import { DEFAULT_SETTINGS, TOOL_CONFIGS } from './config';
import {
  countMarkedTargets,
  detectFindings,
  downloadFile,
  parsePayloadLines,
  replaceMarkedTargets,
} from './utils';
import type {
  AttackSettings,
  AttackType,
  PayloadMode,
  PromptInjectionRouteState,
  TestResult,
} from './types';

export function usePromptInjectionTester(tool: keyof typeof TOOL_CONFIGS) {
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
  const fileInputRef = React.useRef<HTMLInputElement>(null!);
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

  const selectAllPayloads = React.useCallback(() => {
    setDraftSelectedPayloads((current) => {
      if (current.size === draftAllPayloads.length) {
        return new Set();
      }

      return new Set(draftAllPayloads);
    });
  }, [draftAllPayloads]);

  const loadBundledPayloads = React.useCallback(() => {
    setDraftImportedPayloads([...config.importedPayloads]);
    setDraftSelectedPayloads(new Set(config.importedPayloads));
    toast.success('Bundled payloads loaded');
  }, [config.importedPayloads]);

  const loadPayloadFile = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const toggleDraftPayload = React.useCallback((payload: string) => {
    setDraftSelectedPayloads((current) => {
      const next = new Set(current);

      if (next.has(payload)) {
        next.delete(payload);
      } else {
        next.add(payload);
      }

      return next;
    });
  }, []);

  const savePayloadConfig = React.useCallback(() => {
    setPayloadMode(draftPayloadMode);
    setManualPayloads(draftManualPayloads);
    setImportedPayloads(draftImportedPayloads);
    setSelectedPayloads(new Set(draftSelectedPayloads));
    setPayloadDialogOpen(false);
    toast.success('Payload config saved');
  }, [draftImportedPayloads, draftManualPayloads, draftPayloadMode, draftSelectedPayloads]);

  const markRequestTarget = React.useCallback(() => {
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
  }, []);

  const sendRequest = React.useCallback(async (payload: string, index: number): Promise<TestResult> => {
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
  }, [attackSettings.followRedirects, attackSettings.timeout, config.responseKeywords, endpoint, requestBody, tool]);

  const runAttack = React.useCallback(async (payloads: string[]) => {
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
  }, [attackSettings.throttle, isRunning, markedTargetCount, sendRequest]);

  const stopAttack = React.useCallback(() => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setCurrentRunningIndex(-1);
  }, []);

  const clearResults = React.useCallback(() => {
    setResults([]);
    setSelectedResultId(null);
    setRunTotal(0);
  }, []);

  const copySelectedResponse = React.useCallback(async () => {
    if (!selectedResult) {
      return;
    }

    await navigator.clipboard.writeText(selectedResult.body || selectedResult.error || '');
    toast.success('Response copied');
  }, [selectedResult]);

  const exportResults = React.useCallback(() => {
    const payload = JSON.stringify(results, null, 2);
    downloadFile(payload, `${tool}-results-${Date.now()}.json`, 'application/json');
  }, [results, tool]);

  return {
    config,
    payloadMode,
    allPayloads,
    payloadsToRun,
    payloadDialogOpen,
    setPayloadDialogOpen,
    draftPayloadMode,
    setDraftPayloadMode,
    draftManualPayloads,
    setDraftManualPayloads,
    draftImportedPayloads,
    draftSelectedPayloads,
    draftAllPayloads,
    requestBody,
    setRequestBody,
    endpoint,
    setEndpoint,
    attackType,
    setAttackType,
    attackSettings,
    setAttackSettings,
    isRunning,
    results,
    currentRunningIndex,
    runTotal,
    selectedResult,
    setSelectedResultId,
    anomalyCount,
    successCount,
    markedTargetCount,
    fileInputRef,
    requestEditorRef,
    selectAllPayloads,
    loadBundledPayloads,
    loadPayloadFile,
    toggleDraftPayload,
    savePayloadConfig,
    markRequestTarget,
    runAttack,
    stopAttack,
    clearResults,
    copySelectedResponse,
    exportResults,
  };
}
