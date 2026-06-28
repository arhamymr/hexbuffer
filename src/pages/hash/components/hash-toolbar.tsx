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
    <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
      <ToggleGroup
        type="single"
        value={activeType}
        onValueChange={(v) => {
          if (v) onTypeChange(v as HashType);
        }}
      >
        {HASH_OPTIONS.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            size="sm"
            className="text-[10px] h-7 px-2"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
          disabled={!output}
          className="h-7 text-xs gap-1 px-2"
        >
          <CopyIcon className="h-3 w-3" />
          CopyIcon Output
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          disabled={isEmpty}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
