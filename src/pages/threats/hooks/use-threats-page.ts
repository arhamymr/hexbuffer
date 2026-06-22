import * as React from 'react';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { THREAT_TABS } from '../constants';
import {
  cancelThreatAnalysis,
  deleteThreatSample,
  getThreatAnalysis,
  importThreatSample,
  listThreatSamples,
  startThreatAnalysis,
} from '../api';
import type {
  ThreatAnalysisLogEvent,
  ThreatAnalysisResult,
  ThreatAnalysisRun,
  ThreatSample,
} from '../types';

interface ThreatAnalysisFailedEvent {
  sampleId: string;
  error: string;
  result?: ThreatAnalysisResult | null;
}

function logsFromResult(result: ThreatAnalysisResult | null, sampleId: string): ThreatAnalysisLogEvent[] {
  const run = result?.latestRun;
  return (run?.logs ?? []).map((message, index) => ({
    sampleId,
    runId: run?.id ?? 'latest',
    message,
    timestamp: run?.startedAt ?? new Date(index).toISOString(),
  }));
}

export function useThreatsPage() {
  const [activeTabId, setActiveTabId] = React.useState(THREAT_TABS[0].id);
  const [samples, setSamples] = React.useState<ThreatSample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<ThreatAnalysisResult | null>(null);
  const [analysisLogs, setAnalysisLogs] = React.useState<ThreatAnalysisLogEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [runningSampleId, setRunningSampleId] = React.useState<string | null>(null);
  const [runGhidra, setRunGhidra] = React.useState(false);
  const [yaraRulesPath, setYaraRulesPath] = React.useState<string | undefined>();
  const [search, setSearch] = React.useState('');

  const loadSamples = React.useCallback(async () => {
    const next = await listThreatSamples();
    setSamples(next);
    setSelectedSampleId((current) => current ?? next[0]?.id ?? null);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadSamples()
      .catch((error) => {
        console.error('Failed to load threat samples:', error);
        toast.error(`Failed to load threat samples: ${error}`);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadSamples]);

  React.useEffect(() => {
    if (!selectedSampleId) {
      setAnalysis(null);
      setAnalysisLogs([]);
      return;
    }

    getThreatAnalysis(selectedSampleId)
      .then((result) => {
        setAnalysis(result);
        setAnalysisLogs(logsFromResult(result, selectedSampleId));
      })
      .catch((error) => {
        console.error('Failed to load threat analysis:', error);
        toast.error(`Failed to load threat analysis: ${error}`);
      });
  }, [selectedSampleId]);

  React.useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let mounted = true;

    async function wireEvents() {
      try {
        unlisteners.push(await listen<ThreatAnalysisRun>('threats:analysis-started', (event) => {
          if (!mounted) return;
          setRunningSampleId(event.payload.sampleId);
          setAnalysisLogs([]);
          setAnalysis((current) => {
            if (!current || current.sample.id !== event.payload.sampleId) return current;
            return { ...current, latestRun: event.payload };
          });
        }));

        unlisteners.push(await listen<ThreatAnalysisLogEvent>('threats:analysis-log', (event) => {
          if (!mounted) return;
          setAnalysisLogs((current) => {
            if (selectedSampleId && event.payload.sampleId !== selectedSampleId) {
              return current;
            }
            return [...current, event.payload].slice(-200);
          });
        }));

        unlisteners.push(await listen<ThreatAnalysisResult>('threats:analysis-completed', (event) => {
          if (!mounted) return;
          setRunningSampleId((current) => current === event.payload.sample.id ? null : current);
          setAnalysis((current) => current?.sample.id === event.payload.sample.id ? event.payload : current);
          setAnalysisLogs(logsFromResult(event.payload, event.payload.sample.id));
          void loadSamples();
          toast.success('Threat analysis completed');
        }));

        unlisteners.push(await listen<ThreatAnalysisFailedEvent>('threats:analysis-failed', (event) => {
          if (!mounted) return;
          setRunningSampleId((current) => current === event.payload.sampleId ? null : current);
          if (event.payload.result) {
            setAnalysis((current) => current?.sample.id === event.payload.sampleId ? event.payload.result ?? current : current);
            setAnalysisLogs(logsFromResult(event.payload.result, event.payload.sampleId));
          }
          toast.error(`Threat analysis failed: ${event.payload.error}`);
        }));

        unlisteners.push(await listen<ThreatAnalysisFailedEvent>('threats:analysis-cancelled', (event) => {
          if (!mounted) return;
          setRunningSampleId((current) => current === event.payload.sampleId ? null : current);
          if (event.payload.result) {
            setAnalysis((current) => current?.sample.id === event.payload.sampleId ? event.payload.result ?? current : current);
            setAnalysisLogs(logsFromResult(event.payload.result, event.payload.sampleId));
          }
          toast.message('Threat analysis cancelled');
        }));
      } catch (error) {
        if (mounted) {
          console.warn('[threats] Tauri event listeners are unavailable in this runtime.', error);
        }
      }
    }

    wireEvents();

    return () => {
      mounted = false;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [loadSamples, selectedSampleId]);

  const selectedSample = React.useMemo(
    () => samples.find((sample) => sample.id === selectedSampleId) ?? null,
    [samples, selectedSampleId],
  );

  const handleImportSample = React.useCallback(async () => {
    const selected = await open({
      multiple: false,
      title: 'Import threat sample',
    });
    if (!selected || Array.isArray(selected)) return;

    try {
      const sample = await importThreatSample(selected);
      setSamples((current) => [sample, ...current]);
      setSelectedSampleId(sample.id);
      toast.success(`Imported ${sample.fileName}`);
    } catch (error) {
      console.error('Failed to import sample:', error);
      toast.error(`Failed to import sample: ${error}`);
    }
  }, []);

  const handleAnalyze = React.useCallback(async () => {
    if (!selectedSampleId) return;

    try {
      const run = await startThreatAnalysis(selectedSampleId, {
        runGhidra,
        yaraRulesPath,
      });
      setRunningSampleId(selectedSampleId);
      setAnalysisLogs([]);
      setAnalysis((current) => current ? { ...current, latestRun: run } : current);
      toast.success('Threat analysis started');
    } catch (error) {
      console.error('Threat analysis failed:', error);
      toast.error(`Threat analysis failed: ${error}`);
      const result = await getThreatAnalysis(selectedSampleId).catch(() => null);
      setAnalysis(result);
      setAnalysisLogs(logsFromResult(result, selectedSampleId));
    }
  }, [loadSamples, runGhidra, selectedSampleId, yaraRulesPath]);

  const handleCancelAnalysis = React.useCallback(async () => {
    if (!runningSampleId) return;

    try {
      await cancelThreatAnalysis(runningSampleId);
      toast.message('Cancellation requested');
    } catch (error) {
      console.error('Failed to cancel analysis:', error);
      toast.error(`Failed to cancel analysis: ${error}`);
    }
  }, [runningSampleId]);

  const handleChooseYaraRules = React.useCallback(async () => {
    const selected = await open({
      multiple: false,
      title: 'Choose YARA rules',
      filters: [
        { name: 'YARA Rules', extensions: ['yar', 'yara'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (!selected || Array.isArray(selected)) return;
    setYaraRulesPath(selected);
  }, []);

  const handleDeleteSample = React.useCallback(async () => {
    if (!selectedSampleId) return;

    try {
      await deleteThreatSample(selectedSampleId);
      setSamples((current) => {
        const next = current.filter((sample) => sample.id !== selectedSampleId);
        setSelectedSampleId(next[0]?.id ?? null);
        return next;
      });
      setAnalysis(null);
      toast.success('Threat sample deleted');
    } catch (error) {
      console.error('Failed to delete sample:', error);
      toast.error(`Failed to delete sample: ${error}`);
    }
  }, [selectedSampleId]);

  const analyzing = runningSampleId === selectedSampleId;

  const workspaceProps = {
    samples,
    selectedSample,
    selectedSampleId,
    setSelectedSampleId,
    analysis,
    analysisLogs,
    loading,
    analyzing,
    runGhidra,
    setRunGhidra,
    yaraRulesPath,
    search,
    setSearch,
    handleAnalyze,
    handleCancelAnalysis,
    handleDeleteSample,
    handleChooseYaraRules,
    handleImportSample,
  };

  return {
    tabs: THREAT_TABS,
    activeTabId,
    setActiveTabId,
    workspaceProps,
    ...workspaceProps,
  };
}
