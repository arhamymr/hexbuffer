import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageTabItem } from './types';

interface UseTabBarOptions {
  tabs: PageTabItem[];
  onTabRename?: (id: string, name: string) => void;
  onTabChange: (id: string) => void;
}

export function useTabBar({ tabs, onTabRename, onTabChange }: UseTabBarOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  useEffect(() => {
    if (editingTabId) {
      requestAnimationFrame(() => {
        editingInputRef.current?.focus();
        editingInputRef.current?.select();
      });
    }
  }, [editingTabId]);

  useEffect(() => {
    if (editingTabId && !tabs.some((tab) => tab.id === editingTabId)) {
      setEditingTabId(null);
      setEditingName('');
    }
  }, [editingTabId, tabs]);

  const startEditingTab = useCallback((tab: PageTabItem) => {
    if (!onTabRename || tab.disabled) {
      return;
    }

    setEditingTabId(tab.id);
    setEditingName(tab.name);
    onTabChange(tab.id);
  }, [onTabRename, onTabChange]);

  const finishEditingTab = useCallback(() => {
    if (!editingTabId) {
      return;
    }

    const nextName = editingName.trim();
    const tab = tabs.find((item) => item.id === editingTabId);

    if (nextName && tab && nextName !== tab.name) {
      onTabRename?.(editingTabId, nextName);
    }

    setEditingTabId(null);
    setEditingName('');
  }, [editingTabId, editingName, tabs, onTabRename]);

  const cancelEditingTab = useCallback(() => {
    setEditingTabId(null);
    setEditingName('');
  }, []);

  return {
    scrollContainerRef,
    editingInputRef,
    canScrollLeft,
    canScrollRight,
    editingTabId,
    editingName,
    setEditingTabId,
    setEditingName,
    startEditingTab,
    finishEditingTab,
    cancelEditingTab,
  };
}
