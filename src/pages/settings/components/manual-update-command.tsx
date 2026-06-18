import * as React from 'react';
import { CheckIcon, ClipboardIcon, TerminalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

const MANUAL_UPDATE_COMMAND = 'curl -fsSLO https://dist.hexbuffer.com/install.sh && bash install.sh';

interface ManualUpdateCommandProps {
  className?: string;
  message?: string;
}

export function ManualUpdateCommand({ className, message }: ManualUpdateCommandProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    const ok = await copyText(MANUAL_UPDATE_COMMAND);

    if (!ok) {
      toast.error('Failed to copy update command');
      return;
    }

    setCopied(true);
    toast.success('Update command copied');
    window.setTimeout(() => setCopied(false), 1600);
  }, []);

  return (
    <div className={cn('space-y-2 rounded-md border bg-muted/30 p-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <TerminalIcon className="size-4 text-muted-foreground" />
        Manual update command
      </div>
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all rounded-md bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
          {MANUAL_UPDATE_COMMAND}
        </code>
        <Button variant="outline" onClick={handleCopy}>
          {copied ? (
            <CheckIcon className="mr-2 size-4" />
          ) : (
            <ClipboardIcon className="mr-2 size-4" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
