import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  PlayIcon,
  SquareIcon,
  CaretDownIcon,
  CaretRightIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import type { PortPreset } from '../constants';
import { PRESET_OPTIONS } from '../constants';

interface ScannerSidebarProps {
  target: string;
  onTargetChange: (v: string) => void;
  preset: PortPreset;
  onPresetChange: (v: string) => void;
  ports: string;
  onPortsChange: (v: string) => void;
  timeoutMs: string;
  onTimeoutChange: (v: string) => void;
  concurrency: string;
  onConcurrencyChange: (v: string) => void;
  bannerGrab: boolean;
  onBannerGrabChange: (v: boolean) => void;
  selectedPortLabel: string;
  isRunning: boolean;
  canScan: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function ScannerSidebar({
  target,
  onTargetChange,
  preset,
  onPresetChange,
  ports,
  onPortsChange,
  timeoutMs,
  onTimeoutChange,
  concurrency,
  onConcurrencyChange,
  bannerGrab,
  onBannerGrabChange,
  selectedPortLabel,
  isRunning,
  canScan,
  onStart,
  onStop,
}: ScannerSidebarProps) {
  // ponytail: use a simple boolean flag to manage accordion state, avoiding heavy packages
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <aside className="flex flex-col h-full backdrop-blur-sm border-r shrink-0 w-full lg:w-[300px] select-none">
      {/* Main Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">

        {/* Action Footer */}
        <div className="flex flex-end">
          {isRunning ? (
            <Button
              variant="destructive"
              onClick={() => onStop()}
            >
              <SquareIcon className="h-3.5 w-3.5 fill-current animate-pulse" />
              Stop Port Scan
            </Button>
          ) : (
            <Button
              disabled={!canScan}
              onClick={() => onStart()}
            >
              <PlayIcon className="h-3.5 w-3.5 fill-current" />
              Start Port Scan
            </Button>
          )}
        </div>

        {/* Target */}
        <div className="space-y-1.5">
          <Label htmlFor="target-input" className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            Target Host
          </Label>
          <Input
            id="target-input"
            className="h-8 text-xs bg-background/50 focus-visible:ring-primary/45 focus-visible:ring-2 focus-visible:ring-offset-0 transition-all border-muted-foreground/20 hover:border-muted-foreground/45"
            placeholder="example.com or 192.168.1.1"
            value={target}
            onChange={(e) => onTargetChange(e.target.value)}
          />
        </div>

        {/* Preset Select */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="preset-select" className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
              Port Preset
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none"
                >
                  <InfoIcon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[280px] text-xs bg-popover border text-popover-foreground p-2 rounded-sm shadow-md animate-in fade-in zoom-in-95 duration-150">
                {selectedPortLabel}
              </TooltipContent>
            </Tooltip>
          </div>
          <Select value={preset} onValueChange={onPresetChange}>
            <SelectTrigger id="preset-select" className="h-8 text-xs bg-background/50 border-muted-foreground/20 focus:ring-primary/45 focus:ring-2 focus:ring-offset-0 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs bg-popover border">
              {PRESET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs focus:bg-accent focus:text-accent-foreground cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Ports Input (shown only if preset is custom) */}
        {preset === 'custom' && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <Label htmlFor="ports-input" className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
              Custom Ports
            </Label>
            <Input
              id="ports-input"
              className="h-8 text-xs bg-background/50 focus-visible:ring-primary/45 focus-visible:ring-2 focus-visible:ring-offset-0 border-muted-foreground/20"
              value={ports}
              onChange={(e) => onPortsChange(e.target.value)}
              placeholder="e.g. 80,443 or 1-1024"
            />
          </div>
        )}

        <div className="border-t border-muted/50 pt-2" />

        {/* Collapsible Advanced Settings */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground hover:text-foreground tracking-wider transition-colors w-full text-left"
          >
            {showAdvanced ? (
              <CaretDownIcon className="h-3.5 w-3.5 text-primary" />
            ) : (
              <CaretRightIcon className="h-3.5 w-3.5" />
            )}
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="space-y-3.5 pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Timeout */}
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="timeout-input" className="text-xs text-muted-foreground">
                  Timeout (ms)
                </Label>
                <Input
                  id="timeout-input"
                  className="h-7 w-20 bg-background/50 text-right text-xs px-2 focus-visible:ring-primary/45 focus-visible:ring-2 focus-visible:ring-offset-0 border-muted-foreground/20"
                  value={timeoutMs}
                  onChange={(e) => onTimeoutChange(e.target.value)}
                />
              </div>

              {/* Concurrency */}
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="concurrency-input" className="text-xs text-muted-foreground">
                  Concurrency
                </Label>
                <Input
                  id="concurrency-input"
                  className="h-7 w-20 bg-background/50 text-right text-xs px-2 focus-visible:ring-primary/45 focus-visible:ring-2 focus-visible:ring-offset-0 border-muted-foreground/20"
                  value={concurrency}
                  onChange={(e) => onConcurrencyChange(e.target.value)}
                />
              </div>

              {/* Banner Grab */}
              <div className="flex items-center justify-between">
                <Label htmlFor="banner-checkbox" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Grab Service Banners
                </Label>
                <Checkbox
                  id="banner-checkbox"
                  checked={bannerGrab}
                  onCheckedChange={(checked) => onBannerGrabChange(checked === true)}
                />
              </div>
            </div>
          )}
        </div>
      </div>


    </aside>
  );
}
