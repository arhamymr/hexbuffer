import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface Finding {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  filePath: string;
  line?: number;
  column?: number;
  snippet: string;
  matchText: string;
  ruleId: string;
}

export interface AiExplanation {
  findingId: string;
  explanation: string;
  fixSuggestion: string;
  aiSeverity?: string;
  severityRationale?: string;
}

export interface ScanResult {
  scanRoot: string;
  filesScanned: number;
  findings: Finding[];
  durationMs: number;
}

export interface AuditResult {
  scanResult: ScanResult;
  explanations: Record<string, AiExplanation>;
  provider: string;
  model: string;
}

type ScanStatus = 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error';

interface CodeAuditState {
  // Scan state
  scanStatus: ScanStatus;
  scanError: string | null;
  directoryPath: string;

  // Results
  findings: Finding[];
  explanations: Record<string, AiExplanation>;
  selectedFindingId: string | null;
  filesScanned: number;
  durationMs: number;

  // Progress
  totalFindings: number;
  aiAnalyzed: number;
  scanPhase: string;
  scanLog: string[];
  totalFiles: number;

  // TODO: Filters
  severityFilter: Set<string>;

  // Actions
  setDirectoryPath: (path: string) => void;
  startAudit: () => Promise<void>;
  stopAudit: () => Promise<void>;
  selectFinding: (id: string | null) => void;
  generateReport: () => Promise<string | null>;
  reset: () => void;

  // Internal
  _unlisten: UnlistenFn | null;
}

export const useCodeAuditStore = create<CodeAuditState>()((set, get) => ({
  scanStatus: 'idle',
  scanError: null,
  directoryPath: '',
  findings: [],
  explanations: {},
  selectedFindingId: null,
  filesScanned: 0,
  durationMs: 0,
  totalFindings: 0,
  aiAnalyzed: 0,
  scanPhase: '',
  scanLog: [],
  totalFiles: 0,
  severityFilter: new Set(),
  _unlisten: null,

  setDirectoryPath: (path) => set({ directoryPath: path }),

  startAudit: async () => {
    const { directoryPath } = get();
    if (!directoryPath) return;

    // Reset state
    set({
      scanStatus: 'scanning',
      scanError: null,
      findings: [],
      explanations: {},
      selectedFindingId: null,
      filesScanned: 0,
      durationMs: 0,
      totalFindings: 0,
      aiAnalyzed: 0,
      scanPhase: '',
      scanLog: [],
      totalFiles: 0,
    });

    // Collect cleanup functions for all listeners
    const unlisteners: UnlistenFn[] = [];

    const addListener = async <T>(event: string, handler: (event: { payload: T }) => void) => {
      const u = await listen<T>(event, handler);
      unlisteners.push(u);
    };

    // Per-file scan progress
    await addListener<{ file: string; phase: string; filesScanned: number; totalFiles: number }>('audit:scanning-file', (event) => {
      const line = `[${event.payload.phase}] ${event.payload.file}`;
      set((state) => {
        const newLog = [...state.scanLog, line];
        if (newLog.length > 500) newLog.splice(0, newLog.length - 500);
        return {
          scanLog: newLog,
          filesScanned: event.payload.filesScanned,
          totalFiles: event.payload.totalFiles || state.totalFiles,
        };
      });
    });

    // Total file count for progress bar
    await addListener<{ total: number; phase: string }>('audit:scan-total', (event) => {
      set({ totalFiles: event.payload.total });
    });

    // Phase transitions
    await addListener<{ phase: string; message: string }>('audit:scan-phase', (event) => {
      set({ scanPhase: event.payload.phase });
      set((state) => ({ scanLog: [...state.scanLog, `→ ${event.payload.message}`] }));
    });

    // Scan complete — findings are ready
    await addListener<{ findings: Finding[]; filesScanned: number; durationMs: number }>('audit:scan-finished', (event) => {
      set({
        findings: event.payload.findings,
        filesScanned: event.payload.filesScanned,
        durationMs: event.payload.durationMs,
        totalFindings: event.payload.findings.length,
      });
    });

    // AI phase starts
    await addListener<{ totalFindings: number; provider: string; model: string }>('audit:ai-started', () => {
      set({ scanStatus: 'analyzing' });
    });

    // AI streaming
    await addListener('audit:finding-delta', () => {});

    // Per-finding AI complete
    await addListener<{ findingId: string; aiAnalyzed: number }>('audit:finding-explained', (event) => {
      set({ aiAnalyzed: event.payload.aiAnalyzed });
    });

    // Final results
    await addListener<{
      explanations: Record<string, AiExplanation>;
      totalFindings: number;
      aiAnalyzed: number;
      durationMs: number;
      filesScanned: number;
    }>('audit:results', (event) => {
      set({
        scanStatus: 'complete',
        explanations: event.payload.explanations,
        totalFindings: event.payload.totalFindings,
        aiAnalyzed: event.payload.aiAnalyzed,
        durationMs: event.payload.durationMs,
        filesScanned: event.payload.filesScanned,
      });
    });

    // Completion
    await addListener<{ cancelled?: boolean }>('audit:finished', (event) => {
      if (!event.payload.cancelled) set({ scanStatus: 'complete' });
      for (const u of unlisteners) u();
    });

    // Errors
    await addListener<{ error: string }>('audit:failed', (event) => {
      set({ scanStatus: 'error', scanError: event.payload.error });
      for (const u of unlisteners) u();
    });

    await addListener<{ error: string }>('audit:ai-failed', () => {
      set({ scanStatus: 'complete' });
      for (const u of unlisteners) u();
    });

    // Fire-and-forget: returns immediately, events drive the rest
    try {
      await invoke('audit_directory', { path: directoryPath });
    } catch (error) {
      set({ scanStatus: 'error', scanError: String(error) });
      for (const u of unlisteners) u();
    }
  },

  stopAudit: async () => {
    try {
      await invoke('stop_audit');
    } catch (error) {
      console.error('Failed to stop audit:', error);
    }
  },

  selectFinding: (id) => set({ selectedFindingId: id }),

  generateReport: async () => {
    const { findings, explanations, directoryPath, filesScanned, durationMs } = get();
    if (findings.length === 0) return null;

    try {
      const report = await invoke<string>('generate_audit_report', {
        path: directoryPath,
        findingsJson: JSON.stringify(findings),
        explanationsJson: JSON.stringify(explanations),
        filesScanned,
        durationMs,
      });
      return report;
    } catch (error) {
      console.error('Failed to generate report:', error);
      return null;
    }
  },

  reset: () => set({
    scanStatus: 'idle',
    scanError: null,
    findings: [],
    explanations: {},
    selectedFindingId: null,
    filesScanned: 0,
    durationMs: 0,
    totalFindings: 0,
    aiAnalyzed: 0,
    scanPhase: '',
    scanLog: [],
    totalFiles: 0,
  }),
}));
