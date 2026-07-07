import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useRepeaterPage } from './hooks/use-repeater-page';
import { WorkspacePanel } from './components/workspace-panel';
import { ManageWorkspacesDialog } from './components/ManageWorkspacesDialog';

export function RepeaterPage() {
  const page = useRepeaterPage();

  return (
    <>
      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeWorkspaceId}
        onTabChange={page.onTabChange}
        onTabRename={page.onTabRename}
        onTabClose={page.onTabClose}
        onTabAdd={page.onTabAdd}
        onTabManage={page.onTabManage}
        onCloseTabsToLeft={page.onCloseTabsToLeft}
        onCloseTabsToRight={page.onCloseTabsToRight}
        className="flex h-full min-h-0 flex-col bg-background"
        contentClassName="flex-1 m-2 border rounded-md overflow-hidden bg-background min-h-0"
      >
        {page.activeWorkspaceId && (
          <WorkspacePanel key={page.activeWorkspaceId} workspaceId={page.activeWorkspaceId} />
        )}
      </TabbedPageLayout>

      <ManageWorkspacesDialog
        open={page.isManageDialogOpen}
        onOpenChange={page.setIsManageDialogOpen}
        initialDeleteId={page.workspaceToDeleteId}
        onClearInitialDeleteId={() => page.setWorkspaceToDeleteId(null)}
      />
    </>
  );
}
