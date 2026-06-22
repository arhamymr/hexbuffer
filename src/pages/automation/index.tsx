import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ReactFlowProvider } from '@xyflow/react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { WorkflowCanvas } from './components/workflow-canvas';
import { WorkflowToolbar } from './components/workflow-toolbar';
import { ExecutionLogPanel } from './components/execution-log-panel';
import { NodeConfigPanel } from './components/node-config-panel';
import { TemplatesDialog } from './components/templates-dialog';
import { ExecutionLogToggle } from './components/execution-log-toggle';
import { useAutomationPage } from './hooks/use-automation-page';

export function AutomationPage() {
  const page = useAutomationPage();

  return (
    <ReactFlowProvider>
      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeWorkflowId}
        onTabChange={page.onTabChange}
        onTabRename={page.onTabRename}
        onTabClose={page.onTabClose}
        onTabAdd={page.onTabAdd}
        onCloseTabsToLeft={page.onCloseTabsToLeft}
        onCloseTabsToRight={page.onCloseTabsToRight}
        className="flex h-full min-h-0 flex-col bg-background"
        contentClassName="flex-1 m-2 border rounded-lg overflow-hidden bg-background min-h-0"
      >
        <ResizablePanelGroup
          id="automation-workspace-panels"
          orientation="horizontal"
          className="h-full min-h-0"
        >
          <ResizablePanel
            id="automation-canvas-panel"
            defaultSize={page.selectedNode ? 60 : 100}
            minSize="420px"
            className="min-w-0"
          >
            <ResizablePanelGroup orientation="vertical" className="h-full min-h-0">
              <ResizablePanel defaultSize={75} minSize={30}>
                <div className="relative flex h-full min-h-0 flex-col">
                  <ExecutionLogToggle
                    showExecutionLog={page.showExecutionLog}
                    onToggle={page.setShowExecutionLog}
                  />
                  <WorkflowToolbar />
                  <div className="flex-1 min-h-0">
                    <WorkflowCanvas
                      key={page.activeWorkflowId}
                      addNodeRef={page.addNodeAtCenterRef}
                      persistRef={page.persistRef}
                      onSelectedNodeChange={page.onSelectedNodeChange}
                      bridgeRef={page.bridgeRef}
                    />
                  </div>
                </div>
              </ResizablePanel>

              {page.showExecutionLog && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={10}>
                    <div className="h-full min-h-0">
                      <ExecutionLogPanel workflowId={page.activeWorkflowId || null} />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {page.selectedNode && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="automation-node-config-panel"
                defaultSize="460px"
                minSize="380px"
                maxSize="760px"
                className="min-w-0"
              >
                <NodeConfigPanel
                  node={page.selectedNode}
                  onClose={page.handleClearSelection}
                  onUpdate={page.handleNodeUpdate}
                  onDelete={page.handleNodeDelete}
                  onRun={page.handleRun}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </TabbedPageLayout>

      <TemplatesDialog open={page.templatesOpen} onOpenChange={page.onTemplatesOpenChange} />
    </ReactFlowProvider>
  );
}

