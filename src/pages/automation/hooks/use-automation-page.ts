import React from 'react';
import { useAutomationStore } from '@/stores/automation';
import { startLiveTrafficWatcher, stopLiveTrafficWatcher } from '@/triggers/live-traffic';
import { startPageCrawledWatcher, stopPageCrawledWatcher } from '@/triggers/browser-automation';
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
  const runningWorkflowIds = useAutomationStore((s) => s.runningWorkflowIds);
  const nodeRuntimeById = useAutomationStore((s) => s.nodeRuntimeById);

  const [templatesOpen, setTemplatesOpen] = React.useState(false);

  // Auto-create first workflow if none exist; also ensure activeWorkflowId is valid
  React.useEffect(() => {
    if (workflows.length === 0) {
      createWorkflow();
    } else if (!activeWorkflowId || !workflows.some((w) => w.id === activeWorkflowId)) {
      setActiveWorkflowId(workflows[0].id);
    }
  }, [workflows, activeWorkflowId, createWorkflow, setActiveWorkflowId]);

  // Subscribe to proxy-record events so trigger:live-traffic-captured workflows fire automatically
  React.useEffect(() => {
    startLiveTrafficWatcher();
    return () => {
      stopLiveTrafficWatcher();
    };
  }, []);

  // Subscribe to page-updated events so trigger:browser-page-crawled workflows fire automatically
  React.useEffect(() => {
    startPageCrawledWatcher();
    return () => {
      stopPageCrawledWatcher();
    };
  }, []);

  const tabs: PageTabItem[] = React.useMemo(
    () =>
      workflows.map((wf) => {
        const readiness = getWorkflowReadiness(wf);
        return {
          id: wf.id,
          name: wf.name,
          status:
            isWorkflowProcessing(wf.id, runningWorkflowIds, nodeRuntimeById)
              ? { kind: 'running' as const, label: 'Workflow is processing' }
              : !readiness.ready
                ? { kind: 'needs-action' as const, label: readiness.reason ?? 'Workflow needs action' }
                : { kind: 'ready' as const, label: 'Workflow is ready' },
        };
      }),
    [workflows, runningWorkflowIds, nodeRuntimeById]
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
    isRunning: workflows.some((wf) => isWorkflowProcessing(wf.id, runningWorkflowIds, nodeRuntimeById)),
    templatesOpen,
    onTemplatesOpenChange: setTemplatesOpen,
  };
}
