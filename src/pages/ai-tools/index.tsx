'use client';

import { TabsContent } from '@/components/ui/tabs';
import { PromptInjectionTool } from './components/prompt-injection';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useAIToolsPage } from './hooks/use-ai-tools-page';

export function AIToolsPage() {
  const { tabs, activeTabId, setActiveTabId } = useAIToolsPage();

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      className="flex flex-col h-[calc(100vh-8.5rem)]"
    >
      <TabsContent value="prompt-injection" className="h-full m-0">
        <PromptInjectionTool />
      </TabsContent>
    </TabbedPageLayout>
  );
}
