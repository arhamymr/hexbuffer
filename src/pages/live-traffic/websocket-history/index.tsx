import { TabbedPageLayout } from "@/components/tabs-layout/tabbed-page-layout";
import { Card } from "@/components/ui/card";
import { TargetSelectorDialog } from "@/pages/live-traffic/components/target-selector";
import { useWebSocketHistoryPage } from "./hooks/use-websocket-history-page";
import { useWebSocketHistoryQueryStore } from "@/stores/history";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { TrashIcon, PlayIcon, PauseIcon, TargetIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { openTargetSelector } from "@/triggers";

export function WebSocketHistoryPage() {
  const page = useWebSocketHistoryPage();
  const isWsPaused = useWebSocketHistoryQueryStore((s) => s.isStreamManuallyPaused);

  const togglePause = () => {
    const store = useWebSocketHistoryQueryStore.getState();
    const wasPaused = store.isStreamManuallyPaused;
    store.setStreamManuallyPaused(!wasPaused);
    if (wasPaused) store.triggerRefresh();
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all WebSocket connection history?")) {
      try {
        await invoke("clear_websocket_all");
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0" onClick={togglePause}>
              {isWsPaused ? <><PlayIcon className="size-3" /> Resume</> : <><PauseIcon className="size-3" /> Pause</>}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0" onClick={openTargetSelector}>
              <TargetIcon className="size-3" />
              Target
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs !text-red-500 shrink-0 h-6">
              <TrashIcon className="size-3 mr-1" />
              Clear All
            </Button>
          </div>
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
