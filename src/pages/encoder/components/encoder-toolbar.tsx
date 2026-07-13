import { ButtonGroup } from '@/components/ui/button-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowsLeftRightIcon, CopyIcon, TrashIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { CodecType, CodecMode } from '../types';
import { CODEC_LABELS } from '../constants';

interface EncoderToolbarProps {
  activeType: CodecType;
  onTypeChange: (v: CodecType) => void;
  mode: CodecMode;
  onModeChange: (v: CodecMode) => void;
  currentMode: { source: string; target: string; action: string };
  output: string;
  isEmpty: boolean;
  onSwap: () => void;
  onCopy: () => void;
  onClear: () => void;
}

export function EncoderToolbar({
  activeType,
  onTypeChange,
  mode,
  onModeChange,
  currentMode,
  output,
  isEmpty,
  onSwap,
  onCopy,
  onClear,
}: EncoderToolbarProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
      <div className="flex items-center gap-2">
        <ButtonGroup>
          <Button
            variant="outline"
            className={cn(
              'hover:text-green-500 ',
              activeType === 'url' && 'text-green-500',
            )}
            data-state={activeType === 'url' ? 'on' : 'off'}
            onClick={() => onTypeChange('url')}
          >
            URL
          </Button>
          <Button
            variant="outline"
            className={cn(
              'hover:text-green-500 h-6 text-xs px-2.5',
              activeType === 'base64' && 'text-green-500',
            )}
            data-state={activeType === 'base64' ? 'on' : 'off'}
            onClick={() => onTypeChange('base64')}
          >
            Base64
          </Button>
          <Button
            variant="outline"
            className={cn(
              'hover:text-green-500 h-6 text-xs px-2.5',
              activeType === 'hex' && 'text-green-500',
            )}
            data-state={activeType === 'hex' ? 'on' : 'off'}
            onClick={() => onTypeChange('hex')}
          >
            Hex
          </Button>
        </ButtonGroup>

        <ButtonGroup>
          <Button
            variant="outline"
            className={cn(
              'hover:text-green-500 h-6 text-xs px-2.5',
              mode === 'encode' && 'text-green-500',
            )}
            data-state={mode === 'encode' ? 'on' : 'off'}
            onClick={() => onModeChange('encode')}
          >
            Encode
          </Button>
          <Button
            variant="outline"
            className={cn(
              'hover:text-green-500 h-6 text-xs px-2.5',
              mode === 'decode' && 'text-green-500',
            )}
            data-state={mode === 'decode' ? 'on' : 'off'}
            onClick={() => onModeChange('decode')}
          >
            Decode
          </Button>
        </ButtonGroup>

        <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 h-5 bg-blue-500/5 text-blue-500 border-blue-500/20 rounded font-normal hidden md:inline-flex">
          {CODEC_LABELS[activeType]}
        </Badge>
        <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 h-5 bg-emerald-500/5 text-emerald-500 border-emerald-500/20 rounded font-normal hidden md:inline-flex">
          {currentMode.source} → {currentMode.target}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onSwap} className="h-7 text-xs gap-1 px-2">
          <ArrowsLeftRightIcon className="h-3 w-3" />
          Swap
        </Button>
        <Button variant="outline" size="sm" onClick={onCopy} disabled={!output} className="h-7 text-xs gap-1 px-2">
          <CopyIcon className="h-3 w-3" />
          Copy Output
        </Button>
        <Button variant="ghost" size="icon" onClick={onClear} disabled={isEmpty} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <TrashIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
