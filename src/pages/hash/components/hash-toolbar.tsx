import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
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
      <ButtonGroup>
        {HASH_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant="outline"
            className={cn(
              'hover:text-green-500 h-6 text-xs px-2.5',
              activeType === opt.value && 'text-green-500',
            )}
            data-state={activeType === opt.value ? 'on' : 'off'}
            onClick={() => onTypeChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </ButtonGroup>

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
          variant="destructive"
          size="icon"
          onClick={onClear}
          disabled={isEmpty}
          className="h-7 w-7"
          title="Clear inputs and outputs"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
