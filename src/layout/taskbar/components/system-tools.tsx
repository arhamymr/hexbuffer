import * as React from 'react';
import {
  SpinnerGapIcon,
  MoonIcon,
  GearSixIcon,
  SunIcon,
  ArrowUpIcon,
  DiamondIcon,
  DotsThreeIcon,
  RobotIcon,
} from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GlobalSearch } from '../../global-search';
import type { NavItem } from '../../constants';
import { DockItem } from './dock-item';

interface SystemToolsProps {
  recentDockItems: NavItem[];
  openedApps: string[];
  isNavItemActive: (item: NavItem) => boolean;
  closeWindow: (href: string) => void;
  removeRecentApp: (href: string) => void;
  handleAppClick: (href: string, label: string) => void;
  isAssistantActive: boolean;
  isAssistantOpen: boolean;
  toggleAssistantWindow: () => void;
  dock: any;
}

export function SystemTools({
  recentDockItems,
  openedApps,
  isNavItemActive,
  closeWindow,
  removeRecentApp,
  handleAppClick,
  isAssistantActive,
  isAssistantOpen,
  toggleAssistantWindow,
  dock,
}: SystemToolsProps) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2.5 min-w-[160px] justify-end">
      <GlobalSearch />

      <div className="h-5 w-px bg-border/60 mx-1" />

      {recentDockItems.length > 0 && (
        <>
          <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider select-none mr-1">
            Recent
          </span>
          {recentDockItems.map((item) => {
            const isOpened = openedApps.includes(item.href);
            return (
              <DockItem
                key={item.href}
                item={item}
                active={isNavItemActive(item)}
                isOpened={isOpened}
                onClose={() => {
                  if (isOpened) {
                    closeWindow(item.href);
                  } else {
                    removeRecentApp(item.href);
                  }
                }}
                onClick={() => handleAppClick(item.href, item.label)}
              />
            );
          })}
          <div className="h-5 w-px bg-border/60 mx-1" />
        </>
      )}

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

      {/* Clock */}
      <div className="h-5 w-px bg-border/60 mx-0.5" />
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-xs font-mono font-medium text-muted-foreground select-none px-1.5 py-0.5 rounded-sm hover:bg-muted/80 hover:text-foreground transition-all duration-100 cursor-default">
            {timeString}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={12}>
          {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
