import * as React from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

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
          panel.expand();
        } else {
          panel.collapse();
        }
      }
      return next;
    });
  }, []);

  return {
    isAssistantOpen,
    toggleAssistant,
    assistantPanelRef,
    isTerminalOpen,
    toggleTerminal,
    terminalPanelRef,
  };
}
