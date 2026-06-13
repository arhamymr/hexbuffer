import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { TestCase, TestRun, StepResult, AiVerdict } from '@/pages/regression/types';

interface RegressionState {
  testCases: TestCase[];
  runs: Record<string, TestRun[]>; // testCaseId → runs
  activeRun: { testCaseId: string; runId: string; status: string } | null;
  liveSteps: StepResult[];

  // Actions
  loadTestCases: () => Promise<void>;
  saveTestCase: (tc: TestCase) => Promise<TestCase>;
  deleteTestCase: (id: string) => Promise<void>;
  runTest: (testCaseId: string) => Promise<{ runId: string }>;
  loadRuns: (testCaseId: string) => Promise<void>;

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

  loadTestCases: async () => {
    const cases = await invoke<TestCase[]>('list_regression_test_cases');
    set({ testCases: cases });
  },

  saveTestCase: async (tc) => {
    const saved = await invoke<TestCase>('save_regression_test_case', {
      testCase: {
        id: tc.id,
        name: tc.name,
        description: tc.description,
        targetUrl: tc.targetUrl,
        steps: tc.steps,
        enabled: tc.enabled,
      },
    });
    const testCases = get().testCases.map((c) => (c.id === saved.id ? saved : c));
    if (!testCases.find((c) => c.id === saved.id)) {
      testCases.unshift(saved);
    }
    set({ testCases });
    return saved;
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
    });

    return result;
  },

  loadRuns: async (testCaseId) => {
    const runs = await invoke<TestRun[]>('list_regression_runs', {
      testCaseId,
    });
    set({ runs: { ...get().runs, [testCaseId]: runs } });
  },

  _startListening: async () => {
    if (listening) return;
    listening = true;

    const u1 = await listen<{ runId: string; testCaseId: string; targetUrl: string; stepCount: number }>(
      'regression:test-started',
      (event) => {
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
        set((s) => ({
          activeRun: s.activeRun
            ? { ...s.activeRun, status: event.payload.status }
            : null,
        }));
        // Reload runs for the test case
        if (get().activeRun) {
          get().loadRuns(get().activeRun!.testCaseId);
        }
      }
    );

    const u6 = await listen<{ runId: string; error: string }>(
      'regression:test-failed',
      (event) => {
        set((s) => ({
          activeRun: s.activeRun
            ? { ...s.activeRun, status: 'failed' }
            : null,
        }));
      }
    );

    unlisteners = [u1, u2, u3, u4, u5, u6];
  },

  _stopListening: () => {
    for (const u of unlisteners) {
      u();
    }
    unlisteners = [];
    listening = false;
  },
}));
