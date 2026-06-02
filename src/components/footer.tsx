import * as React from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { relaunch } from '@tauri-apps/plugin-process';
import { ArrowUp, Loader2, MessageSquare, Moon, Settings, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/app';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useUpdater } from '@/hooks/use-updater';
import { ManualUpdateCommand } from '@/pages/settings/components/manual-update-command';
import pkg from '../../package.json';

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
  const {
    updateAvailable,
    updateVersion,
    downloading,
    downloadError,
    updateInstalled,
    installUpdate,
  } = useUpdater();
  const activeProxyPort = proxyPort ?? proxyDefaultPort;
  const isDefaultPortChanged = proxyStatus === 'connected' && proxyPort !== null && proxyPort !== proxyDefaultPort;
  const proxyTitle = isDefaultPortChanged
    ? `Proxy connected on ${activeProxyPort}. Default port changed from ${proxyDefaultPort}.`
    : `Proxy ${proxyStatusLabel[proxyStatus].toLowerCase()}`;

  const handleInstallUpdate = React.useCallback(async () => {
    const toastId = toast.loading(`Installing v${updateVersion}...`);
    const result = await installUpdate();

    if (result.ok) {
      toast.success(`Updated to v${updateVersion}`, {
        id: toastId,
        description: 'Restarting app to finish applying the update.',
      });

      window.setTimeout(() => {
        void relaunch();
      }, 1500);
      return;
    }

    const errorMessage = result.error || downloadError;

    toast.error('Update failed', {
      id: toastId,
      description: (
        <div className="space-y-2">
          <p>
            {errorMessage.toLowerCase().includes('signature')
              ? 'The release signature does not match the updater public key.'
              : errorMessage || 'The automatic update failed.'}
          </p>
          <ManualUpdateCommand
            className="bg-background/70 p-2"
            message="Copy this command and run it manually in your terminal to update."
          />
        </div>
      ),
    });
  }, [downloadError, installUpdate, updateVersion]);

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
        <span>© {new Date().getFullYear()} | 0xbuffer v{pkg.version}</span>
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
        {updateAvailable && !updateInstalled && (
          <Button
            variant="ghost"
            size="xs"
            className="h-8 px-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            title={`Update to v${updateVersion}`}
            onClick={handleInstallUpdate}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="mr-1.5 h-4 w-4" />
            )}
            {downloading ? 'Updating...' : `Update v${updateVersion}`}
          </Button>
        )}
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
