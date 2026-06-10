import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';

import { useAppStore } from '@/stores/app';
import { useNavStore } from '@/stores/nav';

export function useTopNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const navRef = React.useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = React.useState(false);
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const blinkingItems = useNavStore((state) => state.blinkingItems);

  React.useEffect(() => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    const updateScrollIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = nav;

      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    updateScrollIndicators();

    nav.addEventListener('scroll', updateScrollIndicators);

    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(nav);

    return () => {
      nav.removeEventListener('scroll', updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, []);

  const handleMouseDown = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (event.buttons === 1) {
      setIsDraggingWindow(true);
      invoke('safe_start_dragging').catch(() => {
        // guarded by Rust catch_unwind — will not panic the process
      });
    }
  }, []);

  const stopDraggingWindow = React.useCallback(() => {
    setIsDraggingWindow(false);
  }, []);

  return {
    blinkingItems,
    canScrollLeft,
    canScrollRight,
    handleMouseDown,
    isDraggingWindow,
    navRef,
    pathname,
    proxyStatus,
    stopDraggingWindow,
  };
}
