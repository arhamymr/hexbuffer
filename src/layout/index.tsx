import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useInspectorStore } from '@/stores/inspector';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { useTheme } from '@/components/theme-provider';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { MonitorIcon, SunIcon, MoonIcon, ImageIcon, GearSixIcon } from '@phosphor-icons/react';
import { AppSidebar } from './taskbar';
import { DesktopWorkspace } from './desktop-workspace';

// ponytail: inline — rendered behind everything, transparent when no bg set
function BgLayer() {
  const bgType = useAppSettingsStore((s) => s.bgType);
  const bgValue = useAppSettingsStore((s) => s.bgValue);

  if (bgType === 'none' || !bgValue) return null;

  const style: React.CSSProperties =
    bgType === 'image'
      ? {
        backgroundImage: `url(${convertFileSrc(bgValue)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
      : { backgroundColor: bgValue };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={style}
    />
  );
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const initInspectorListeners = useInspectorStore((state) => state.initListeners);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const bgType = useAppSettingsStore((s) => s.bgType);

  React.useEffect(() => {
    initInspectorListeners();
  }, [initInspectorListeners]);

  // Drop bg-background when a custom background is active so BgLayer shows through
  const rootBg = bgType === 'none' ? 'bg-background' : 'bg-transparent';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={`flex h-screen flex-col border ${rootBg} relative overflow-hidden`}>
          <BgLayer />
          <div className="min-h-0 flex-1 relative z-10">
            <DesktopWorkspace activeChild={children} />
          </div>
          <AppSidebar />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem
          id="ctx-settings"
          onClick={() => navigate('/settings')}
        >
          <GearSixIcon className="size-4" />
          Settings
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Appearance submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger id="ctx-appearance">
            <MonitorIcon className="size-4 mr-2" />
            Appearance
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {/* Dark / Light mode */}
            <ContextMenuItem
              id="ctx-theme-light"
              onClick={() => setTheme('light')}
            >
              <SunIcon className="size-4" />
              Light mode
              {theme === 'light' && <span className="ml-auto text-primary text-xs">✓</span>}
            </ContextMenuItem>
            <ContextMenuItem
              id="ctx-theme-dark"
              onClick={() => setTheme('dark')}
            >
              <MoonIcon className="size-4" />
              Dark mode
              {theme === 'dark' && <span className="ml-auto text-primary text-xs">✓</span>}
            </ContextMenuItem>

            <ContextMenuSeparator />

            {/* Background */}
            <ContextMenuItem
              id="ctx-change-background"
              onClick={() => navigate('/settings?tab=appearance')}
            >
              <ImageIcon className="size-4" />
              Change Background…
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
