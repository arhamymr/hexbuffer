import React from 'react';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PlusIcon, TrashIcon, SparkleIcon, BroomIcon, PaintBucketIcon } from '@phosphor-icons/react';
import { PRESET_DIMENSIONS, PALETTES, type ColorPaletteItem } from '../constants';
import type { DrawMode } from '../hooks/use-pixel-page';

interface PixelToolbarProps {
  width: number;
  height: number;
  onDimensionChange: (w: number, h: number) => void;
  
  palette: ColorPaletteItem[];
  selectedPaletteIndex: number;
  onPaletteSelect: (index: number) => void;
  onAddColor: () => void;
  onUpdateColor: (index: number, hex: string, label: string) => void;
  onDeleteColor: (index: number) => void;
  
  activeColorIndex: number;
  onActiveColorSelect: (index: number) => void;
  drawMode: DrawMode;
  onDrawModeChange: (m: DrawMode) => void;
  
  prompt: string;
  onPromptChange: (p: string) => void;
  generating: boolean;
  onGenerate: () => void;
  
  onClear: () => void;
  onFill: () => void;

  assetName: string;
  onAssetNameChange: (n: string) => void;
}

export function PixelToolbar({
  width,
  height,
  onDimensionChange,
  
  palette,
  selectedPaletteIndex,
  onPaletteSelect,
  onAddColor,
  onUpdateColor,
  onDeleteColor,
  
  activeColorIndex,
  onActiveColorSelect,
  drawMode,
  onDrawModeChange,
  
  prompt,
  onPromptChange,
  generating,
  onGenerate,
  
  onClear,
  onFill,

  assetName,
  onAssetNameChange,
}: PixelToolbarProps) {
  const activeColor = palette[activeColorIndex] || palette[0];

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto scrollbar-thin select-none">
      {/* Asset Name */}
      <div className="space-y-1">
        <Label htmlFor="asset-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Asset Name
        </Label>
        <Input
          id="asset-name"
          type="text"
          value={assetName}
          onChange={(e) => onAssetNameChange(e.target.value)}
          placeholder="e.g. heart_icon"
          className="h-8 text-xs font-mono"
        />
      </div>

      {/* Grid size and drawing tools */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Grid Size
          </Label>
          <ButtonGroup>
            {PRESET_DIMENSIONS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                className={cn(
                  'h-7 text-xs px-2',
                  width === preset.width && height === preset.height && 'text-green-500 border-green-500/30'
                )}
                data-state={width === preset.width && height === preset.height ? 'on' : 'off'}
                onClick={() => onDimensionChange(preset.width, preset.height)}
              >
                {preset.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Tool Mode
          </Label>
          <ButtonGroup>
            <Button
              variant="outline"
              className={cn('h-7 text-xs px-2', drawMode === 'draw' && 'text-green-500 border-green-500/30')}
              data-state={drawMode === 'draw' ? 'on' : 'off'}
              onClick={() => onDrawModeChange('draw')}
            >
              Draw
            </Button>
            <Button
              variant="outline"
              className={cn('h-7 text-xs px-2', drawMode === 'erase' && 'text-green-500 border-green-500/30')}
              data-state={drawMode === 'erase' ? 'on' : 'off'}
              onClick={() => onDrawModeChange('erase')}
            >
              Erase
            </Button>
            <Button
              variant="outline"
              className={cn('h-7 text-xs px-2', drawMode === 'picker' && 'text-green-500 border-green-500/30')}
              data-state={drawMode === 'picker' ? 'on' : 'off'}
              onClick={() => onDrawModeChange('picker')}
            >
              Pick
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {/* Palette Selection & Colors */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Color Palette
          </Label>
          <Select
            value={String(selectedPaletteIndex)}
            onValueChange={(val) => onPaletteSelect(Number(val))}
          >
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue placeholder="Preset Palette" />
            </SelectTrigger>
            <SelectContent>
              {PALETTES.map((preset, idx) => (
                <SelectItem key={preset.name} value={String(idx)} className="text-xs">
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color Matrix Pills */}
        <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-muted/10 border">
          {palette.map((color, index) => {
            const isTransparent = color.hex === '#00000000';
            const isActive = index === activeColorIndex;
            return (
              <button
                key={index}
                onClick={() => onActiveColorSelect(index)}
                className={cn(
                  "relative h-7 px-2 flex items-center justify-center gap-1.5 rounded text-[11px] font-mono border hover:bg-muted/40 cursor-pointer select-none",
                  isActive ? "border-green-500/60 bg-green-500/5 text-green-400" : "border-border text-muted-foreground"
                )}
                title={color.label}
              >
                <div
                  className="size-3.5 rounded border border-neutral-700/40 shrink-0"
                  style={{
                    backgroundColor: isTransparent ? 'transparent' : color.hex,
                    backgroundImage: isTransparent 
                      ? 'linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%), linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%)' 
                      : 'none',
                    backgroundSize: '4px 4px',
                    backgroundPosition: '0 0, 2px 2px'
                  }}
                />
                <span>{index}</span>
              </button>
            );
          })}
          
          <Button
            variant="outline"
            size="icon"
            onClick={onAddColor}
            className="h-7 w-7"
            title="Add new custom color"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Selected Color Customizer */}
      <div className="p-3 rounded-md bg-muted/20 border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Edit Selected Index: {activeColorIndex}
          </span>
          {activeColorIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteColor(activeColorIndex)}
              className="h-6 w-6 text-destructive hover:bg-destructive/10"
              title="Delete color"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="col-span-1">
            <Label className="text-[10px] text-muted-foreground">Color Hex</Label>
            <div className="flex items-center gap-1.5 mt-0.5">
              <input
                type="color"
                value={activeColor.hex === '#00000000' ? '#000000' : activeColor.hex}
                disabled={activeColorIndex === 0}
                onChange={(e) => onUpdateColor(activeColorIndex, e.target.value, activeColor.label)}
                className="size-7 rounded cursor-pointer border border-neutral-700 p-0"
              />
              <input
                type="text"
                value={activeColor.hex}
                disabled={activeColorIndex === 0}
                onChange={(e) => onUpdateColor(activeColorIndex, e.target.value, activeColor.label)}
                className="h-7 w-full text-[10px] font-mono bg-background border rounded px-1 min-w-0"
              />
            </div>
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-muted-foreground">AI Description Label</Label>
            <Input
              type="text"
              value={activeColor.label}
              onChange={(e) => onUpdateColor(activeColorIndex, activeColor.hex, e.target.value)}
              placeholder="e.g. Bright Neon highlight outline"
              className="h-7 text-[10px] mt-0.5"
            />
          </div>
        </div>
      </div>

      {/* Clear / Fill Utilities */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="flex-1 text-xs gap-1.5 h-8"
        >
          <BroomIcon className="h-4 w-4" />
          Clear Canvas
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onFill}
          className="flex-1 text-xs gap-1.5 h-8"
        >
          <PaintBucketIcon className="h-4 w-4" />
          Fill Matrix
        </Button>
      </div>

      {/* AI Generate Prompt Panel */}
      <div className="space-y-2 border-t pt-4 mt-2">
        <Label htmlFor="pixel-prompt" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <SparkleIcon className="h-4 w-4 text-green-500 fill-green-500/20" />
          AI Matrix Generation Prompt
        </Label>
        <Textarea
          id="pixel-prompt"
          rows={3}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="e.g. A pixel art style 16x16 red potion bottle with glass highlights and black border outlines..."
          className="text-xs"
        />
        <Button
          onClick={onGenerate}
          disabled={generating}
          className="w-full text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 h-8"
        >
          {generating ? 'Compiling Matrix...' : 'Generate Asset Matrix'}
        </Button>
      </div>
    </div>
  );
}
