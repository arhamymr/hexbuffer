import * as React from 'react';
import { useBruteForceStore } from '@/stores/bruto-force';
import { findRequestPayloadPositions, parseRawRequest, type AttackResult } from '../types';
import { downloadResults, filterResults } from '../lib/utils';

export function useBruteForcePage() {
  const {
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
    setBaseRequest,
    results,
    isRunning,
    progress,
    selectedResult,
    setSelectedResult,
    startAttack,
    stopAttack,
    clearResults,
    pendingRequest,
    setPendingRequest,
  } = useBruteForceStore();

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
  }, [config.base_request, pendingRequest, setBaseRequest, setPendingRequest, updateConfig]);

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
      updatePayloadValues(values);
    };
    reader.readAsText(file);
  }, [updatePayloadValues]);

  const handleParseRawRequest = React.useCallback(() => {
    const parsed = parseRawRequest(rawRequestContent);
    if (parsed) {
      setBaseRequest(parsed as typeof config.base_request);
      updateConfig({ positions: findRequestPayloadPositions(parsed) });
    }
    setRawRequestDialogOpen(false);
    setRawRequestContent('');
  }, [config.base_request, rawRequestContent, setBaseRequest, updateConfig]);

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
    selectedResult,
    setSelectedResult,
    startAttack,
    stopAttack,
    clearResults,
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
    handleParseRawRequest,
    handleExportResults,
  };
}
