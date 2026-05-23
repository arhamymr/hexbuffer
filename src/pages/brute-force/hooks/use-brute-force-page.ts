import * as React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import { useBruteForceStore } from '@/stores/bruto-force';
import { findRequestPayloadPositions, parseRawRequest, type AttackResult } from '../types';
import { downloadResults, filterResults } from '../lib/utils';

export function useBruteForcePage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    addAttackTab,
    closeTab,
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
    setSelectedResult,
    startAttack,
    stopAttack,
    clearResults,
    pendingRequest,
    setPendingRequest,
    clearStartError,
  } = useBruteForceStore();

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  );
  const config = activeTab.config;
  const results = activeTab.results;
  const isRunning = activeTab.isRunning;
  const progress = activeTab.progress;
  const startError = activeTab.startError;
  const selectedResult = activeTab.selectedResult;

  const [configDialogOpen, setConfigDialogOpen] = React.useState(false);
  const [rawRequestDialogOpen, setRawRequestDialogOpen] = React.useState(false);
  const [rawRequestContent, setRawRequestContent] = React.useState('');
  const [payloadDialogOpen, setPayloadDialogOpen] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterPayload, setFilterPayload] = React.useState('');
  const [filterGrep, setFilterGrep] = React.useState(false);

  React.useEffect(() => {
    if (!pendingRequest) {
      return;
    }

    const baseRequest = {
      ...pendingRequest,
      follow_redirects: true,
      max_hops: 10,
    } as typeof config.base_request;

    setBaseRequest(baseRequest);
    updateConfig({ positions: findRequestPayloadPositions(baseRequest) });
    setPendingRequest(null);
  }, [pendingRequest, setBaseRequest, setPendingRequest, updateConfig]);

  const filteredResults = React.useMemo(
    () =>
      filterResults(results, {
        status: filterStatus,
        payload: filterPayload,
        grepOnly: filterGrep,
      }),
    [filterGrep, filterPayload, filterStatus, results]
  );

  const handleLoadPayloads = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result as string;
      const values = content.split('\n').filter((line) => line.trim());
      updateConfig({
        payload_config: {
          ...config.payload_config,
          values,
          file_path: undefined,
        },
      });
      setPayloadDialogOpen(false);
      toast.success(`${values.length} payloads loaded`);
    };
    reader.onerror = () => toast.error('Failed to read payload file');
    reader.readAsText(file);
    event.target.value = '';
  }, [config.payload_config, updateConfig]);

  const handleSelectPayloadFile = React.useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Payload lists',
            extensions: ['txt', 'lst', 'wordlist'],
          },
          {
            name: 'All files',
            extensions: ['*'],
          },
        ],
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      const content = await readTextFile(selected);
      const values = content.split(/\r?\n/).filter((line) => line.trim());
      updateConfig({
        payload_config: {
          ...config.payload_config,
          values,
          file_path: selected,
        },
      });
      setPayloadDialogOpen(false);
      toast.success(`${values.length} payloads loaded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Failed to load payload file');
    }
  }, [config.payload_config, updateConfig]);

  const handleParseRawRequest = React.useCallback(() => {
    const parsed = parseRawRequest(rawRequestContent);
    if (parsed) {
      setBaseRequest(parsed as typeof config.base_request);
      updateConfig({ positions: findRequestPayloadPositions(parsed) });
    }
    setRawRequestDialogOpen(false);
    setRawRequestContent('');
  }, [config.base_request, rawRequestContent, setBaseRequest, updateConfig]);

  const handleStartAttack = React.useCallback(() => {
    const hasPayloads =
      config.payload_config.payload_type === 'NumberRange' ||
      config.payload_config.values.length > 0 ||
      Boolean(config.payload_config.file_path);

    if (!config.base_request.url.trim()) {
      toast.error('Add a request URL before starting');
      return;
    }

    if (!hasPayloads) {
      toast.error('Add at least one payload before starting');
      return;
    }

    const positions = findRequestPayloadPositions(config.base_request);
    if (positions.length === 0) {
      updateConfig({ positions });
      toast.error('Mark a payload position in the request before starting');
      return;
    }

    if (positions.length !== config.positions.length) {
      updateConfig({ positions });
    }

    startAttack();
  }, [config.base_request, config.payload_config, config.positions.length, startAttack, updateConfig]);

  const handleExportResults = React.useCallback((format: 'csv' | 'json') => {
    if (format === 'json') {
      downloadResults(
        `brute-force-results-${Date.now()}.json`,
        JSON.stringify(results, null, 2),
        'application/json'
      );
      return;
    }

    const headers = ['#', 'Payload Values', 'Status', 'Length', 'Time (ms)', 'Grep Match', 'Error'];
    const rows = results.map((result: AttackResult, index) => [
      index + 1,
      JSON.stringify(result.payload_values),
      result.status || '',
      result.response_length || '',
      result.response_time_ms || '',
      result.grep_match ? 'Yes' : 'No',
      result.error || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    downloadResults(`brute-force-results-${Date.now()}.csv`, csv, 'text/csv');
  }, [results]);

  return {
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name })),
    activeTabId,
    setActiveTabId,
    renameTab,
    addAttackTab,
    closeTab,
    activeTab,
    config,
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
    results,
    filteredResults,
    isRunning,
    progress,
    startError,
    selectedResult,
    setSelectedResult,
    startAttack,
    stopAttack,
    clearResults,
    clearStartError,
    configDialogOpen,
    setConfigDialogOpen,
    rawRequestDialogOpen,
    setRawRequestDialogOpen,
    rawRequestContent,
    setRawRequestContent,
    payloadDialogOpen,
    setPayloadDialogOpen,
    filterStatus,
    setFilterStatus,
    filterPayload,
    setFilterPayload,
    filterGrep,
    setFilterGrep,
    handleLoadPayloads,
    handleSelectPayloadFile,
    handleStartAttack,
    handleParseRawRequest,
    handleExportResults,
  };
}
