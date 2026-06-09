import * as React from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

/** Minimum percentage the terminal panel should occupy when opened. */
const TERMINAL_OPEN_MIN_PCT = 22;

export function useAppLayout() {
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = React.useState(false);
  const assistantPanelRef = React.useRef<PanelImperativeHandle>(null);
  const terminalPanelRef = React.useRef<PanelImperativeHandle>(null);

  const toggleAssistant = React.useCallback(() => {
    setIsAssistantOpen((current) => {
      const next = !current;
      const panel = assistantPanelRef.current;
      if (panel) {
        if (next) {
          panel.expand();
        } else {
          panel.collapse();
        }
      }
      return next;
    });
  }, []);

  const toggleTerminal = React.useCallback(() => {
    setIsTerminalOpen((current) => {
      const next = !current;
      const panel = terminalPanelRef.current;
      if (panel) {
        if (next) {
          // resize() guarantees at least TERMINAL_OPEN_MIN_PCT %,
          // regardless of where the panel was before collapsing.
          panel.resize(TERMINAL_OPEN_MIN_PCT);
        } else {
          panel.collapse();
        }
      }
      return next;
    });
  }, []);

  // Collapse terminal panel on mount (defaultSize renders it expanded initially)
  React.useEffect(() => {
    if (!isTerminalOpen && terminalPanelRef.current) {
      terminalPanelRef.current.collapse();
    }
  }, [isTerminalOpen]);

  return {
    isAssistantOpen,
    toggleAssistant,
    assistantPanelRef,
    isTerminalOpen,
    toggleTerminal,
    terminalPanelRef,
  };
}
