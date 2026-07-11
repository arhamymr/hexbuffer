import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DIFF_MODE_OPTIONS } from '../constants';
import { type DiffMode } from '../types';
import {
  GitDiffIcon,
  ArrowsLeftRightIcon,
  TrashIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon
} from '@phosphor-icons/react';

interface ComparerToolbarProps {
  hasContent: boolean;
  hasDiff: boolean;
  diffMode: DiffMode;
  setDiffMode: (mode: DiffMode) => void;
  showInputs: boolean;
  setShowInputs: (show: boolean) => void;
  handleSwap: () => void;
  handleClear: () => void;
  handleCopy: () => void;
  valueA: string;
  valueB: string;
  copyPanel: (value: string, label: string) => void;
}

export function ComparerToolbar({
  hasContent,
  hasDiff,
  diffMode,
  setDiffMode,
  showInputs,
  setShowInputs,
  handleSwap,
  handleClear,
  handleCopy,
  valueA,
  valueB,
  copyPanel,
}: ComparerToolbarProps) {
  // ponytail: kept simple with inline event handlers to minimize abstraction overhead.
  return (
    <div className="flex h-10 shrink-0 items-center justify-between  border border-b-0 rounded-t-md bg-muted/40 px-3">

      <div className='flex items-center gap-2'>
        {/* Diff Mode Select */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Mode:</span>
          <Select
            value={diffMode}
            onValueChange={(val) => setDiffMode(val as DiffMode)}
          >
            <SelectTrigger className="h-6 w-20 text-[11px] px-2 py-0 [&_svg]:size-3 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFF_MODE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-[11px]">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Toggle Inputs */}
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowInputs(!showInputs)}
          className="h-6 text-[11px] gap-1.5 px-2"
        >
          {showInputs ? <EyeSlashIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
          {showInputs ? 'Hide Inputs' : 'Show Inputs'}
        </Button>

        {/* Swap */}
        <Button
          variant="outline"
          size="xs"
          onClick={handleSwap}
          disabled={!hasContent}
          className="h-6 text-[11px] gap-1.5 px-2"
        >
          <ArrowsLeftRightIcon className="h-3 w-3" />
          Swap A/B
        </Button>


      </div>
      <div className='flex items-center gap-2'>
        {/* Copy original/modified */}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => copyPanel(valueA, 'Original (A)')}
          disabled={!valueA}
          className="h-6 text-[11px] gap-1.5 px-2"
        >
          <CopyIcon className="h-3 w-3" />
          Copy A
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => copyPanel(valueB, 'Modified (B)')}
          disabled={!valueB}
          className="h-6 text-[11px] gap-1.5 px-2"
        >
          <CopyIcon className="h-3 w-3" />
          Copy B
        </Button>

        {/* Copy Unified Diff */}
        <Button
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          disabled={!hasDiff}
          className="h-6 text-[11px] gap-1.5 px-2"
        >
          <CopyIcon className="h-3 w-3" />
          Copy Diff
        </Button>

        {/* Clear */}
        <Button
          variant="outline"
          size="xs"
          onClick={handleClear}
          disabled={!hasContent}
          className="h-6 text-[11px] gap-1.5 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <TrashIcon className="h-3 w-3" />
          Clear All
        </Button>

      </div>

    </div>
  );
}
