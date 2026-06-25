import { TabsContent } from '@/components/ui/tabs';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useToolsPage } from './hooks/use-tools-page';
import { TOOL_COMPONENTS } from './constants';

export function ToolsPage() {
  const { tabs, activeTabId, setActiveTabId } = useToolsPage();

  return (
    <TabbedPageLayout tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId}>
      <div className="flex-1 overflow-auto">
        {tabs.map((tab) => {
          const ToolComponent = TOOL_COMPONENTS[tab.id];
          if (!ToolComponent) return null;
          return (
            <TabsContent key={tab.id} value={tab.id} className="h-full m-0">
              <ToolComponent />
            </TabsContent>
          );
        })}
      </div>
    </TabbedPageLayout>
  );
}

