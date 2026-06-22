import { useOverviewPage } from './hooks/use-overview-page';
import { ClockWidget } from './components/clock-widget';
import { ProxyWidget } from './components/proxy-widget';
import { WallpaperWidget } from './components/wallpaper-widget';
import { ScratchpadWidget } from './components/scratchpad-widget';
import { DesktopIconItem } from './components/desktop-icon-item';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import '@/styles/overview-wallpaper.css';

export function OverviewPage() {
  const {
    wallpaperType,
    setWallpaperType,
    wallpaperUrl,
    setWallpaperUrl,
    displayItems,
    wallpaperBackgroundStyle,
    handleItemClick,
    handleClearSearch,
  } = useOverviewPage();

  return (
    <div
      className="os-desktop-wallpaper flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin transition-colors duration-300"
      style={wallpaperBackgroundStyle}
    >
      <div className="mx-auto w-full px-6 py-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
          {displayItems.length > 0 ? (
            <div className="flex max-w-[800px] flex-wrap gap-3 justify-items-center">
              {displayItems.map((item) => (
                <DesktopIconItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  devOnly={item.devOnly}
                  onClick={handleItemClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-lg border border-dashed border-border/80 bg-muted/20 backdrop-blur-sm">
              <ShieldAlert className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No features matched your search</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching for another keyword or clear the search input.</p>
              <Button
                variant="link"
                onClick={handleClearSearch}
                className="mt-2 text-xs font-semibold text-primary hover:underline h-auto p-0"
              >
                Clear Search
              </Button>
            </div>
          )}
        </div>

        <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-4">
          <ClockWidget />
          <ProxyWidget />
          <WallpaperWidget
            wallpaperType={wallpaperType}
            setWallpaperType={setWallpaperType}
            wallpaperUrl={wallpaperUrl}
            setWallpaperUrl={setWallpaperUrl}
          />
          <ScratchpadWidget />
        </div>
      </div>
    </div>
  );
}

