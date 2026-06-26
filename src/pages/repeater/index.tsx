import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { RepeaterRequestPanel } from './components/RepeaterRequestPanel';
import { RepeaterResponsePanel } from './components/RepeaterResponsePanel';
import { RepeaterWsPanel } from './components/RepeaterWsPanel';
import { useRepeaterPage } from './hooks/use-repeater-page';

export function RepeaterPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    closeTabsToLeft,
    closeTabsToRight,
    activeTab,
    updateRawRequest,
    sendRequest,
    updateTab,
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
      onCloseTabsToLeft={closeTabsToLeft}
      onCloseTabsToRight={closeTabsToRight}
      contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
    >
      {activeTab.mode === 'websocket' ? (
        <RepeaterWsPanel
          tab={activeTab}
          onUpdate={updateTab}
        />
      ) : (
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0">
            <RepeaterRequestPanel
              rawRequest={activeTab.request.raw}
              isLoading={activeTab.isLoading}
              onRawRequestChange={updateRawRequest}
              onSend={sendRequest}
            />
          </div>
          <div className="flex-1 min-w-0 border-l">
            <RepeaterResponsePanel
              response={activeTab.response}
              isLoading={activeTab.isLoading}
              error={activeTab.error}
            />
          </div>
        </div>
      )}
    </TabbedPageLayout>
  );
}
