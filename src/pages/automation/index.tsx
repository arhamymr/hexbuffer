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
import { NodePalette } from './components/node-palette';
import { ExecutionLogPanel } from './components/execution-log-panel';
import { DnDProvider } from './components/dnd-context';
import { useAutomationPage } from './hooks/use-automation-page';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  } = useAutomationPage();

  const [showPalette, setShowPalette] = React.useState(true);

  return (
    <ReactFlowProvider>
      <DnDProvider>
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
            className="min-h-0"
          >
            {showPalette && (
              <>
                <ResizablePanel defaultSize={25} minSize={18}>
                  <div className="h-full min-h-0">
                    <NodePalette />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />
              </>
            )}

            <ResizablePanel defaultSize={showPalette ? 75 : 100} minSize={30}>
              <ResizablePanelGroup orientation="vertical" className="h-full">
                <ResizablePanel defaultSize={75} minSize={30}>
                  <div className="relative flex h-full min-h-0 flex-col">
                    {/* Toggle palette button */}
                    <Button
                      variant="ghost"
                      size="xs"
                      className={cn(
                        'absolute left-2 top-2 z-20 h-7 w-7 p-0 rounded-md',
                        'bg-background/80 backdrop-blur-sm border shadow-sm',
                        'hover:bg-accent'
                      )}
                      onClick={() => setShowPalette(!showPalette)}
                      title={showPalette ? 'Hide node panel' : 'Show node panel'}
                    >
                      {showPalette ? (
                        <PanelLeftClose className="size-3.5" />
                      ) : (
                        <PanelLeftOpen className="size-3.5" />
                      )}
                    </Button>
                    <WorkflowToolbar />
                    <div className="flex-1 min-h-0">
                      <WorkflowCanvas key={activeWorkflowId} />
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={25} minSize={10} maxSize={50}>
                  <div className="h-full min-h-0">
                    <ExecutionLogPanel />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabbedPageLayout>
      </DnDProvider>
    </ReactFlowProvider>
  );
}
