'use client';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { RepeaterRequestPanel } from './components/RepeaterRequestPanel';
import { RepeaterResponsePanel } from './components/RepeaterResponsePanel';
import { useRepeaterPage } from './hooks/use-repeater-page';

export function RepeaterPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    activeTab,
    updateRawRequest,
    sendRequest,
  } = useRepeaterPage();

  if (!activeTab) {
    return null;
  }

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      onTabRename={renameTab}
      onTabClose={closeTab}
      contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
    >
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 min-h-0"
      >
        <ResizablePanel defaultSize={50} minSize={20}>
          <RepeaterRequestPanel
            rawRequest={activeTab.request.raw}
            isLoading={activeTab.isLoading}
            onRawRequestChange={updateRawRequest}
            onSend={sendRequest}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={20}>
          <RepeaterResponsePanel
            response={activeTab.response}
            isLoading={activeTab.isLoading}
            error={activeTab.error}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TabbedPageLayout>
  );
}
