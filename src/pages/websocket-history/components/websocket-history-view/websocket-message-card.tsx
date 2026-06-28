import { useState, useMemo, useCallback } from 'react';
import { CopyIcon, CheckIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WebSocketMessage } from '@/pages/websocket-history/hooks/use-websocket-detail';
import { formatBytes } from '@/pages/http-history/components/log-table/utils';
import { formatHexDump } from '../../utils';

interface WebSocketMessageCardProps {
  message: WebSocketMessage;
  formatDateTime: (value: string) => string;
}

export function WebSocketMessageCard({ message, formatDateTime }: WebSocketMessageCardProps) {
  const [copied, setCopied] = useState(false);

  // CheckIcon if payload is valid JSON and pretty print it
  const jsonPayload = useMemo(() => {
    if (!message.payload) return null;
    const trimmed = message.payload.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return null;
    }
  }, [message.payload]);

  // Determine initial view mode based on message type and JSON validity
  const initialMode = useMemo(() => {
    if (message.type.toLowerCase() === 'binary') {
      return 'hex';
    }
    return jsonPayload ? 'json' : 'text';
  }, [message.type, jsonPayload]);

  const [viewMode, setViewMode] = useState<'text' | 'json' | 'hex'>(initialMode);

  const handleCopy = useCallback(() => {
    let textToCopy = message.payload;
    if (viewMode === 'json' && jsonPayload) {
      textToCopy = jsonPayload;
    } else if (viewMode === 'hex' && message.rawPayload) {
      textToCopy = formatHexDump(message.rawPayload);
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [viewMode, jsonPayload, message.payload, message.rawPayload]);

  const renderedContent = useMemo(() => {
    if (viewMode === 'json' && jsonPayload) {
      return jsonPayload;
    }
    if (viewMode === 'hex' && message.rawPayload) {
      return formatHexDump(message.rawPayload);
    }
    return message.payload || '(empty payload)';
  }, [viewMode, jsonPayload, message.payload, message.rawPayload]);

  const isDirectionOutbound = message.direction === 'outbound';

  return (
    <div className={`rounded-md border bg-background transition-shadow hover:shadow-sm ${
      isDirectionOutbound ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'
    }`}>
      <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs bg-muted/10">
        <span
          className={`rounded font-semibold px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
            isDirectionOutbound
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'bg-green-500/10 text-green-600 dark:text-green-400'
          }`}
        >
          {message.direction}
        </span>
        <span className="uppercase font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {message.type}
        </span>
        <span className="text-muted-foreground text-[10px]">{formatBytes(message.size)}</span>
        
        {/* View Mode Tabs */}
        <div className="flex items-center ml-2 border rounded overflow-hidden divide-x bg-background scale-[0.9] origin-left">
          <button
            type="button"
            onClick={() => setViewMode('text')}
            className={`px-2 py-0.5 text-[10px] transition-colors ${
              viewMode === 'text' ? 'bg-muted font-medium' : 'hover:bg-muted/40'
            }`}
          >
            Text
          </button>
          {jsonPayload && (
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`px-2 py-0.5 text-[10px] transition-colors ${
                viewMode === 'json' ? 'bg-muted font-medium' : 'hover:bg-muted/40'
              }`}
            >
              JSON
            </button>
          )}
          {message.rawPayload && message.rawPayload.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode('hex')}
              className={`px-2 py-0.5 text-[10px] transition-colors ${
                viewMode === 'hex' ? 'bg-muted font-medium' : 'hover:bg-muted/40'
              }`}
            >
              Hex
            </button>
          )}
        </div>

        {jsonPayload && <Badge variant="secondary" className="scale-[0.8] origin-left font-mono">JSON</Badge>}

        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{formatDateTime(message.timestamp)}</span>
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCopy}
          className="size-5 ml-1 text-muted-foreground hover:text-foreground shrink-0"
          title="CopyIcon payload"
        >
          {copied ? <CheckIcon className="size-3 text-green-600" /> : <CopyIcon className="size-3" />}
        </Button>
      </div>
      <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all max-h-60 overflow-auto bg-muted/5 text-foreground leading-relaxed selection:bg-primary/20">
        {renderedContent}
      </pre>
    </div>
  );
}
