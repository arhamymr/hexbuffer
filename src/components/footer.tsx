import * as React from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { MessageSquare, Moon, Settings, Sun } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const proxyStatusLabel = {
  connected: 'Connected',
  starting: 'Starting',
  stopping: 'Stopping',
  disconnected: 'Disconnected',
} as const;

interface AppFooterProps {
  isAssistantOpen: boolean;
  onToggleAssistant: () => void;
}

export function AppFooter({ isAssistantOpen, onToggleAssistant }: AppFooterProps) {
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);
  const checkProxyStatus = useAppStore((state) => state.checkProxyStatus);
  const { theme, toggleTheme } = useTheme();
  const activeProxyPort = proxyPort ?? proxyDefaultPort;
  const isDefaultPortChanged = proxyStatus === 'connected' && proxyPort !== null && proxyPort !== proxyDefaultPort;
  const proxyTitle = isDefaultPortChanged
    ? `Proxy connected on ${activeProxyPort}. Default port changed from ${proxyDefaultPort}.`
    : `Proxy ${proxyStatusLabel[proxyStatus].toLowerCase()}`;

  React.useEffect(() => {
    checkProxyStatus();

    const interval = window.setInterval(() => {
      checkProxyStatus();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [checkProxyStatus]);

  return (
    <footer className="border-t px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>© {new Date().getFullYear()} | 0xbuffer Version 0.1</span>
        <div className="flex items-center gap-2" title={proxyTitle}>
          <span
            className={`h-2 w-2 rounded-full ${
              proxyStatus === 'connected'
                ? 'bg-green-500 animate-pulse'
                : proxyStatus === 'starting' || proxyStatus === 'stopping'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-muted-foreground/50'
            }`}
          />
          <span>
            Proxy: {proxyStatusLabel[proxyStatus]} | *:{activeProxyPort}
            {isDefaultPortChanged ? ' (default port changed)' : ''}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          className="h-8 w-8 p-0"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className={cn('h-8 w-8 p-0', isAssistantOpen && 'bg-muted text-foreground')}
          onClick={onToggleAssistant}
          title={isAssistantOpen ? 'Hide Chat' : 'Show Chat'}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className="h-8 w-8 p-0"
          title="Settings"
          onClick={async () => {
            try {
              const existing = await WebviewWindow.getByLabel('settings');
              if (existing) {
                await existing.setFocus();
                return;
              }
              new WebviewWindow('settings', {
                url: '/?window=settings',
                title: '0xbuffer - Settings',
                width: 700,
                height: 600,
                decorations: true,
                resizable: true,
              });
            } catch {
              window.open('/settings', '_blank');
            }
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </footer>
  );
}
