import { useState, useCallback, useRef, useEffect } from 'react';
import * as api from '../../../api';
import { getLanguageFromPath } from '../../../types';
import type { OpenTab } from '../../../types';

export interface SecondaryPane {
  id: string;
  tabs: OpenTab[];
  activePath: string | null;
  dirty: Record<string, boolean>;
}

export type SecondaryLayout =
  | { type: 'leaf'; pane: SecondaryPane }
  | { type: 'split'; left: SecondaryLayout; right: SecondaryLayout };

export function collectLeaves(layout: SecondaryLayout | null): SecondaryPane[] {
  if (!layout) return [];
  if (layout.type === 'leaf') return [layout.pane];
  return [...collectLeaves(layout.left), ...collectLeaves(layout.right)];
}

export function updateLeaf(
  layout: SecondaryLayout,
  paneId: string,
  updater: (pane: SecondaryPane) => SecondaryPane,
): SecondaryLayout {
  if (layout.type === 'leaf') {
    return layout.pane.id === paneId
      ? { ...layout, pane: updater(layout.pane) }
      : layout;
  }
  return {
    ...layout,
    left: updateLeaf(layout.left, paneId, updater),
    right: updateLeaf(layout.right, paneId, updater),
  };
}

interface UseCodeEditorProps {
  tabs: OpenTab[];
  activeTabPath: string | null;
  workspacePath?: string;
  onTabClose: (path: string) => void;
  onSave: (path: string) => void;
}

export function useCodeEditor({
  tabs,
  activeTabPath,
  workspacePath,
  onTabClose,
  onSave,
}: UseCodeEditorProps) {
  const [pendingClose, setPendingClose] = useState<OpenTab | null>(null);

  const handleTabClose = useCallback(
    (tab: OpenTab) => {
      if (tab.isDirty) {
        setPendingClose(tab);
      } else {
        onTabClose(tab.path);
      }
    },
    [onTabClose],
  );

  const confirmClose = useCallback(() => {
    if (pendingClose) {
      onTabClose(pendingClose.path);
      setPendingClose(null);
    }
  }, [pendingClose, onTabClose]);

  const nextPaneIdSeq = useRef(0);
  const newPaneId = useCallback(() => {
    nextPaneIdSeq.current += 1;
    return `sp-${nextPaneIdSeq.current}`;
  }, []);

  function splitLeaf(layout: SecondaryLayout, paneId: string): SecondaryLayout {
    if (layout.type === 'leaf') {
      if (layout.pane.id === paneId) {
        return {
          type: 'split',
          left: layout,
          right: {
            type: 'leaf',
            pane: { ...layout.pane, id: newPaneId(), tabs: [...layout.pane.tabs] },
          },
        };
      }
      return layout;
    }
    return {
      ...layout,
      left: splitLeaf(layout.left, paneId),
      right: splitLeaf(layout.right, paneId),
    };
  }

  function closeLeaf(layout: SecondaryLayout, paneId: string): SecondaryLayout | null {
    if (layout.type === 'leaf') {
      return layout.pane.id === paneId ? null : layout;
    }
    const newLeft = closeLeaf(layout.left, paneId);
    const newRight = closeLeaf(layout.right, paneId);
    if (newLeft === null && newRight === null) return null;
    if (newLeft === null) return newRight;
    if (newRight === null) return newLeft;
    if (newLeft === layout.left && newRight === layout.right) return layout;
    return { type: 'split', left: newLeft, right: newRight };
  }

  // ── Split view state ──
  const [secondaryLayout, setSecondaryLayout] = useState<SecondaryLayout | null>(null);
  const secondaryContentRef = useRef<Map<string, string>>(new Map());

  const handleToggleSplit = useCallback(() => {
    if (secondaryLayout) {
      setSecondaryLayout(null);
    } else if (activeTabPath) {
      const id = newPaneId();
      const tab = tabs.find((t) => t.path === activeTabPath);
      const newPane: SecondaryPane = {
        id,
        tabs: tab ? [{ ...tab, isDirty: false }] : [],
        activePath: activeTabPath,
        dirty: {},
      };
      setSecondaryLayout({ type: 'leaf', pane: newPane });
    }
  }, [secondaryLayout, activeTabPath, tabs, newPaneId]);

  const handleSplitSecondaryPane = useCallback((paneId: string) => {
    setSecondaryLayout((prev) => {
      if (!prev) return prev;
      return splitLeaf(prev, paneId);
    });
  }, [newPaneId]);

  const handleCloseSecondaryPane = useCallback((paneId: string) => {
    setSecondaryLayout((prev) => {
      if (!prev) return prev;
      return closeLeaf(prev, paneId);
    });
  }, []);

  const handleSecondaryTabChange = useCallback(
    async (paneId: string, filePath: string) => {
      setSecondaryLayout((prev) => {
        if (!prev) return prev;
        return updateLeaf(prev, paneId, (p) => ({ ...p, activePath: filePath }));
      });
      const cache = secondaryContentRef.current;
      if (cache.has(filePath)) return;
      if (!workspacePath) return;
      try {
        const result = await api.readProjectFile(filePath, workspacePath);
        cache.set(filePath, result.content);
      } catch {
        // API errors handled in api layer
      }
    },
    [workspacePath],
  );

  const handleSecondaryContentChange = useCallback(
    (paneId: string, filePath: string, content: string) => {
      secondaryContentRef.current.set(filePath, content);
      setSecondaryLayout((prev) => {
        if (!prev) return prev;
        return updateLeaf(prev, paneId, (p) => ({
          ...p,
          dirty: { ...p.dirty, [filePath]: true },
        }));
      });
    },
    [],
  );

  const handleSecondarySave = useCallback(
    async (paneId: string, filePath: string) => {
      if (!workspacePath) return;
      const content = secondaryContentRef.current.get(filePath) ?? '';
      try {
        await api.writeProjectFile(filePath, content, workspacePath);
        setSecondaryLayout((prev) => {
          if (!prev) return prev;
          return updateLeaf(prev, paneId, (p) => ({
            ...p,
            dirty: { ...p.dirty, [filePath]: false },
          }));
        });
      } catch {
        // API errors handled in api layer
      }
    },
    [workspacePath],
  );

  const handleSecondaryTabClose = useCallback((paneId: string, tabPath: string) => {
    setSecondaryLayout((prev) => {
      if (!prev) return prev;
      return updateLeaf(prev, paneId, (pane) => {
        const newTabs = pane.tabs.filter((t) => t.path !== tabPath);
        const newActivePath =
          pane.activePath === tabPath
            ? newTabs.length > 0
              ? newTabs[newTabs.length - 1].path
              : null
            : pane.activePath;
        return { ...pane, tabs: newTabs, activePath: newActivePath };
      });
    });
  }, []);

  // Keyboard shortcut: Ctrl/Cmd+S to save (detects focused pane)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const activeEl = document.activeElement as HTMLElement | null;
        // Walk secondary panes looking for focused one
        if (secondaryLayout) {
          for (const pane of collectLeaves(secondaryLayout)) {
            if (activeEl?.closest(`[data-pane="${pane.id}"]`)) {
              if (pane.activePath) {
                handleSecondarySave(pane.id, pane.activePath);
              }
              return;
            }
          }
        }
        // Fallback to primary pane
        if (activeTabPath) {
          onSave(activeTabPath);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabPath, secondaryLayout, onSave, handleSecondarySave]);

  return {
    pendingClose,
    setPendingClose,
    confirmClose,
    handleTabClose,
    secondaryLayout,
    secondaryContentRef,
    handleToggleSplit,
    handleSplitSecondaryPane,
    handleCloseSecondaryPane,
    handleSecondaryTabChange,
    handleSecondaryContentChange,
    handleSecondarySave,
    handleSecondaryTabClose,
  };
}
