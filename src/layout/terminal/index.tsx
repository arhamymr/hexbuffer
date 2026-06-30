import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavStore } from '@/stores/nav';
import { useGlobalTerminalStore } from '@/stores/global-terminal';
import { TerminalPanel } from './components/terminal-panel';
import type { TerminalPanelHandle } from './types';

export { TerminalPanel } from './components/terminal-panel';
export type { TerminalPanelHandle } from './types';

export function TerminalPage() {
  const navigate = useNavigate();
  const closeWindow = useNavStore((state) => state.closeWindow);
  const setTerminalHandle = useGlobalTerminalStore((s) => s.setTerminalHandle);

  const handleTerminalRef = React.useCallback(
    (handle: TerminalPanelHandle | null) => {
      setTerminalHandle(handle);
    },
    [setTerminalHandle],
  );

  React.useEffect(() => {
    return () => setTerminalHandle(null);
  }, [setTerminalHandle]);

  return (
    <div className="h-full overflow-hidden bg-background">
      <TerminalPanel ref={handleTerminalRef} onClosePanel={() => closeWindow('/terminal', navigate)} />
    </div>
  );
}
