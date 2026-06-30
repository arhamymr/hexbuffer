import * as React from 'react';
import { useInspectorStore } from '@/stores/inspector';
import { AppSidebar } from './taskbar';
import { DesktopWorkspace } from './desktop-workspace';

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const initInspectorListeners = useInspectorStore((state) => state.initListeners);

  React.useEffect(() => {
    initInspectorListeners();
  }, [initInspectorListeners]);

  return (
    <div className="flex h-screen flex-col border bg-background">
      <div className="min-h-0 flex-1 relative bg-background">
        <DesktopWorkspace activeChild={children} />
      </div>
      <AppSidebar />
      {/* <AppFooter /> */}
    </div>
  );
}
