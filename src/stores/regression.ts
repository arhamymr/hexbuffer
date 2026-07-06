import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { TestCase, TestRun, StepResult, AiVerdict, RegressionLogEntry } from '@/pages/regression/types';

function normalizeTestCase(testCase: TestCase): TestCase {
  return {
    ...testCase,
    testName: testCase.testName || 'Default Test',
    name: testCase.name || 'New Test Case',
    description: testCase.description || '',
    targetUrl: testCase.targetUrl || '',
    steps: testCase.steps || [],
    enabled: testCase.enabled ?? true,
  };
}

interface RegressionState {
  testCases: TestCase[];
  runs: Record<string, TestRun[]>; // testCaseId → runs
  activeRun: { testCaseId: string; runId: string; status: string } | null;
  liveSteps: StepResult[];
  logs: RegressionLogEntry[];
  queue: string[];

  // Actions
  loadTestCases: () => Promise<void>;
  saveTestCase: (tc: TestCase) => Promise<TestCase>;
  deleteTestCase: (id: string) => Promise<void>;
  runTest: (testCaseId: string) => Promise<{ runId: string }>;
  loadRuns: (testCaseId: string) => Promise<void>;
  clearLogs: () => void;
  runSingleStep: (testCaseId: string, stepIndex: number) => Promise<StepResult | null>;
  runAll: (testCaseIds: string[]) => Promise<void>;
  stopQueue: () => void;

  // Internal
  _startListening: () => Promise<void>;
  _stopListening: () => void;
}

let unlisteners: Array<() => void> = [];
let listening = false;

export const useRegressionStore = create<RegressionState>()((set, get) => ({
  testCases: [],
  runs: {},
  activeRun: null,
  liveSteps: [],
  logs: [],
  queue: [],

  loadTestCases: async () => {
    const cases = await invoke<TestCase[]>('list_regression_test_cases');
    set({
      testCases: cases.map(normalizeTestCase),
    });
  },

  saveTestCase: async (tc) => {
    const normalized = normalizeTestCase(tc);
    const saved = await invoke<TestCase>('save_regression_test_case', {
      testCase: {
        id: normalized.id,
        testName: normalized.testName,
        name: normalized.name,
        description: normalized.description,
        targetUrl: normalized.targetUrl,
        steps: normalized.steps,
        enabled: normalized.enabled,
      },
    });
    const normalizedSaved = normalizeTestCase(saved);
    const testCases = get().testCases.map((c) => (c.id === normalizedSaved.id ? normalizedSaved : c));
    if (!testCases.find((c) => c.id === normalizedSaved.id)) {
      testCases.unshift(normalizedSaved);
    }
    set({ testCases });
    return normalizedSaved;
  },

  deleteTestCase: async (id) => {
    await invoke('delete_regression_test_case', { id });
    const testCases = get().testCases.filter((c) => c.id !== id);
    const runs = { ...get().runs };
    delete runs[id];
    set({ testCases, runs });
  },

  runTest: async (testCaseId) => {
    const result = await invoke<{ runId: string }>('run_regression_test', {
      testCaseId,
    });

    // Start listening for progress events
    await get()._startListening();

    set({
      activeRun: { testCaseId, runId: result.runId, status: 'queued' },
      liveSteps: [],
      logs: [],
    });

    return result;
  },

  loadRuns: async (testCaseId) => {
    const runs = await invoke<TestRun[]>('list_regression_runs', {
      testCaseId,
    });
    set({ runs: { ...get().runs, [testCaseId]: runs } });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  runSingleStep: async (testCaseId, stepIndex) => {
    const tc = get().testCases.find((c) => c.id === testCaseId);
    if (!tc) return null;

    const step = tc.steps[stepIndex];
    if (!step) return null;

    try {
      const result = await invoke<StepResult>('run_regression_step', {
        stepJson: step,
        targetUrl: tc.targetUrl,
      });
      return result;
    } catch (error) {
      console.error('Failed to run single step:', error);
      return null;
    }
  },

  runAll: async (testCaseIds) => {
    if (testCaseIds.length === 0) return;
    const [firstId, ...rest] = testCaseIds;
    set({ queue: rest });
    await get().runTest(firstId);
  },

  stopQueue: () => {
    set({ queue: [] });
  },

  _startListening: async () => {
    if (listening) return;
    listening = true;

    const u1 = await listen<{ runId: string; testCaseId: string; targetUrl: string; stepCount: number }>(
      'regression:test-started',
      (event) => {
        const activeRun = get().activeRun;
        if (!activeRun || activeRun.runId !== event.payload.runId) return;

        set((s) => ({
          activeRun: s.activeRun
            ? { ...s.activeRun, status: 'running' }
            : null,
        }));
      }
    );

    const u2 = await listen<{ runId: string; stepIndex: number; kind: string }>(
      'regression:step-started',
      (event) => {
        const activeRun = get().activeRun;
        if (!activeRun || activeRun.runId !== event.payload.runId) return;

        const step: StepResult = {
          stepIndex: event.payload.stepIndex,
          kind: event.payload.kind as StepResult['kind'],
          status: 'running',
          error: null,
          screenshotPath: null,
          durationMs: 0,
          startedAt: new Date().toISOString(),
          finishedAt: null,
        };
        set((s) => ({ liveSteps: [...s.liveSteps, step] }));
      }
    );

    const u3 = await listen<{ runId: string; stepIndex: number; kind: string; durationMs: number; screenshotPath: string | null }>(
      'regression:step-completed',
      (event) => {
        const activeRun = get().activeRun;
        if (!activeRun || activeRun.runId !== event.payload.runId) return;

        set((s) => ({
          liveSteps: s.liveSteps.map((st) =>
            st.stepIndex === event.payload.stepIndex
              ? { ...st, status: 'passed', durationMs: event.payload.durationMs, screenshotPath: event.payload.screenshotPath, finishedAt: new Date().toISOString() }
              : st
          ),
        }));
      }
    );

    const u4 = await listen<{ runId: string; stepIndex: number; kind: string; error: string; screenshotPath: string | null }>(
      'regression:step-failed',
      (event) => {
        const activeRun = get().activeRun;
        if (!activeRun || activeRun.runId !== event.payload.runId) return;

        set((s) => ({
          liveSteps: s.liveSteps.map((st) =>
            st.stepIndex === event.payload.stepIndex
              ? { ...st, status: 'failed', error: event.payload.error, screenshotPath: event.payload.screenshotPath, finishedAt: new Date().toISOString() }
              : st
          ),
        }));
      }
    );

    const u5 = await listen<{ runId: string; status: string; passedSteps: number; failedSteps: number; aiVerdict: AiVerdict | null }>(
      'regression:test-finished',
      (event) => {
        const activeRun = get().activeRun;
        if (!activeRun || activeRun.runId !== event.payload.runId) return;

        set((s) => ({
          activeRun: s.activeRun
            ? { ...s.activeRun, status: event.payload.status }
            : null,
        }));
        // Reload runs for the test case
        get().loadRuns(activeRun.testCaseId);

        // Process next item in queue after a tiny delay
        setTimeout(() => {
          const nextQueue = get().queue;
          if (nextQueue.length > 0) {
            const nextCaseId = nextQueue[0];
            set({ queue: nextQueue.slice(1) });
            get().runTest(nextCaseId);
          }
        }, 100);
      }
    );

    const u6 = await listen<{ runId: string; error: string }>(
      'regression:test-failed',
      (event) => {
        const activeRun = get().activeRun;
        if (!activeRun || activeRun.runId !== event.payload.runId) return;

        set((s) => ({
          activeRun: s.activeRun
            ? { ...s.activeRun, status: 'failed' }
            : null,
        }));

        // Process next item in queue after a tiny delay
        setTimeout(() => {
          const nextQueue = get().queue;
          if (nextQueue.length > 0) {
            const nextCaseId = nextQueue[0];
            set({ queue: nextQueue.slice(1) });
            get().runTest(nextCaseId);
          }
        }, 100);
      }
    );

    const u7 = await listen<{ runId?: string; level?: string; logType?: string; message?: string; url?: string; createdAt?: string }>(
      'regression:log-created',
      (event) => {
        const activeRun = get().activeRun;
        if (event.payload.runId && activeRun && event.payload.runId !== activeRun.runId) return;

        set((s) => ({
          logs: [...s.logs, {
            id: crypto.randomUUID(),
            runId: event.payload.runId || '',
            level: (event.payload.level as 'info' | 'warning' | 'error') || 'info',
            logType: event.payload.logType || 'regression',
            message: event.payload.message || '',
            url: event.payload.url || undefined,
            createdAt: event.payload.createdAt || new Date().toISOString(),
          }],
        }));
      }
    );

    unlisteners = [u1, u2, u3, u4, u5, u6, u7];
  },

  _stopListening: () => {
    for (const u of unlisteners) {
      u();
    }
    unlisteners = [];
    listening = false;
  },
}));
