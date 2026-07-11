import * as React from "react";

interface WindowContentProps {
  id: string;
  isCurrentRoute: boolean;
  activeChild: React.ReactNode;
  StaticComponent: React.ComponentType<any> | null;
}

export const WindowContent = React.memo(
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
