import React from 'react';
import { useRegressionStore } from '@/stores/regression';
import type { TestCase, TestStep } from '../types';
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
    loadTestCases,
    saveTestCase,
    deleteTestCase,
    runTest,
    loadRuns,
  } = useRegressionStore();

  const [tabs, setTabs] = React.useState<RegressionTab[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);

  // Load test cases on mount
  React.useEffect(() => {
    loadTestCases();
  }, [loadTestCases]);

  // Auto-select first test case into a tab
  React.useEffect(() => {
    if (tabs.length === 0 && testCases.length > 0) {
      const first = testCases[0];
      const tabId = makeTabId();
      setTabs([{ id: tabId, testCaseId: first.id, isEditing: false, editingCase: null, isNew: false }]);
      setActiveTabId(tabId);
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

  // Build PageTabItem array for TabbedPageLayout
  const pageTabs: PageTabItem[] = React.useMemo(
    () =>
      tabs.map((tab) => {
        const tc = tab.editingCase || testCases.find((c) => c.id === tab.testCaseId);
        return {
          id: tab.id,
          name: tc?.name || 'New Test Case',
          closable: true,
        };
      }),
    [tabs, testCases],
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
  }, []);

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

  // Save: persist and convert tab to viewing mode
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

  // Cancel edit: revert tab to viewing mode (or close if new)
  const handleCancelEdit = React.useCallback(() => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === activeTabId);
      if (!tab) return prev;
      if (tab.isNew) {
        // Remove new unsaved tab
        return prev.filter((t) => t.id !== activeTabId);
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
      setTabs((prev) => prev.filter((t) => t.testCaseId !== id));
    },
    [deleteTestCase],
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

  const handleRun = React.useCallback(
    async (testCaseId: string) => {
      await runTest(testCaseId);
    },
    [runTest],
  );

  return {
    testCases,
    selectedCase,
    selectedRuns,
    activeRun,
    liveSteps,
    editingCase: activeTab?.editingCase ?? null,
    isNew: activeTab?.isNew ?? false,
    internalTabs: tabs,
    tabs: pageTabs,
    activeTabId: activeTabId || '',
    handleCreate,
    handleEdit,
    handleSave,
    handleDelete,
    handleRun,
    handleCancelEdit,
    openTestCase,
    handleCloseTab,
    handleRenameTab,
    setActiveTabId,
  };
}
