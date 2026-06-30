import * as React from 'react';

import { useNavStore } from '@/stores/nav';
import { pageComponentMap } from './page-lazy-imports';
import { DesktopWindow } from './desktop-window';

interface DesktopWorkspaceProps {
  activeChild: React.ReactNode;
}

export function DesktopWorkspace({ activeChild }: DesktopWorkspaceProps) {
  const windows = useNavStore((state) => state.windows);
  const activeWindowId = useNavStore((state) => state.activeWindowId);
  const OverviewComponent = pageComponentMap['/'];

  // ponytail: memoize filtered window list to avoid creating new array refs on every render
  const openWindows = React.useMemo(
    () => windows.filter((win) => win.isOpen),
    [windows]
  );

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#0a0a0b]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        .select-none-global, .select-none-global * {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
      `}</style>
      {/* Desktop Background (Overview Dashboard) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <React.Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading desktop…</div>}>
          {OverviewComponent ? <OverviewComponent /> : null}
        </React.Suspense>
      </div>

      {/* Floating Application Windows */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {openWindows.map((win) => (
          <DesktopWindow
            key={win.id}
            win={win}
            isFocused={activeWindowId === win.id}
            activeChild={activeChild}
          />
        ))}
      </div>
    </div>
  );
}
