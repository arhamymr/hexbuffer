import { useDesktopPage } from './hooks/use-desktop-page';
import { ProxyWidget } from './components/proxy-widget';
import { ScratchpadWidget } from './components/scratchpad-widget';
import { CollectionsWidget } from './components/collections-widget';
import { ClipboardWidget } from './components/clipboard-widget';
import { DesktopIconItem } from './components/desktop-icon-item';
import { Button } from '@/components/ui/button';
import { ShieldWarningIcon } from '@phosphor-icons/react';
import { useAppSettingsStore } from '@/stores/app-settings-store';

export function DesktopPage() {
  const {
    displayItems,
    handleItemClick,
    handleClearSearch,
  } = useDesktopPage();
  const bgType = useAppSettingsStore((s) => s.bgType);

  const rootBg = bgType === 'none' ? 'bg-background' : 'bg-transparent';

  return (
    <div className={`${rootBg} flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin`}>
      <div className="mx-auto w-full p-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
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
                Clear MagnifyingGlassIcon
              </Button>
            </div>
          )}
        </div>

        <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-4">
          <CollectionsWidget />
          <ProxyWidget />
          <ScratchpadWidget />
          <ClipboardWidget />
        </div>
      </div>
    </div>
  );
}

