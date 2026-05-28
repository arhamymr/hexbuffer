import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TitlebarButtons({ isFullscreen }: { isFullscreen: boolean }) {
  return (
    <div className="ml-1 flex items-center border-l pl-1">
      <Button
        id="titlebar-minimize"
        variant="ghost"
        size="xs"
        className="h-8 w-8 p-0"
        title="Minimize"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        id="titlebar-maximize"
        variant="ghost"
        size="xs"
        className="h-8 w-8 p-0"
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
      </Button>
      <Button
        id="titlebar-close"
        variant="ghost"
        size="xs"
        className="p-2 hover:bg-destructive hover:text-destructive-foreground/80 dark:hover:bg-destructive/80"
        title="Close"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
