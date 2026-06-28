import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowsLeftRightIcon, CopyIcon, TrashIcon } from '@phosphor-icons/react';
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
        <Tabs value={activeType} onValueChange={(v) => onTypeChange(v as CodecType)}>
          <TabsList className="h-7 bg-background p-0.5 border">
            <TabsTrigger value="url" className="h-6 text-xs px-2.5">URL</TabsTrigger>
            <TabsTrigger value="base64" className="h-6 text-xs px-2.5">Base64</TabsTrigger>
            <TabsTrigger value="hex" className="h-6 text-xs px-2.5">Hex</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as CodecMode)}>
          <TabsList className="h-7 bg-background p-0.5 border">
            <TabsTrigger value="encode" className="h-6 text-xs px-2.5">Encode</TabsTrigger>
            <TabsTrigger value="decode" className="h-6 text-xs px-2.5">Decode</TabsTrigger>
          </TabsList>
        </Tabs>
        <Badge variant="outline" className="font-normal text-[10px] py-px h-5 hidden md:inline-flex">
          {CODEC_LABELS[activeType]} {currentMode.source} to {currentMode.target}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onSwap} className="h-7 text-xs gap-1 px-2">
          <ArrowsLeftRightIcon className="h-3 w-3" />
          Swap
        </Button>
        <Button variant="outline" size="sm" onClick={onCopy} disabled={!output} className="h-7 text-xs gap-1 px-2">
          <CopyIcon className="h-3 w-3" />
          CopyIcon Output
        </Button>
        <Button variant="ghost" size="icon" onClick={onClear} disabled={isEmpty} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <TrashIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
