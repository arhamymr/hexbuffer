'use client';

import { TabbedPageLayout } from '@/pages/shared/tabbed-page-layout';
import { RepeaterUrlBar } from './components/RepeaterUrlBar';
import { RepeaterRequestPanel } from './components/RepeaterRequestPanel';
import { RepeaterResponsePanel } from './components/RepeaterResponsePanel';
import { useRepeaterPage } from './hooks/use-repeater-page';

export function RepeaterPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    closeTab,
    activeTab,
    updateUrl,
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
      onTabClose={closeTab}
      contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
    >
      <RepeaterUrlBar
        url={activeTab.request.url}
        isLoading={activeTab.isLoading}
        onUrlChange={updateUrl}
        onSend={sendRequest}
      />
      <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
        <div className="border-r min-h-0">
          <RepeaterRequestPanel
            rawRequest={activeTab.request.raw}
            onRawRequestChange={updateRawRequest}
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
