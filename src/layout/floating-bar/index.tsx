import {
  Loader2,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  TerminalSquare,
  ArrowUp,
  Gem,
  Grip,
  MoreHorizontal,
} from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LicenseModal } from "@/components/license-modal";
import { useSidebarNav } from "./use-floating-nav";
import { useSidebarDock } from "./use-floating-dock";
import { DockPageButtons } from "./dock-page-buttons";
import { AppLauncher } from "./app-launcher";
import { GlobalSearch } from "../global-search";
import { OpenBrowserButton } from "../open-browser";
import { ProxyButton } from "../proxy-button";
import { useBrowserSessionEvents } from "../hooks/use-browser-session-events";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useBrowserAutomationStore } from "@/stores/browser-automation";
import type { NavItem } from "../constants";

function SortableDockItem({
  item,
  active,
  dragActive,
}: {
  item: NavItem;
  active: boolean;
  dragActive: React.RefObject<boolean>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.href });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          ref={setNodeRef}
          to={item.href}
          {...attributes}
          {...listeners}
          style={style}
          onClick={(e) => {
            if (dragActive.current) {
              e.preventDefault();
            }
          }}
          className={
            item.iconImage
              ? "relative flex size-7 items-center justify-center touch-none group/dock-item"
              : cn(
                  "relative flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground touch-none group/dock-item",
                  active && "bg-primary/15 text-primary",
                )
          }
        >
          {/* Drag grip indicator — visible on hover */}
          <Grip className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-2.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover/dock-item:opacity-100" />
          {item.iconImage ? (
            <img
              src={item.iconImage}
              alt=""
              className="size-7 object-cover rounded-sm"
            />
          ) : (
            <item.icon className="size-4" />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={12}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const { dockNavItems, isNavItemActive, pinnedNavItems } = useSidebarNav();
  const reorderPinnedNavItems = useAppSettingsStore(
    (s) => s.reorderPinnedNavItems,
  );
  const dock = useSidebarDock();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const overviewItem = dockNavItems.find((i) => i.href === "/");
  const pinnedDockItems = dockNavItems.filter((i) => i.href !== "/");
  const dragActive = useRef(false);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pinnedNavItems.indexOf(active.id as string);
    const newIndex = pinnedNavItems.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderPinnedNavItems(oldIndex, newIndex);
    // Keep navigation disabled until the click event has passed
    setTimeout(() => {
      dragActive.current = false;
    }, 100);
  }

  const applySessionStarted = useBrowserAutomationStore(
    (s) => s.applySessionStarted,
  );
  const applySessionUpdated = useBrowserAutomationStore(
    (s) => s.applySessionUpdated,
  );

  useBrowserSessionEvents(applySessionStarted, applySessionUpdated);

  return (
    <>
      {/* Floating Dock Wrapper */}
      <div
        ref={dock.dockRef}
        className={cn(
          "fixed bottom-4 left-1/2 z-50 flex items-center gap-2",
          dock.dragging && "cursor-grabbing select-none",
        )}
        style={{
          transform: `translate(calc(-50% + ${dock.position.x}px), ${dock.position.y}px)`,
        }}
      >
        {/* Page-specific action buttons dock */}
        <DockPageButtons />

        {/* Main dock wrapper */}
        <div className="relative rounded-lg border overflow-hidden flex items-center justify-center">
          {/* Glowing border beam */}
          <div className="absolute top-1/2 left-1/2 aspect-square w-[300%] h-[300%] bg-border-beam animate-border-beam pointer-events-none" />

          {/* Main dock inner content */}
          <div className="relative z-10 flex items-center gap-1 rounded-[calc(var(--radius)-3px)] bg-primary/10 px-1 py-1 backdrop-blur-xl">

           <AppLauncher />
            {/* Nav items (max 6) */}
            {/* Overview — always first, not sortable */}
            {overviewItem && (
              <Tooltip key={overviewItem.href}>
                <TooltipTrigger asChild>
                  <Link
                    to={overviewItem.href}
                    className={
                      overviewItem.iconImage
                        ? "flex size-7 items-center justify-center"
                        : cn(
                            "relative flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-100",
                            isNavItemActive(overviewItem) &&
                              "bg-primary/15 text-primary",
                          )
                    }
                  >
                    {overviewItem.iconImage ? (
                      <img
                        src={overviewItem.iconImage}
                        alt=""
                        className="size-7 object-cover rounded-sm"
                      />
                    ) : (
                      <overviewItem.icon className="size-4" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={12}>
                  {overviewItem.label}
                </TooltipContent>
              </Tooltip>
            )}

           

            {/* Pinned items — sortable via drag-and-drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => {
                dragActive.current = true;
              }}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pinnedDockItems.map((i) => i.href)}
                strategy={horizontalListSortingStrategy}
              >
                {pinnedDockItems.map((item) => (
                  <SortableDockItem
                    key={item.href}
                    item={item}
                    active={isNavItemActive(item)}
                    dragActive={dragActive}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="mx-1 h-5 w-px bg-border" />
            <ProxyButton />

            <OpenBrowserButton />

            <div className="mx-1 h-5 w-px bg-border" />

            <GlobalSearch />

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Terminal */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-110",
                    dock.isTerminalOpen && "text-primary scale-110",
                  )}
                  onClick={dock.toggleTerminal}
                >
                  <TerminalSquare className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={12}>
                {dock.isTerminalOpen ? "Close Terminal" : "Open Terminal"}
              </TooltipContent>
            </Tooltip>

            {/* AI Chat */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-110",
                    dock.isChatboxOpen && "text-primary scale-110",
                  )}
                  onClick={dock.toggleChatbox}
                >
                  <MessageSquare className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={12}>
                AI Assistant
              </TooltipContent>
            </Tooltip>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Update badge */}
            {dock.updateAvailable && !dock.updateInstalled && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="relative flex size-7 items-center justify-center rounded-sm text-green-600 transition-all hover:bg-muted/80 hover:scale-110 dark:text-green-400"
                    onClick={() => dock.setUpdateDialogOpen(true)}
                    disabled={dock.updateDownloading}
                  >
                    {dock.updateDownloading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                    <span className="absolute -bottom-0.5 right-0.5 flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={12}>
                  {dock.updateDownloading
                    ? dock.progressLabel
                    : `Update v${dock.updateVersion}`}
                </TooltipContent>
              </Tooltip>
            )}

            {/* More menu — expands inline on hover */}
            <div className="group flex items-center gap-1">
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-110"
              >
                <MoreHorizontal className="size-4" />
              </button>

              <div className="flex max-w-0 items-center gap-1 overflow-hidden opacity-0 transition-all duration-200 ease-out group-hover:max-w-[140px] group-hover:opacity-100">
                {/* Settings */}
                <button
                  type="button"
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-110"
                  onClick={dock.openSettings}
                >
                  <Settings className="size-4" />
                </button>

                {/* Theme */}
                <button
                  type="button"
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-110"
                  onClick={dock.toggleTheme}
                >
                  {dock.theme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )}
                </button>

                {/* License */}
                <button
                  type="button"
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-110"
                  onClick={() => dock.setLicenseModalOpen(true)}
                >
                  {dock.licenseStatus === "lifetime" ? (
                    <Gem className="text-red-500 size-4" />
                  ) : (
                    <Gem className="text-yellow-500 size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Drag handle */}
            <div
              className="mr-0.5 flex cursor-grab items-center px-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
              onMouseDown={dock.handleMouseDown}
            >
              <Grip className="size-4" />
            </div>
          </div>
          {/* end main dock inner content */}
        </div>
        {/* end main dock wrapper */}
      </div>
      {/* end wrapper */}

      {/* Update confirmation dialog */}
      {dock.updateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="text-sm font-semibold">
              Update to v{dock.updateVersion}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {dock.updateDownloading
                ? dock.progressLabel
                : "A new version is ready to install."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => dock.setUpdateDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                disabled={!dock.updateConfirmReady || dock.updateDownloading}
                onClick={dock.handleInstallUpdate}
              >
                {dock.updateDownloading ? "Installing..." : "Install & Restart"}
              </button>
            </div>
          </div>
        </div>
      )}

      <LicenseModal
        open={dock.licenseModalOpen}
        onOpenChange={dock.setLicenseModalOpen}
      />
    </>
  );
}
