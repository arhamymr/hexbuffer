import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { XssPayloadCategory, XssPayload } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface PayloadLibraryPanelProps {
  activeCategory: XssPayloadCategory;
  onCategoryChange: (cat: XssPayloadCategory) => void;
  filteredPayloads: XssPayload[];
  onSelectPayload: (payload: XssPayload) => void;
}

export function PayloadLibraryPanel({
  activeCategory,
  onCategoryChange,
  filteredPayloads,
  onSelectPayload,
}: PayloadLibraryPanelProps) {
  return (
    <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
      <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            Payload Library
          </span>
        </div>
      </div>
      <div className="border-b px-2 py-1.5 bg-muted/5">
        <Tabs
          value={activeCategory}
          onValueChange={(v) => onCategoryChange(v as XssPayloadCategory)}
        >
          <TabsList className="h-7 bg-background p-0.5 border w-full grid grid-cols-5">
            {(Object.keys(CATEGORY_LABELS) as XssPayloadCategory[]).map((cat) => (
              <TabsTrigger key={cat} value={cat} className="h-6 text-[10px] px-1 truncate">
                {CATEGORY_LABELS[cat]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y border-t-0">
          {filteredPayloads.map((p) => (
            <button
              key={p.id}
              className="w-full cursor-pointer px-3 py-2 text-left transition-colors hover:bg-muted/50 block border-b last:border-b-0"
              onClick={() => onSelectPayload(p)}
            >
              <span className="block truncate font-mono text-[11px]">{p.payload}</span>
              <span className="mt-0.5 block text-[9px] text-muted-foreground font-medium">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
