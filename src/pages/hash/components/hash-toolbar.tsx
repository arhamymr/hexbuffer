import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CopyIcon, TrashIcon } from '@phosphor-icons/react';
import type { HashType } from '../types';
import { HASH_OPTIONS } from '../constants';

interface HashToolbarProps {
  activeType: HashType;
  onTypeChange: (v: HashType) => void;
  output: string;
  isEmpty: boolean;
  onCopy: () => void;
  onClear: () => void;
}

export function HashToolbar({
  activeType,
  onTypeChange,
  output,
  isEmpty,
  onCopy,
  onClear,
}: HashToolbarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b bg-muted/20 px-3 gap-3 select-none">
      {/* Hash Type Selector */}
      <ToggleGroup
        type="single"
        value={activeType}
        onValueChange={(v) => {
          if (v) onTypeChange(v as HashType);
        }}
        className="gap-1 bg-muted/50 p-0.5 rounded-md border border-border/30"
      >
        {HASH_OPTIONS.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            size="sm"
            className="text-[10px] h-7 px-2.5 rounded font-medium text-muted-foreground transition-all duration-150
              hover:text-foreground
              data-[state=on]:bg-primary/10 data-[state=on]:text-primary dark:data-[state=on]:text-emerald-400 data-[state=on]:border data-[state=on]:border-primary/20 data-[state=on]:font-semibold shadow-none"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
          disabled={!output}
          className="h-7 text-[11px] gap-1 px-2.5 font-semibold transition-all border-border"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          Copy Output
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          disabled={isEmpty}
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          title="Clear inputs and outputs"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
