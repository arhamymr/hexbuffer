'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PayloadChecklistProps {
  payloads: string[];
  selectedPayloads: Set<string>;
  emptyText?: string;
  onTogglePayload: (payload: string) => void;
}

export function PayloadChecklist({
  payloads,
  selectedPayloads,
  emptyText = 'No payloads available.',
  onTogglePayload,
}: PayloadChecklistProps) {
  return (
    <ScrollArea className="h-[226px] rounded-md border">
      {payloads.length === 0 ? (
        <p className="p-3 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="flex flex-col p-1">
          {payloads.map((payload) => (
            <label key={payload} className="flex cursor-pointer items-start gap-2 rounded p-2 hover:bg-muted/50">
              <Checkbox checked={selectedPayloads.has(payload)} onCheckedChange={() => onTogglePayload(payload)} />
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={payload}>
                {payload}
              </span>
            </label>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
