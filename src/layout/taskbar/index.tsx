import {
  SpinnerGapIcon,
  ChatTextIcon,
  MoonIcon,
  GearSixIcon,
  SunIcon,
  TerminalWindowIcon,
  ArrowUpIcon,
  DiamondIcon,
  DotsSixIcon,
  DotsThreeIcon,
  SquaresFourIcon,
  RobotIcon,
} from '@phosphor-icons/react';
import React, { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useSidebarNav } from "./use-taskbar-nav";
import { useSidebarDock } from "./use-taskbar-dock";
import { AppLauncher } from "./app-launcher";
import { GlobalSearch } from "../global-search";
import { OpenBrowserButton } from "../open-browser";
import { ProxyButton } from "../proxy-button";
import { useBrowserSessionEvents } from "../hooks/use-browser-session-events";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useBrowserAutomationStore } from "@/stores/browser-automation";
import { useNavStore } from "@/stores/nav";
import type { NavItem } from "../constants";
import { Separator } from "@/components/ui/separator";

// ponytail: reusable DockItem component with indicator dot and close button
interface DockItemProps {
  item: NavItem;
  active: boolean;
  isOpened: boolean;
  onClose?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

function DockItem({
  item,
  active,
  isOpened,
  onClose,
  onClick,
  children,
}: DockItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.href}
          onClick={onClick}
          className={
            item.iconImage
              ? "relative flex size-7 items-center justify-center touch-none group/dock-item"
              : cn(
                "relative flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground touch-none group/dock-item",
                active && "bg-primary/15 text-primary",
              )
          }
        >
          {children}
          {item.iconImage ? (
            <img
              src={item.iconImage}
              alt=""
              className="size-6 object-cover rounded-sm"
            />
          ) : (
            <item.icon className="size-4" />
          )}

          {/* OS-style open indicator dot */}
          {isOpened && (
            <span
              className={cn(
                "absolute bottom-[-10px] left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary transition-all duration-200",
                active ? "bg-primary w-3 h-1 shadow-[0_0_4px_rgba(59,130,246,0.6)]" : "bg-muted-foreground/60 scale-75"
              )}
            />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={12}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function SortableDockItem({
  item,
  active,
  dragActive,
  isOpened,
  onClose,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  dragActive: React.RefObject<boolean>;
  isOpened: boolean;
  onClose?: () => void;
  onClick?: (e: React.MouseEvent) => void;
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DockItem
        item={item}
        active={active}
        isOpened={isOpened}
        onClose={onClose}
        onClick={(e) => {
          if (dragActive.current) {
            e.preventDefault();
            return;
          }
          if (onClick) onClick(e);
        }}
      >
        {/* Drag grip indicator — visible on hover */}
        <DotsSixIcon className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-2.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover/dock-item:opacity-100" />
      </DockItem>
    </div>
  );
}

export function AppSidebar() {
  const {
    pinnedDockItems,
    unpinnedOpenedItems,
    isNavItemActive,
    pinnedNavItems,
    visibleNavItems,
    openedApps,
    closeWindow,
  } = useSidebarNav();

  const navigate = useNavigate();
  const closeAllWindows = useNavStore((s) => s.closeAllWindows);
  const hasOpenWindows = useNavStore((s) => s.windows.some((w) => w.isOpen));
  const windows = useNavStore((state) => state.windows);
  const activeWindowId = useNavStore((state) => state.activeWindowId);

  const isAssistantOpen = windows.some((w) => w.id === '/assistant' && w.isOpen);
  const isAssistantActive = activeWindowId === '/assistant';

  const toggleAssistantWindow = React.useCallback(() => {
    const navStore = useNavStore.getState();
    const pathname = '/assistant';
    const winState = navStore.windows.find((w) => w.id === pathname);
    const isActive = navStore.activeWindowId === pathname;

    if (winState && winState.isOpen) {
      if (isActive) {
        navStore.closeWindow(pathname, navigate);
      } else {
        navStore.focusWindow(pathname, navigate);
      }
    } else {
      navStore.openWindow(pathname, 'AI Assistant');
      navStore.focusWindow(pathname, navigate);
    }
  }, [navigate]);

  const isTerminalWindowOpen = windows.some((w) => w.id === '/terminal' && w.isOpen);
  const isTerminalActive = activeWindowId === '/terminal';

  const toggleTerminalWindow = React.useCallback(() => {
    const navStore = useNavStore.getState();
    const pathname = '/terminal';
    const winState = navStore.windows.find((w) => w.id === pathname);
    const isActive = navStore.activeWindowId === pathname;

    if (winState && winState.isOpen) {
      if (isActive) {
        navStore.closeWindow(pathname, navigate);
      } else {
        navStore.focusWindow(pathname, navigate);
      }
    } else {
      navStore.openWindow(pathname, 'Terminal');
      navStore.focusWindow(pathname, navigate);
    }
  }, [navigate]);

  const handleAppClick = React.useCallback((href: string, label: string) => {
    const navStore = useNavStore.getState();
    const winState = navStore.windows.find((w) => w.id === href);

    if (winState) {
      navStore.focusWindow(href, navigate);
    } else {
      navStore.openWindow(href, label);
      navStore.focusWindow(href, navigate);
    }
  }, [navigate]);

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
      <div className="w-full border-t border-border/80 bg-background/95 backdrop-blur-md px-4 py-1.5 flex items-center justify-between select-none h-11 shrink-0">
        {/* Center section: App launcher, pinned & running apps */}
        <div className="flex items-center gap-2 h-6">
          <AppLauncher />

          <Separator orientation="vertical" className='h-6' />

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
                  isOpened={openedApps.includes(item.href)}
                  onClose={() => closeWindow(item.href, navigate)}
                  onClick={() => handleAppClick(item.href, item.label)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {unpinnedOpenedItems.length > 0 && (
            <div className="mx-1.5 h-5 w-px bg-border/60" />
          )}

          {unpinnedOpenedItems.map((item) => (
            <DockItem
              key={item.href}
              item={item}
              active={isNavItemActive(item)}
              isOpened={true}
              onClose={() => closeWindow(item.href, navigate)}
              onClick={() => handleAppClick(item.href, item.label)}
            />
          ))}

          {hasOpenWindows && (
            <>
              <div className="mx-1.5 h-5 w-px bg-border/60" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => closeAllWindows(navigate)}
                    className="flex size-7 items-center justify-center rounded-sm text-muted-foreground/50 transition-all hover:bg-red-500/10 hover:text-red-400 hover:scale-105"
                    aria-label="Close all windows"
                  >
                    <SquaresFourIcon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={12}>
                  Close all windows
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Right section: System tools & settings */}
        <div className="flex items-center gap-2.5 min-w-[160px] justify-end">
          <ProxyButton />
          <OpenBrowserButton />

          <div className="h-5 w-px bg-border/60 mx-1" />

          <GlobalSearch />

          <div className="h-5 w-px bg-border/60 mx-1" />

          {/* Terminal */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-105",
                  isTerminalActive && "bg-primary/15 text-primary scale-105",
                )}
                onClick={toggleTerminalWindow}
              >
                <TerminalWindowIcon className="size-4" />
                {isTerminalWindowOpen && (
                  <span
                    className={cn(
                      "absolute bottom-[1.5px] left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary transition-all duration-200",
                      isTerminalActive ? "bg-primary w-2 h-1 shadow-[0_0_4px_rgba(59,130,246,0.6)]" : "bg-muted-foreground/60 scale-75"
                    )}
                  />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={12}>
              Terminal
            </TooltipContent>
          </Tooltip>

          {/* AI Chat */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-105",
                  isAssistantActive && "bg-primary/15 text-primary scale-105",
                )}
                onClick={toggleAssistantWindow}
              >
                <RobotIcon className="size-4" />
                {isAssistantOpen && (
                  <span
                    className={cn(
                      "absolute bottom-[1.5px] left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary transition-all duration-200",
                      isAssistantActive ? "bg-primary w-2 h-1 shadow-[0_0_4px_rgba(59,130,246,0.6)]" : "bg-muted-foreground/60 scale-75"
                    )}
                  />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={12}>
              AI Assistant
            </TooltipContent>
          </Tooltip>

          {/* Update badge */}
          {dock.updateAvailable && !dock.updateInstalled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="relative flex size-7 items-center justify-center rounded-sm text-green-600 transition-all hover:bg-muted/80 hover:scale-105 dark:text-green-400"
                  onClick={() => dock.setUpdateDialogOpen(true)}
                  disabled={dock.updateDownloading}
                >
                  {dock.updateDownloading ? (
                    <SpinnerGapIcon className="size-4 animate-spin" />
                  ) : (
                    <ArrowUpIcon className="size-4" />
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

          {/* More menu */}
          <div className="group flex items-center gap-1">
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-105"
            >
              <DotsThreeIcon className="size-4" />
            </button>

            <div className="flex max-w-0 items-center gap-1 overflow-hidden opacity-0 transition-all duration-200 ease-out group-hover:max-w-[140px] group-hover:opacity-100">
              {/* Settings */}
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-105"
                onClick={dock.openSettings}
              >
                <GearSixIcon className="size-4" />
              </button>

              {/* Theme */}
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-105"
                onClick={dock.toggleTheme}
              >
                {dock.theme === "dark" ? (
                  <SunIcon className="size-4" />
                ) : (
                  <MoonIcon className="size-4" />
                )}
              </button>

              {/* License */}
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-105"
                onClick={() => dock.setLicenseModalOpen(true)}
              >
                {dock.licenseStatus === "lifetime" ? (
                  <DiamondIcon className="text-red-500 size-4" />
                ) : (
                  <DiamondIcon className="text-yellow-500 size-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

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
