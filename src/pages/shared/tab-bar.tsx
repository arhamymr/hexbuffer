'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageTabItem {
  id: string;
  name: string;
  disabled?: boolean;
}

interface PageTabBarProps {
  tabs: PageTabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose?: (id: string) => void;
}

export function PageTabBar({ tabs, activeTabId, onTabChange, onTabClose }: PageTabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const updateScrollIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;

      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    updateScrollIndicators();

    scrollContainer.addEventListener('scroll', updateScrollIndicators);

    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(scrollContainer);

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, [tabs]);

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 overflow-x-auto bg-muted/30"
      >
        <div className="flex min-w-full w-max items-center gap-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                'flex min-w-max shrink-0 items-center gap-1 rounded-t-md border text-sm transition-colors',
                tab.disabled
                  ? 'text-muted-foreground/60'
                  : 'hover:bg-muted/50',
                activeTabId === tab.id
                  ? 'bg-background font-medium border-x border-t border-green-500 shadow-xl text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <button
                type="button"
                className={cn(
                  'min-w-max py-2 pl-2',
                  tab.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                )}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                disabled={tab.disabled}
              >
                <span className="block whitespace-nowrap text-xs">{tab.name}</span>
              </button>
              {onTabClose && !tab.disabled && (
                <button
                  type="button"
                  className="mr-1 rounded-sm p-1 hover:bg-muted"
                  onClick={() => onTabClose(tab.id)}
                  aria-label={`Close ${tab.name}`}
                  title="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity',
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent transition-opacity',
          canScrollRight ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}
