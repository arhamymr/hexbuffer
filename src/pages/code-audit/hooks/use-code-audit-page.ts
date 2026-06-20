import { useCallback, useMemo } from 'react';
import { useCodeAuditStore } from '@/stores/code-audit';
import { open } from '@tauri-apps/plugin-dialog';

export function useCodeAuditPage() {
  const store = useCodeAuditStore();

  const handleSelectDirectory = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select directory to audit',
    });

    if (selected && typeof selected === 'string') {
      store.setDirectoryPath(selected);
    }
  }, [store]);

  const handleStartAudit = useCallback(() => {
    store.startAudit();
  }, [store]);

  const selectedFinding = useMemo(() => {
    if (!store.selectedFindingId) return null;
    const finding = store.findings.find((f) => f.id === store.selectedFindingId);
    const explanation = store.explanations[store.selectedFindingId];
    return { finding: finding ?? null, explanation: explanation ?? null };
  }, [store.selectedFindingId, store.findings, store.explanations]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of store.findings) {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
    }
    return counts;
  }, [store.findings]);

  return {
    // State
    scanStatus: store.scanStatus,
    scanError: store.scanError,
    directoryPath: store.directoryPath,
    findings: store.findings,
    selectedFindingId: store.selectedFindingId,
    selectedFinding,
    filesScanned: store.filesScanned,
    durationMs: store.durationMs,
    totalFindings: store.totalFindings,
    aiAnalyzed: store.aiAnalyzed,
    scanPhase: store.scanPhase,
    scanLog: store.scanLog,
    totalFiles: store.totalFiles,
    severityCounts,

    // Actions
    handleSelectDirectory,
    handleStartAudit,
    handleStopAudit: store.stopAudit,
    handleGenerateReport: store.generateReport,
    selectFinding: store.selectFinding,
    reset: store.reset,
  };
}
