import { TabbedPageLayout } from "@/components/tabs-layout/tabbed-page-layout";
import { Card } from "@/components/ui/card";
import { LogFilters } from "./components/log-table/log-filters";
import { TargetSelectorDialog } from "./components/target-selector";
import { useHttpHistoryPage } from "./hooks/use-http-history-page";
import { CreateGroupDialog } from "./components/group-dialog";

export function LiveTrafficPage() {
  const page = useHttpHistoryPage();

  return (
    <>
      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeTabId}
        onTabChange={page.setActiveTabId}
        onTabClose={page.removeTab}
        onTabRename={page.renameTab}
        onTabAdd={page.addGroup}
        renderTabContextMenuItems={page.renderTabContextMenuItems}
        contentClassName="flex-1 border rounded-lg flex flex-col overflow-hidden bg-background min-h-0"
      >
        <LogFilters historyMode={page.historyMode} />
        <Card className="flex-1 flex flex-col overflow-hidden !py-0 rounded-none">
          {page.historyView}
        </Card>
      </TabbedPageLayout>
      <CreateGroupDialog
        open={page.isGroupDialogOpen}
        onOpenChange={page.setIsGroupDialogOpen}
      />
      <TargetSelectorDialog
        externalOpen={page.isTargetSelectorOpen}
        onExternalOpenChange={(open) => { if (!open) page.closeTargetSelector(); }}
      />
    </>
  );
}
