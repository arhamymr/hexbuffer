import { ScrollArea } from '@/components/ui/scroll-area';
import type { XssPayload } from '../types';

interface PayloadLibraryPanelProps {
  filteredPayloads: XssPayload[];
  onSelectPayload: (payload: XssPayload) => void;
}

export function PayloadLibraryPanel({
  filteredPayloads,
  onSelectPayload,
}: PayloadLibraryPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r">
      <div className="flex h-9 shrink-0 items-center border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">Library</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {filteredPayloads.map((p) => (
            <button
              key={p.id}
              className="w-full px-3 py-2 text-left transition-colors hover:bg-muted/50"
              onClick={() => onSelectPayload(p)}
            >
              <span className="block truncate font-mono text-xs">{p.payload}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{p.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
