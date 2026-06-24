import React, { useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { useTerminalInstance } from '../hooks/use-terminal-instance';
import type { TerminalInstanceHandle, TerminalStatus } from '../types';

interface TerminalInstanceProps {
  isActive: boolean;
  onStatusChange?: (status: TerminalStatus, error?: string) => void;
}

export const TerminalInstance = React.forwardRef<TerminalInstanceHandle, TerminalInstanceProps>(
  function TerminalInstance({ isActive, onStatusChange }, ref) {
    const { containerRef, handle, status, errorMsg, bgColor } = useTerminalInstance({
      isActive,
      onStatusChange,
    });

    useImperativeHandle(ref, () => handle, [handle]);

    return (
      <div className={cn('absolute inset-0', !isActive && 'hidden')}>
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
            Loading terminal...
          </div>
        )}
        {status === 'error' && (
          <div className={cn('absolute inset-0 z-20 flex items-center justify-center p-4 text-red-400', bgColor)}>
            <div className="text-center">
              <p className="mb-2 text-lg font-semibold">Terminal Error</p>
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className={cn('absolute inset-0', bgColor)} />
      </div>
    );
  },
);
