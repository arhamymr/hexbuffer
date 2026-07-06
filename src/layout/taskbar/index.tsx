import {
  XCircleIcon,
} from '@phosphor-icons/react';
import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LicenseModal } from "@/components/license-modal";
import { useSidebarNav } from "./hooks/use-taskbar-nav";
import { useSidebarDock } from "./hooks/use-taskbar-dock";
import { AppLauncher } from "./app-launcher";
import { OpenBrowserButton } from "../open-browser";
import { ProxyButton } from "../proxy-button";
import { useBrowserSessionEvents } from "../hooks/use-browser-session-events";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useBrowserAutomationStore } from "@/stores/browser-automation";
import { useNavStore } from "@/stores/nav";
import { Separator } from "@/components/ui/separator";

// Sub-components
import { DockItem, SortableDockItem } from './components/dock-item';
import { SystemTools } from './components/system-tools';
import { UpdateDialog } from './components/update-dialog';

export function AppSidebar() {
  const {
    pinnedDockItems,
    unpinnedOpenedItems,
    recentDockItems,
    isNavItemActive,
    pinnedNavItems,
    visibleNavItems,
    openedApps,
    closeWindow,
    removeRecentApp,
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
        {/* Center section: App launcher & open windows tools */}
        <div className="flex items-center gap-2 h-6">
          <AppLauncher />
          <ProxyButton />
          <OpenBrowserButton />

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
              {pinnedDockItems.map((item) => {
                const isOpened = openedApps.includes(item.href);
                return (
                  <SortableDockItem
                    key={item.href}
                    item={item}
                    active={isNavItemActive(item)}
                    dragActive={dragActive}
                    isOpened={isOpened}
                    onClose={isOpened ? () => closeWindow(item.href, navigate) : undefined}
                    onClick={() => handleAppClick(item.href, item.label)}
                  />
                );
              })}
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
                    <XCircleIcon className="size-4" />
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
        <SystemTools
          recentDockItems={recentDockItems}
          openedApps={openedApps}
          isNavItemActive={isNavItemActive}
          closeWindow={(href) => closeWindow(href, navigate)}
          removeRecentApp={removeRecentApp}
          handleAppClick={handleAppClick}
          isAssistantActive={isAssistantActive}
          isAssistantOpen={isAssistantOpen}
          toggleAssistantWindow={toggleAssistantWindow}
          dock={dock}
        />
      </div>

      <UpdateDialog
        open={dock.updateDialogOpen}
        onOpenChange={dock.setUpdateDialogOpen}
        updateDownloading={dock.updateDownloading}
        progressLabel={dock.progressLabel}
        updateVersion={dock.updateVersion}
        updateConfirmReady={dock.updateConfirmReady}
        onInstall={dock.handleInstallUpdate}
      />

      <LicenseModal
        open={dock.licenseModalOpen}
        onOpenChange={dock.setLicenseModalOpen}
      />
    </>
  );
}
