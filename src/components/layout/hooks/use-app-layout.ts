import * as React from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { useGlobalTerminalStore } from '@/stores/global-terminal';

/** Minimum percentage the terminal panel should occupy when opened. */
const TERMINAL_OPEN_MIN_PCT = 22;

export function useAppLayout() {
  const terminalPanelRef = React.useRef<PanelImperativeHandle>(null);

  const isTerminalOpen = useGlobalTerminalStore((s) => s.isOpen);
  const setIsOpen = useGlobalTerminalStore((s) => s.setIsOpen);
  const requestOpenFlag = useGlobalTerminalStore((s) => s.requestOpenFlag);
  const clearRequest = useGlobalTerminalStore((s) => s.clearRequest);

  const toggleTerminal = React.useCallback(() => {
    setIsOpen(!isTerminalOpen);
  }, [isTerminalOpen, setIsOpen]);

  // Auto-open when the playground (or any consumer) requests it
  React.useEffect(() => {
    if (requestOpenFlag && !isTerminalOpen) {
      setIsOpen(true);
      clearRequest();
    }
  }, [requestOpenFlag, isTerminalOpen, setIsOpen, clearRequest]);

  // Resize / collapse the panel imperatively when isOpen changes
  React.useEffect(() => {
    const panel = terminalPanelRef.current;
    if (!panel) return;
    if (isTerminalOpen) {
      // Small delay so the ResizablePanel DOM node exists
      const id = setTimeout(() => panel.resize(TERMINAL_OPEN_MIN_PCT), 0);
      return () => clearTimeout(id);
    } else {
      panel.collapse();
    }
  }, [isTerminalOpen]);

  return {
    isTerminalOpen,
    toggleTerminal,
    terminalPanelRef,
  };
}
