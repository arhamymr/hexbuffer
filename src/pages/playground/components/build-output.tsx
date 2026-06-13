import { Loader2, Trash2 } from 'lucide-react';
import type { CommandOutput } from '../types';

interface BuildOutputProps {
  output: CommandOutput | null;
  isBuilding: boolean;
  lastCommand: string;
  onClear: () => void;
}

export function BuildOutput({ output, isBuilding, lastCommand, onClear }: BuildOutputProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Output
          </span>
          {isBuilding && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
          {output && !isBuilding && (
            <span
              className={`text-[11px] font-mono ${
                output.success ? 'text-green-400' : 'text-red-400'
              }`}
            >
              exit {output.exitCode}
            </span>
          )}
          {lastCommand && (
            <span className="truncate text-[11px] text-zinc-600">$ {lastCommand}</span>
          )}
        </div>
        <button
          className="rounded p-0.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          onClick={onClear}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-auto p-3">
        {isBuilding && !output ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Building...
          </div>
        ) : output ? (
          <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all text-zinc-300">
            {output.stdout && (
              <span className="text-zinc-300">{output.stdout}</span>
            )}
            {output.stderr && (
              <span className={output.success ? 'text-amber-400' : 'text-red-400'}>
                {output.stderr}
              </span>
            )}
            {!output.stdout && !output.stderr && (
              <span className="text-zinc-500">(no output)</span>
            )}
          </pre>
        ) : (
          <p className="text-sm text-zinc-600">
            Build or run your project to see output here.
          </p>
        )}
      </div>
    </div>
  );
}
