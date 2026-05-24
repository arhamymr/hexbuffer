'use client';

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
      <div className="bg-muted flex-1 grid grid-cols-2 gap-0 min-h-0">
        <div className="border-r min-h-0">
          <RepeaterRequestPanel
            rawRequest={activeTab.request.raw}
            isLoading={activeTab.isLoading}
            onRawRequestChange={updateRawRequest}
            onSend={sendRequest}
          />
        </div>
        <div className="min-h-0">
          <RepeaterResponsePanel
            response={activeTab.response}
            isLoading={activeTab.isLoading}
            error={activeTab.error}
          />
        </div>
      </div>
    </TabbedPageLayout>
  );
}
