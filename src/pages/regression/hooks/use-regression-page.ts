import React from 'react';
import { useRegressionStore } from '@/stores/regression';
import { useShallow } from 'zustand/react/shallow';
import type { StepResult, TestCase } from '../types';
import type { PageTabItem } from '@/components/tabs-layout/types';

interface RegressionTab {
  id: string;
  testCaseId: string | null; // null for unsaved new test case
  isEditing: boolean;
  editingCase: TestCase | null;
  isNew: boolean;
}

function makeTabId(): string {
  return crypto.randomUUID();
}

export function useRegressionPage() {
  const {
    testCases,
    runs,
    activeRun,
    liveSteps,
    logs,
    loadTestCases,
    saveTestCase,
    deleteTestCase,
    runTest,
    runSingleStep,
    loadRuns,
    clearLogs,
  } = useRegressionStore(
    useShallow((s) => ({
      testCases: s.testCases,
      runs: s.runs,
      activeRun: s.activeRun,
      liveSteps: s.liveSteps,
      logs: s.logs,
      loadTestCases: s.loadTestCases,
      saveTestCase: s.saveTestCase,
      deleteTestCase: s.deleteTestCase,
      runTest: s.runTest,
      runSingleStep: s.runSingleStep,
      loadRuns: s.loadRuns,
      clearLogs: s.clearLogs,
    }))
  );

  const [tabs, setTabs] = React.useState<RegressionTab[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);

  // Load test cases on mount
  React.useEffect(() => {
    loadTestCases();
  }, [loadTestCases]);

  // Ensure at least one default tab always exists
  React.useEffect(() => {
    if (tabs.length === 0 && testCases.length > 0) {
      const nextTabs = testCases.map((testCase) => ({
        id: makeTabId(),
        testCaseId: testCase.id,
        isEditing: false,
        editingCase: null,
        isNew: false,
      }));
      setTabs(nextTabs);
      setActiveTabId(nextTabs[0]?.id ?? null);
    }
  }, [testCases, tabs.length]);

  // Load runs when active tab's test case changes
  const activeTab = React.useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );

  React.useEffect(() => {
    if (activeTab?.testCaseId) {
      loadRuns(activeTab.testCaseId);
    }
  }, [activeTab?.testCaseId, loadRuns]);

  const activeTabTestCaseId = activeTab?.testCaseId ?? null;
  const selectedCase = testCases.find((c) => c.id === activeTabTestCaseId) || null;
  const selectedRuns = activeTabTestCaseId ? runs[activeTabTestCaseId] || [] : [];
  const totalRuns = React.useMemo(
    () => Object.values(runs).reduce((total, testRuns) => total + testRuns.length, 0),
    [runs],
  );

  // Build PageTabItem array for TabbedPageLayout
  const pageTabs: PageTabItem[] = React.useMemo(
    () =>
      tabs.map((tab) => {
        const tc = tab.editingCase || testCases.find((c) => c.id === tab.testCaseId);
        return {
          id: tab.id,
          name: tc?.name || 'New Test Case',
          closable: true,
          status:
            activeRun?.testCaseId && activeRun.testCaseId === tab.testCaseId
              ? {
                  kind: activeRun.status === 'running' || activeRun.status === 'queued' ? 'running' : 'ready',
                  label: `Test ${activeRun.status}`,
                }
              : undefined,
        };
      }),
    [tabs, testCases, activeRun],
  );

  // Open or switch to a tab for a given test case (viewing mode)
  const openTestCase = React.useCallback((testCaseId: string) => {
    setTabs((prev) => {
      const existing = prev.find((t) => t.testCaseId === testCaseId && !t.isEditing);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const tabId = makeTabId();
      const newTab: RegressionTab = {
        id: tabId,
        testCaseId,
        isEditing: false,
        editingCase: null,
        isNew: false,
      };
      setActiveTabId(tabId);
      return [...prev, newTab];
    });
  }, []);

  // Create a new test case tab in editing mode
  const handleCreate = React.useCallback(() => {
    const newCase: TestCase = {
      id: crypto.randomUUID(),
      testName: selectedCase?.testName || 'New Test',
      name: 'New Test Case',
      description: '',
      targetUrl: '',
      steps: [],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const tabId = makeTabId();
    const newTab: RegressionTab = {
      id: tabId,
      testCaseId: null,
      isEditing: true,
      editingCase: newCase,
      isNew: true,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
  }, [selectedCase?.testName]);

  // Edit the test case — converts existing viewing tab to edit mode, or creates a new edit tab
  const handleEdit = React.useCallback((tc: TestCase) => {
    setTabs((prev) => {
      // Check if there's already a viewing tab for this test case — convert it
      const existingViewTab = prev.find((t) => t.testCaseId === tc.id && !t.isEditing);
      if (existingViewTab) {
        setActiveTabId(existingViewTab.id);
        return prev.map((t) =>
          t.id === existingViewTab.id
            ? { ...t, isEditing: true, editingCase: { ...tc }, isNew: false }
            : t,
        );
      }
      // Otherwise create a new edit tab
      const tabId = makeTabId();
      setActiveTabId(tabId);
      return [
        ...prev,
        { id: tabId, testCaseId: tc.id, isEditing: true, editingCase: { ...tc }, isNew: false },
      ];
    });
  }, []);

  // FloppyDisk: persist and convert tab to viewing mode
  const handleSave = React.useCallback(
    async (tc: TestCase) => {
      const saved = await saveTestCase(tc);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, testCaseId: saved.id, isEditing: false, editingCase: null, isNew: false }
            : t,
        ),
      );
    },
    [saveTestCase, activeTabId],
  );

  const handleDraftChange = React.useCallback(
    (tc: TestCase) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId && t.isEditing
            ? { ...t, editingCase: tc }
            : t,
        ),
      );
    },
    [activeTabId],
  );

  // Cancel edit: revert tab to viewing mode (or close if new)
  const handleCancelEdit = React.useCallback(() => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === activeTabId);
      if (!tab) return prev;
      if (tab.isNew) {
        // Remove new unsaved tab and keep focus on a remaining tab.
        const idx = prev.findIndex((t) => t.id === activeTabId);
        const next = prev.filter((t) => t.id !== activeTabId);
        if (next.length > 0) {
          setActiveTabId(next[Math.min(idx, next.length - 1)].id);
        } else {
          setActiveTabId(null);
        }
        return next;
      }
      // Revert to viewing mode
      return prev.map((t) =>
        t.id === activeTabId ? { ...t, isEditing: false, editingCase: null, isNew: false } : t,
      );
    });
  }, [activeTabId]);

  // Delete test case and close its tabs
  const handleDelete = React.useCallback(
    async (id: string) => {
      await deleteTestCase(id);
      setTabs((prev) => {
        const next = prev.filter((t) => t.testCaseId !== id);
        if (activeTab?.testCaseId === id) {
          setActiveTabId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [deleteTestCase, activeTab?.testCaseId],
  );

  // Close a tab
  const handleCloseTab = React.useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        const next = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId && next.length > 0) {
          const newIdx = Math.min(idx, next.length - 1);
          setActiveTabId(next[newIdx].id);
        } else if (next.length === 0) {
          setActiveTabId(null);
        }
        return next;
      });
    },
    [activeTabId],
  );

  // Rename a tab — updates the test case name and persists immediately
  const handleRenameTab = React.useCallback(
    (tabId: string, name: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          if (t.editingCase) {
            return { ...t, editingCase: { ...t.editingCase, name } };
          }
          // Viewing tab — persist rename directly
          const tc = testCases.find((c) => c.id === t.testCaseId);
          if (tc) {
            saveTestCase({ ...tc, name, updatedAt: new Date().toISOString() });
          }
          return t;
        }),
      );
    },
    [testCases, saveTestCase],
  );

  // Add a new tab via the "+" button
  const handleAddTab = React.useCallback(() => {
    handleCreate();
  }, [handleCreate]);

  const handleRun = React.useCallback(
    async (testCaseId: string) => {
      await runTest(testCaseId);
    },
    [runTest],
  );

  // Derived state that index.tsx previously computed inline
  const isRunning = activeRun?.status === 'running' || activeRun?.status === 'queued';
  const activeTabTestCase =
    activeTab?.editingCase ||
    testCases.find((tc) => tc.id === activeTab?.testCaseId) ||
    null;
  const activeTestName = activeTabTestCase?.testName || 'Regression tests';
  const activeTestCases = testCases.filter((tc) => tc.testName === activeTestName);
  const activeTabRunCount = activeTab?.testCaseId ? runs[activeTab.testCaseId]?.length || 0 : 0;
  const enabledCount = testCases.filter((tc) => tc.enabled).length;
  const activeTestEnabledCount = activeTestCases.filter((tc) => tc.enabled).length;

  // Single-step execution state
  const [runningStepIndex, setRunningStepIndex] = React.useState<number | null>(null);
  const [singleStepResults, setSingleStepResults] = React.useState<Record<number, StepResult>>({});

  const handleRunStep = React.useCallback(
    async (stepIndex: number) => {
      if (!activeTabTestCase) return;
      setRunningStepIndex(stepIndex);
      try {
        const result = await runSingleStep(activeTabTestCase.id, stepIndex);
        if (result) {
          setSingleStepResults((prev) => ({ ...prev, [stepIndex]: result }));
        }
      } finally {
        setRunningStepIndex(null);
      }
    },
    [activeTabTestCase, runSingleStep],
  );

  const handleRunAllInActiveTest = React.useCallback(async () => {
    const runnableCases = activeTestCases.filter((tc) => tc.enabled && tc.steps.length > 0);
    for (const tc of runnableCases) {
      await runTest(tc.id);
    }
  }, [activeTestCases, runTest]);

  // Enriched internal tabs for rendering
  const enrichedInternalTabs = React.useMemo(
    () =>
      tabs.map((tab) => {
        const tabTestCase =
          tab.editingCase || testCases.find((c) => c.id === tab.testCaseId) || null;
        const tabRuns = tab.testCaseId ? runs[tab.testCaseId] || [] : [];
        const latestRun = tabRuns.length > 0 ? tabRuns[0] : null;
        return { ...tab, tabTestCase, tabRuns, latestRun };
      }),
    [tabs, testCases, runs],
  );

  return {
    testCases,
    totalRuns,
    selectedCase,
    selectedRuns,
    activeRun,
    liveSteps,
    logs,
    clearLogs,
    handleAddTab,
    activeTab,
    editingCase: activeTab?.editingCase ?? null,
    isNew: activeTab?.isNew ?? false,
    internalTabs: tabs,
    enrichedInternalTabs,
    tabs: pageTabs,
    activeTabId: activeTabId || '',
    handleCreate,
    handleEdit,
    handleSave,
    handleDraftChange,
    handleDelete,
    handleRun,
    handleRunStep,
    handleRunAllInActiveTest,
    handleCancelEdit,
    openTestCase,
    handleCloseTab,
    handleRenameTab,
    setActiveTabId,
    // Derived state
    isRunning,
    activeTabTestCase,
    activeTestName,
    activeTestCases,
    activeTabRunCount,
    enabledCount,
    activeTestEnabledCount,
    runningStepIndex,
    singleStepResults,
  };
}
