import { Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOpenBrowserButton } from './hooks/use-open-browser-button';

export function OpenBrowserButton() {
  const {
    handleMouseEnter,
    handleMouseLeave,
    isOpeningBrowser,
    openBrowser,
    openBrowserTitle,
    showLabel,
  } = useOpenBrowserButton();

  return (
    <Button
      variant="outline"
      size="xs"
      className="h-6 p-0 gap-0"
      onClick={openBrowser}
      disabled={isOpeningBrowser}
      title={openBrowserTitle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isOpeningBrowser ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        <Globe className="h-4 w-4 shrink-0" />
      )}
      <span
        className={cn(
          'transition-all duration-300 overflow-hidden whitespace-nowrap',
          showLabel ? 'max-w-32 opacity-100 ml-2 ' : 'max-w-0 opacity-0',
        )}
      >
        OPEN BROWSER
      </span>
    </Button>
  );
}
