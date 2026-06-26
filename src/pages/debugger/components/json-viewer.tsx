import { useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function JsonViewer({ data, onCopyRef }: { data: unknown; onCopyRef?: (fn: () => void) => void }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const copyPayload = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, [text]);

  // Expose copy function to parent via ref-style callback
  useMemo(() => {
    onCopyRef?.(copyPayload);
  }, [onCopyRef, copyPayload]);

  return (
    <ScrollArea className="h-full">
      <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground leading-relaxed">
        {text}
      </pre>
    </ScrollArea>
  );
}
