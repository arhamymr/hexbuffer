import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { ArrowUp, Loader2, MessageSquare, Moon, Settings, Sun, TerminalSquare } from 'lucide-react';
import { Button } from '../../ui/button';
import { Separator } from '@/components/ui/separator';
import { useChatboxStore } from '@/stores/chatbox';

interface FooterActionsProps {
  theme: string;
  toggleTheme: () => void;
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
  updateAvailable: boolean;
  updateInstalled: boolean;
  updateVersion: string | null;
  downloading: boolean;
  onOpenUpdateDialog: () => void;
}

export function FooterActions({
  theme,
  toggleTheme,
  isTerminalOpen,
  onToggleTerminal,
  updateAvailable,
  updateInstalled,
  updateVersion,
  downloading,
  onOpenUpdateDialog,
}: FooterActionsProps) {
  const isChatboxOpen = useChatboxStore((s) => s.isOpen);
  const toggleChatbox = useChatboxStore((s) => s.toggle);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="xs"
        className={`h-8 w-8 p-0 ${isTerminalOpen ? 'text-primary' : ''}`}
        onClick={onToggleTerminal}
        title={isTerminalOpen ? 'Close Terminal' : 'Open Terminal'}
      >
        <TerminalSquare className="size-4.5" />
      </Button>
       <Button
        variant="ghost"
        size="xs"
        className={`h-8 w-8 p-0 ${isChatboxOpen ? 'text-primary hover:text-primary' : ''}`}
        onClick={toggleChatbox}
        title="AI Assistant"
      >
        <MessageSquare className="size-4" />
      </Button>

      <div className='h-6 px-1'>
        <Separator orientation="vertical" className="h-6" />
      </div>
     
      {updateAvailable && !updateInstalled && (
        <Button
          variant="ghost"
          size="xs"
          className="h-8 px-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          title={`Update to v${updateVersion}`}
          onClick={onOpenUpdateDialog}
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
              await existing.unminimize();
              await existing.show();
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
      <Button
        variant="ghost"
        size="xs"
        className="h-8 w-8 p-0"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </div>
  );
}
