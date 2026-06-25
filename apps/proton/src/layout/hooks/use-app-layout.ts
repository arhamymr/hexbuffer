import * as React from 'react';
import { useGlobalTerminalStore } from '@/stores/global-terminal';

export function useAppLayout() {
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

  return {
    isTerminalOpen,
    toggleTerminal,
  };
}
