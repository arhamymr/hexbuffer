import { useMockForgePage } from './hooks/use-mock-forge-page';
import { MockForgeContent } from './components/mock-forge-content';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { MOCK_FORGE_SUB_TABS } from './constants';

export function MockForgePage() {
  const page = useMockForgePage();

  const tabs = MOCK_FORGE_SUB_TABS.map((t) => ({
    id: t.id,
    name: t.label,
    closable: false,
  }));

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={page.activeSubTab}
      onTabChange={page.setActiveSubTab}
      contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
    >
      <MockForgeContent page={page} />
    </TabbedPageLayout>
  );
}

