import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  MinusIcon,
  XIcon,
  ArrowsOutSimpleIcon,
  ArrowsInSimpleIcon,
  SidebarSimpleIcon,
  DotsSixIcon,
} from "@phosphor-icons/react";

import { useNavStore } from "@/stores/nav";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface WindowHeaderProps {
  id: string;
  title: string;
  isFocused: boolean;
  isMaximized: boolean;
  navItem?: any;
  onDragMouseDown: React.MouseEventHandler;
  tileLeft: () => void;
  tileRight: () => void;
}

export const WindowHeader = React.memo(function WindowHeader({
  id,
  title,
  isFocused,
  isMaximized,
  navItem,
  onDragMouseDown,
  tileLeft,
  tileRight,
}: WindowHeaderProps) {
  const navigate = useNavigate();
  const closeWindow = useNavStore((s) => s.closeWindow);
  const minimizeWindow = useNavStore((s) => s.minimizeWindow);
  const maximizeWindow = useNavStore((s) => s.maximizeWindow);

  return (
    <div
      onMouseDown={onDragMouseDown}
      className={cn(
        "flex h-8 shrink-0 items-center cursor-pointer justify-between px-2 border-b cursor-grab select-none",
        isFocused
          ? "bg-muted/70 border-border/80 text-foreground"
          : "bg-muted/30 border-border/40 text-muted-foreground"
      )}
    >
      {/* Window Title */}
      <div className="flex gap-2 h-6 items-center">
        <DotsSixIcon size={16} className="text-muted-foreground/45 cursor-grab shrink-0 mr-1" />
        {navItem && (
          <navItem.icon className="size-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs font-semibold tracking-wide truncate max-w-[200px]">
          {title}
        </span>
        {navItem?.flag && navItem.flag !== 'release' && (
          <Badge
            variant={navItem.flag === 'alpha' ? 'destructive' : 'yellow'}
            className="px-1 py-0 text-[8px] font-extrabold uppercase tracking-wider h-3.5 leading-none rounded-sm border-none pointer-events-none select-none shrink-0"
          >
            {navItem.flag}
          </Badge>
        )}
      </div>

      <div className="flex gap-2 h-6 items-center">
        {/* Snap Layout Controls */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              tileLeft();
            }}
            className="window-control-btn p-1 hover:bg-muted rounded cursor-pointer transition-colors hover:text-foreground"
            title="Tile Left (Split Screen)"
          >
            <SidebarSimpleIcon
              size={16}
              className="scale-x-[-1]"
              weight="fill"
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              tileRight();
            }}
            className="window-control-btn p-1 hover:bg-muted rounded cursor-pointer transition-colors hover:text-foreground"
            title="Tile Right (Split Screen)"
          >
            <SidebarSimpleIcon size={16} weight="fill" />
          </button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Window Controls */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(id, navigate);
            }}
            className="window-control-btn p-0.5 hover:bg-muted rounded-sm cursor-pointer active:scale-95 transition-all text-muted-foreground hover:text-foreground"
            aria-label="Minimize"
            title="Minimize"
          >
            <MinusIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(id);
            }}
            className="window-control-btn p-0.5 hover:bg-muted rounded-sm cursor-pointer active:scale-95 transition-all text-muted-foreground hover:text-foreground"
            aria-label="Maximize"
            title="Maximize"
          >
            {isMaximized ? (
              <ArrowsInSimpleIcon className="size-3.5" />
            ) : (
              <ArrowsOutSimpleIcon className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(id, navigate);
            }}
            className="window-control-btn p-0.5 hover:bg-destructive/20 hover:text-destructive rounded-sm cursor-pointer active:scale-95 transition-all"
            aria-label="Close"
            title="Close"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});
