import React from 'react';
import { useAutomationStore } from '@/stores/automation';
import type { PageTabItem } from '@/components/tabs-layout/types';
import { getWorkflowReadiness } from '../lib/workflow-readiness';
import { isWorkflowProcessing } from '../lib/workflow-runtime';

export function useAutomationPage() {
  const workflows = useAutomationStore((s) => s.workflows);
  const activeWorkflowId = useAutomationStore((s) => s.activeWorkflowId);
  const createWorkflow = useAutomationStore((s) => s.createWorkflow);
  const setActiveWorkflowId = useAutomationStore((s) => s.setActiveWorkflowId);
  const renameWorkflow = useAutomationStore((s) => s.renameWorkflow);
  const deleteWorkflow = useAutomationStore((s) => s.deleteWorkflow);
  const deleteWorkflows = useAutomationStore((s) => s.deleteWorkflows);
  const workflowRuntimeById = useAutomationStore((s) => s.workflowRuntimeById);

  const [templatesOpen, setTemplatesOpen] = React.useState(false);

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
      workflows.map((wf) => {
        const readiness = getWorkflowReadiness(wf);
        return {
          id: wf.id,
          name: wf.name,
          status:
            isWorkflowProcessing(wf.id, workflowRuntimeById)
              ? { kind: 'running' as const, label: 'Workflow is processing' }
              : !readiness.ready
                ? { kind: 'needs-action' as const, label: readiness.reason ?? 'Workflow needs action' }
                : { kind: 'ready' as const, label: 'Workflow is ready' },
        };
      }),
    [workflows, workflowRuntimeById]
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
    onTabAdd: () => setTemplatesOpen(true),
    onCloseTabsToLeft: handleCloseTabsToLeft,
    onCloseTabsToRight: handleCloseTabsToRight,
    isRunning: workflows.some((wf) => isWorkflowProcessing(wf.id, workflowRuntimeById)),
    templatesOpen,
    onTemplatesOpenChange: setTemplatesOpen,
  };
}
