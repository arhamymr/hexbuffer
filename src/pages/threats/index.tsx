import { TriangleAlert } from 'lucide-react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThreatsWorkspace } from './components/threats-workspace';
import { useThreatsPage } from './hooks/use-threats-page';

export function ThreatsPage() {
  const { tabs, activeTabId, setActiveTabId, workspaceProps } = useThreatsPage();

  return (
    <>
      <div className="p-2">
        <Alert variant="default" className="min-h-12 mb-0 shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
          <TriangleAlert className="!text-amber-600 shrink-0" />
          <AlertDescription className="text-amber-600">
            This feature has not been fully tested yet. Use with caution and report any issues you encounter.
          </AlertDescription>
        </Alert>
      </div>

      <TabbedPageLayout
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        contentClassName="flex-1 overflow-hidden bg-background min-h-0 border rounded-md"
      >
        <ThreatsWorkspace {...workspaceProps} />
      </TabbedPageLayout>
    </>
  );
}

