import { TabbedPageLayout } from "@/components/tabs-layout/tabbed-page-layout";
import { Card } from "@/components/ui/card";
import { TargetSelectorDialog } from "../http-history/components/target-selector";
import { useWebSocketHistoryPage } from "./hooks/use-websocket-history-page";
import { useWebSocketHistoryQueryStore } from "./state/query-store";
import { clearWebSocketLogs } from "./services/history-service";
import { toast } from "sonner";
import { TrashIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";

export function WebSocketHistoryPage() {
  const page = useWebSocketHistoryPage();

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all WebSocket connection history?")) {
      try {
        await clearWebSocketLogs();
        useWebSocketHistoryQueryStore.getState().triggerRefresh();
        useWebSocketHistoryQueryStore.getState().setSelectedConnectionId(null);
        toast.success("WebSocket history cleared");
      } catch (err) {
        toast.error("Failed to clear WebSocket history");
      }
    }
  };

  return (
    <>
      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeTabId}
        onTabChange={page.setActiveTabId}
        onTabClose={page.removeTab}
        contentClassName="flex-1 border rounded-lg flex flex-col overflow-hidden bg-background min-h-0"
      >
        <div className="bg-muted p-1 px-2 flex justify-between items-center border-b">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pl-1">
            WebSocket
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs !text-red-500 shrink-0 h-6"
          >
            <TrashIcon className="size-3 mr-1" />
            Clear All Connections
          </Button>
        </div>
        <Card className="flex-1 flex flex-col overflow-hidden !py-0 rounded-none">
          {page.websocketView}
        </Card>
      </TabbedPageLayout>
      <TargetSelectorDialog
        externalOpen={page.isTargetSelectorOpen}
        onExternalOpenChange={(open) => { if (!open) page.closeTargetSelector(); }}
      />
    </>
  );
}
