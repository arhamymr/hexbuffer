import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MinusIcon,
  XIcon,
  ArrowsOutSimpleIcon,
  ArrowsInSimpleIcon,
  SidebarSimpleIcon,
  DotsSixIcon,
} from "@phosphor-icons/react";

import { useNavStore, type WindowState } from "@/stores/nav";
import { cn } from "@/lib/utils";
import { pageComponentMap } from "./page-lazy-imports";
import { Separator } from "@/components/ui/separator";
import { allNavItems } from "../constants";
import { Badge } from "@/components/ui/badge";

interface DesktopWindowProps {
  win: WindowState;
  isFocused: boolean;
  activeChild: React.ReactNode;
}

const DesktopWindow = React.memo(function DesktopWindow({
  win,
  isFocused,
  activeChild,
}: DesktopWindowProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, title, isMinimized, isMaximized, position, size, zIndex } = win;
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    if (!isMinimized) {
      setIsHovered(false);
    }
  }, [isMinimized]);

  // ponytail: individual selectors avoid full-store re-subscription
  const closeWindow = useNavStore((s) => s.closeWindow);
  const minimizeWindow = useNavStore((s) => s.minimizeWindow);
  const maximizeWindow = useNavStore((s) => s.maximizeWindow);
  const focusWindow = useNavStore((s) => s.focusWindow);
  const updateWindowPosition = useNavStore((s) => s.updateWindowPosition);
  const updateWindowSize = useNavStore((s) => s.updateWindowSize);

  const navItem = React.useMemo(() => {
    return allNavItems.find((item) => item.href === id);
  }, [id]);

  const windowRef = React.useRef<HTMLDivElement>(null);

  // High-performance refs to hold dragging/resizing state without triggering React renders
  const dragStartRef = React.useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const dragCurrentPosRef = React.useRef(position);
  const dragRafIdRef = React.useRef<number | null>(null);
  // ponytail: capture container bounds once at drag start, not on every mousemove
  const dragContainerRectRef = React.useRef<DOMRect | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click
    if (e.button !== 0) return;

    // Do not drag if clicking control buttons
    const target = e.target as HTMLElement;
    if (target.closest(".window-control-btn")) return;

    // Capture the container bounds once at drag start
    dragContainerRectRef.current =
      windowRef.current?.parentElement?.getBoundingClientRect() ?? null;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    dragCurrentPosRef.current = position;

    focusWindow(id, navigate);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    document.body.classList.add("select-none-global");

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const raw = dragContainerRectRef.current;
      // ponytail: container is inset-0, so left/top are always 0; only width/height bound the drag
      const containerW = raw ? raw.width  : window.innerWidth;
      const containerH = raw ? raw.height : window.innerHeight;

      const HEADER_H = 36; // keep title bar reachable
      const newX = Math.min(Math.max(0, dragStartRef.current.posX + dx), containerW - size.width);
      const newY = Math.min(Math.max(0, dragStartRef.current.posY + dy), containerH - HEADER_H);

      dragCurrentPosRef.current = { x: newX, y: newY };

      if (dragRafIdRef.current) cancelAnimationFrame(dragRafIdRef.current);
      dragRafIdRef.current = requestAnimationFrame(() => {
        if (windowRef.current) {
          windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        }
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      updateWindowPosition(id, dragCurrentPosRef.current);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.classList.remove("select-none-global");
      if (dragRafIdRef.current) cancelAnimationFrame(dragRafIdRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, id, updateWindowPosition]);

  const [isResizing, setIsResizing] = React.useState(false);
  const resizeStartRef = React.useRef({
    mouseX: 0,
    mouseY: 0,
    startW: 0,
    startH: 0,
  });
  const resizeCurrentSizeRef = React.useRef(size);
  const resizeRafIdRef = React.useRef<number | null>(null);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
    resizeCurrentSizeRef.current = size;
    focusWindow(id, navigate);
  };

  React.useEffect(() => {
    if (!isResizing) return;

    document.body.classList.add("select-none-global");

    const handleMouseMove = (e: MouseEvent) => {
      const dw = e.clientX - resizeStartRef.current.mouseX;
      const dh = e.clientY - resizeStartRef.current.mouseY;

      const newWidth = Math.max(400, resizeStartRef.current.startW + dw);
      const newHeight = Math.max(300, resizeStartRef.current.startH + dh);

      resizeCurrentSizeRef.current = { width: newWidth, height: newHeight };

      if (resizeRafIdRef.current) cancelAnimationFrame(resizeRafIdRef.current);
      resizeRafIdRef.current = requestAnimationFrame(() => {
        if (windowRef.current) {
          windowRef.current.style.width = `${newWidth}px`;
          windowRef.current.style.height = `${newHeight}px`;
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      updateWindowSize(id, resizeCurrentSizeRef.current);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.classList.remove("select-none-global");
      if (resizeRafIdRef.current) cancelAnimationFrame(resizeRafIdRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, id, updateWindowSize]);

  // Focus on click
  const handleWindowClick = () => {
    if (!isFocused) {
      focusWindow(id, navigate);
    }
  };

  const tileLeft = () => {
    if (windowRef.current?.parentElement) {
      const parentRect =
        windowRef.current.parentElement.getBoundingClientRect();
      updateWindowPosition(id, { x: 0, y: 0 });
      updateWindowSize(id, {
        width: parentRect.width / 2,
        height: parentRect.height,
      });
      if (isMaximized) maximizeWindow(id);
    }
  };

  const tileRight = () => {
    if (windowRef.current?.parentElement) {
      const parentRect =
        windowRef.current.parentElement.getBoundingClientRect();
      updateWindowPosition(id, { x: parentRect.width / 2, y: 0 });
      updateWindowSize(id, {
        width: parentRect.width / 2,
        height: parentRect.height,
      });
      if (isMaximized) maximizeWindow(id);
    }
  };

  const isCurrentRoute = location.pathname === id;
  const StaticComponent = pageComponentMap[id];

  // ponytail: get index of current minimized window to offset them horizontally
  const minimizedIndex = useNavStore((s) => {
    const minimized = s.windows.filter((w) => w.isOpen && w.isMinimized);
    return minimized.findIndex((w) => w.id === id);
  });
  const mIndex = minimizedIndex >= 0 ? minimizedIndex : 0;

  const currentScale = isMinimized ? (isHovered ? 0.12 : 0.1) : 1;

  // ponytail: build className once, avoid cn() in hot path
  const windowClassName = `absolute rounded-sm flex flex-col overflow-hidden bg-background shadow-2xl select-text pointer-events-auto ${
    isMinimized
      ? "cursor-pointer border-[3px] border-border/85"
      : isFocused
      ? "border border-primary/60"
      : "border border-border/40 shadow-none opacity-90"
  } ${
    isMaximized && !isMinimized
      ? "inset-x-0 top-0 bottom-0 rounded-none border-none !w-full !h-full !translate-x-0 !translate-y-0"
      : ""
  } ${isDragging || isResizing ? "select-none" : "transition-all duration-200 ease-in-out"}`;

  return (
    <div
      ref={windowRef}
      onClick={handleWindowClick}
      onMouseEnter={isMinimized ? () => setIsHovered(true) : undefined}
      onMouseLeave={isMinimized ? () => setIsHovered(false) : undefined}
      // ponytail: prevent desktop context menu from triggering when right-clicking the window
      onContextMenu={(e) => e.stopPropagation()}
      className={windowClassName}
      style={
        isMaximized && !isMinimized
          ? { zIndex }
          : isMinimized
          ? {
              left: 0,
              top: '100%',
              transform: `translate(${mIndex * 120 + 4}px, ${-size.height * currentScale - 4}px) scale(${currentScale})`,
              transformOrigin: 'top left',
              width: size.width,
              height: size.height,
              zIndex: zIndex + 100,
              willChange: "transform",
              contain: "layout style",
            }
          : {
              left: 0,
              top: 0,
              transform: `translate(${position.x}px, ${position.y}px)`,
              width: size.width,
              height: size.height,
              zIndex,
              willChange: "transform, width, height",
              contain: "layout style",
            }
      }
    >
      {/* Minimized Overlay to capture click and prevent inner interactions */}
      {isMinimized && (
        <div className="absolute inset-0 z-50 cursor-pointer bg-black/10 hover:bg-black/5 transition-colors flex items-center justify-center">
          <div 
            className="bg-background/95 p-2.5 rounded-full shadow-xl border border-border/60 flex items-center justify-center"
            style={{ transform: 'scale(8)' }}
          >
            {navItem && (
              <navItem.icon className="size-4 text-primary shrink-0" />
            )}
          </div>

          {/* Close button for minimized window */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(id, navigate);
            }}
            className="flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg border border-background/40 transition-all active:scale-95 duration-100"
            style={{ 
              position: 'absolute',
              top: `${6 / currentScale}px`,
              right: `${6 / currentScale}px`,
              width: '18px',
              height: '18px',
              transform: 'scale(7)',
              transformOrigin: 'center',
            }}
            title="Close Window"
          >
            <XIcon className="size-2.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Window Header */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "flex h-9 shrink-0 items-center cursor-pointer justify-between px-3 border-b cursor-grab select-none",
          isFocused
            ? "bg-muted/70 border-border/80 text-foreground"
            : "bg-muted/30 border-border/40 text-muted-foreground",
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
              className="window-control-btn p-1.5 hover:bg-muted rounded-sm cursor-pointer active:scale-95 transition-all text-muted-foreground hover:text-foreground"
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
              className="window-control-btn p-1.5 hover:bg-muted rounded-sm cursor-pointer active:scale-95 transition-all text-muted-foreground hover:text-foreground"
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
              className="window-control-btn p-1.5 hover:bg-destructive/20 hover:text-destructive rounded-sm cursor-pointer active:scale-95 transition-all"
              aria-label="Close"
              title="Close"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Window Body Container */}
      <div className="flex-1 min-h-0 bg-background overflow-hidden relative">
        {/* Interaction overlay blocks iframes/canvases during drag/resize to prevent reflow jank */}
        {(isDragging || isResizing) && (
          <div className="absolute inset-0 z-40" />
        )}
        <WindowContent
          id={id}
          isCurrentRoute={isCurrentRoute}
          activeChild={activeChild}
          StaticComponent={StaticComponent}
        />
      </div>

      {/* Resize Handle (only show when not maximized and not minimized) */}
      {!isMaximized && !isMinimized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 z-30 size-4 cursor-se-resize flex items-end justify-end p-0.5"
        >
          <svg
            className="size-2.5 text-muted-foreground/40"
            viewBox="0 0 10 10"
          >
            <path
              d="M10,0 L0,10 M10,4 L4,10 M10,8 L8,10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
});

interface WindowContentProps {
  id: string;
  isCurrentRoute: boolean;
  activeChild: React.ReactNode;
  StaticComponent: React.ComponentType<any> | null;
}

const WindowContent = React.memo(
  function WindowContent({
    id,
    isCurrentRoute,
    activeChild,
    StaticComponent,
  }: WindowContentProps) {
    // ponytail: memoize window contents so they only evaluate/re-render when their active state changes, preventing CPU throttling during dragging
    return (
      <React.Suspense
        fallback={
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Loading window…
          </div>
        }
      >
        {isCurrentRoute ? (
          activeChild
        ) : StaticComponent ? (
          <StaticComponent />
        ) : null}
      </React.Suspense>
    );
  },
  (prev, next) => {
    return (
      prev.isCurrentRoute === next.isCurrentRoute &&
      prev.activeChild === next.activeChild
    );
  },
);

export { DesktopWindow, type DesktopWindowProps };
