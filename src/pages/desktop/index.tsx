import { useDesktopPage } from './hooks/use-desktop-page';
import { ProxyWidget } from './components/proxy-widget';
import { VpnWidget } from './components/vpn-widget';
import { ScratchpadWidget } from './components/scratchpad-widget';
import { CollectionsWidget } from './components/collections-widget';
import { ClipboardWidget } from './components/clipboard-widget';
import { DesktopIconItem } from './components/desktop-icon-item';
import { Button } from '@/components/ui/button';
import { ShieldWarningIcon, GearSixIcon } from '@phosphor-icons/react';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { ShortcutManager } from './components/shortcut-manager';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function DesktopPage() {
  const {
    displayItems,
    handleItemClick,
    handleClearSearch,
  } = useDesktopPage();
  const hiddenWidgets = useAppSettingsStore((s) => s.hiddenWidgets || []);

  const rootBg = 'bg-transparent';

  // ponytail: filter out widgets that have been hidden by the user
  const showCollections = !hiddenWidgets.includes('collections');
  const showProxy = !hiddenWidgets.includes('proxy');
  const showVpn = !hiddenWidgets.includes('vpn');
  const showScratchpad = !hiddenWidgets.includes('scratchpad');
  const showClipboard = !hiddenWidgets.includes('clipboard');
  const hasVisibleWidgets = showCollections || showProxy || showVpn || showScratchpad || showClipboard;

  return (
    <div className={`${rootBg} flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin`}>
      <div className="mx-auto w-full p-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-4 max-w-[800px] border-b pb-2 border-border/40">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="xs" variant="ghost" className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60">
                  <GearSixIcon className="mr-1 size-3.5" />
                  Manage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Manage Desktop</DialogTitle>
                  <DialogDescription>
                    Toggle visibility of shortcuts and widgets on your desktop workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-2">
                  <ShortcutManager />
                </div>
              </DialogContent>
            </Dialog>
            <p className="text-[11px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Shortcuts</p>

          </div>

          {displayItems.length > 0 ? (
            <div className="flex max-w-[800px] flex-wrap gap-3 justify-items-center">
              {displayItems.map((item) => (
                <DesktopIconItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  onClick={handleItemClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-lg border border-dashed border-border/80 bg-muted/20 backdrop-blur-sm">
              <ShieldWarningIcon className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No features matched your search</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching for another keyword or clear the search input.</p>
              <Button
                variant="link"
                onClick={handleClearSearch}
                className="mt-2 text-xs font-semibold text-primary hover:underline h-auto p-0"
              >
                Clear search query
              </Button>
            </div>
          )}
        </div>

        {hasVisibleWidgets && (
          <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-4">
            {showCollections && <CollectionsWidget />}
            {showProxy && <ProxyWidget />}
            {showVpn && <VpnWidget />}
            {showScratchpad && <ScratchpadWidget />}
            {showClipboard && <ClipboardWidget />}
          </div>
        )}
      </div>
    </div>
  );
}

