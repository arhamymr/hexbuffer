import { Copy, AlertTriangle, Info, AlertCircle, Bug, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConsoleLevelBadge } from '@/components/status-badge';
import type { InspectorConsoleLog } from '../types';
import { toast } from 'sonner';

const levelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  log: Terminal,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  debug: Bug,
  pageerror: AlertCircle,
};

interface LogDetailPanelProps {
  log: InspectorConsoleLog | null;
}

export function LogDetailPanel({ log }: LogDetailPanelProps) {
  if (!log) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Terminal className="mx-auto size-8 opacity-30" />
          <p className="mt-2 text-xs">Select a log entry to view details</p>
        </div>
      </div>
    );
  }

  const LevelIcon = levelIcons[log.level] ?? Terminal;

  const handleCopy = () => {
    navigator.clipboard.writeText(log.text).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Failed to copy')
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b bg-muted px-3 py-2">
        <LevelIcon className="size-4 shrink-0 text-foreground" />
        <ConsoleLevelBadge level={log.level} />
        <Button
          variant="outline"
          size="xs"
          className="h-6 ml-auto"
          onClick={handleCopy}
        >
          <Copy className="size-3 mr-1" />
          Copy
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {log.url && (
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              URL
            </div>
            <div className="text-xs font-mono text-muted-foreground break-all bg-muted/50 rounded px-2 py-1.5">
              {log.url}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Timestamp
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            {new Date(log.timestamp).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              fractionalSecondDigits: 3,
            } as Intl.DateTimeFormatOptions)}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Message
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded bg-muted/50 p-3 text-foreground leading-relaxed max-h-[calc(100vh-320px)] overflow-auto">
            {log.text}
          </pre>
        </div>
      </div>
    </div>
  );
}
