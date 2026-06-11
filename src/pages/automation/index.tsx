'use client';

import React from 'react';
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
import { TemplatesDialog } from './components/templates-dialog';
import { useAutomationPage } from './hooks/use-automation-page';
import type { AutomationNodeType } from './types';
import { Button } from '@/components/ui/button';
import { PanelBottomOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AutomationPage() {
  const {
    tabs,
    activeWorkflowId,
    onTabChange,
    onTabRename,
    onTabClose,
    onTabAdd,
    onCloseTabsToLeft,
    onCloseTabsToRight,
    templatesOpen,
    onTemplatesOpenChange,
  } = useAutomationPage();

  const [showExecutionLog, setShowExecutionLog] = React.useState(true);

  const addNodeAtCenterRef = React.useRef<((nodeType: AutomationNodeType) => void) | null>(null);
  const persistRef = React.useRef<(() => void) | null>(null);

  return (
    <ReactFlowProvider>
        <TabbedPageLayout
          tabs={tabs}
          activeTabId={activeWorkflowId}
          onTabChange={onTabChange}
          onTabRename={onTabRename}
          onTabClose={onTabClose}
          onTabAdd={onTabAdd}
          onCloseTabsToLeft={onCloseTabsToLeft}
          onCloseTabsToRight={onCloseTabsToRight}
          className="flex h-full min-h-0 flex-col bg-background"
          contentClassName="flex-1 m-2 border rounded-lg overflow-hidden bg-background min-h-0"
        >
          <ResizablePanelGroup
            orientation="horizontal"
            className="h-full min-h-0"
          >
            <ResizablePanel defaultSize={100} minSize={30}>
              <ResizablePanelGroup orientation="vertical" className="h-full min-h-0">
                <ResizablePanel defaultSize={75} minSize={30}>
                  <div className="relative flex h-full min-h-0 flex-col">
                    {!showExecutionLog && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className={cn(
                          'absolute bottom-2 left-2 z-20 h-7 w-7 rounded-md p-0',
                          'bg-background/80 backdrop-blur-sm border',
                          'hover:bg-accent'
                        )}
                        onClick={() => setShowExecutionLog(true)}
                        title="Show execution log"
                      >
                        <PanelBottomOpen className="size-3.5" />
                      </Button>
                    )}
                    <WorkflowToolbar />
                    <div className="flex-1 min-h-0">
                      <WorkflowCanvas key={activeWorkflowId} addNodeRef={addNodeAtCenterRef} persistRef={persistRef} />
                    </div>
                  </div>
                </ResizablePanel>

                {showExecutionLog && (
                  <>
                    <ResizableHandle withHandle />

                    <ResizablePanel defaultSize={25} minSize={10}>
                      <div className="h-full min-h-0">
                        <ExecutionLogPanel
                          workflowId={activeWorkflowId || null}
                          onHide={() => setShowExecutionLog(false)}
                        />
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabbedPageLayout>

        <TemplatesDialog open={templatesOpen} onOpenChange={onTemplatesOpenChange} />
    </ReactFlowProvider>
  );
}
