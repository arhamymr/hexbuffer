import React from 'react';
import { useAutomationStore } from '@/stores/automation';
import type { PageTabItem } from '@/components/tabs-layout/types';

export function useAutomationPage() {
  const workflows = useAutomationStore((s) => s.workflows);
  const activeWorkflowId = useAutomationStore((s) => s.activeWorkflowId);
  const createWorkflow = useAutomationStore((s) => s.createWorkflow);
  const setActiveWorkflowId = useAutomationStore((s) => s.setActiveWorkflowId);
  const renameWorkflow = useAutomationStore((s) => s.renameWorkflow);
  const deleteWorkflow = useAutomationStore((s) => s.deleteWorkflow);
  const deleteWorkflows = useAutomationStore((s) => s.deleteWorkflows);

  // Auto-create first workflow if none exist; also ensure activeWorkflowId is valid
  React.useEffect(() => {
    if (workflows.length === 0) {
      createWorkflow();
    } else if (!activeWorkflowId || !workflows.some((w) => w.id === activeWorkflowId)) {
      setActiveWorkflowId(workflows[0].id);
    }
  }, [workflows, activeWorkflowId, createWorkflow, setActiveWorkflowId]);

  const tabs: PageTabItem[] = React.useMemo(
    () =>
      workflows.map((wf) => ({
        id: wf.id,
        name: wf.name,
      })),
    [workflows]
  );

  const handleCloseTabsToLeft = React.useCallback(
    (tabId: string) => {
      const idx = workflows.findIndex((w) => w.id === tabId);
      if (idx <= 0) return;
      const idsToClose = workflows.slice(0, idx).map((w) => w.id);
      deleteWorkflows(idsToClose);
    },
    [workflows, deleteWorkflows]
  );

  const handleCloseTabsToRight = React.useCallback(
    (tabId: string) => {
      const idx = workflows.findIndex((w) => w.id === tabId);
      if (idx < 0 || idx >= workflows.length - 1) return;
      const idsToClose = workflows.slice(idx + 1).map((w) => w.id);
      deleteWorkflows(idsToClose);
    },
    [workflows, deleteWorkflows]
  );

  return {
    tabs,
    activeWorkflowId: activeWorkflowId ?? '',
    onTabChange: setActiveWorkflowId,
    onTabRename: renameWorkflow,
    onTabClose: deleteWorkflow,
    onTabAdd: createWorkflow,
    onCloseTabsToLeft: handleCloseTabsToLeft,
    onCloseTabsToRight: handleCloseTabsToRight,
    isRunning: useAutomationStore((s) => s.isRunning),
  };
}
