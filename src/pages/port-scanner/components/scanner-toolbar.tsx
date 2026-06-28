import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CopyIcon, DownloadIcon, Info, PlayIcon, SquareIcon, TrashIcon } from '@phosphor-icons/react';
import type { PortPreset } from '../constants';
import { PRESET_OPTIONS } from '../constants';

interface ScannerToolbarProps {
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
  hasResults: boolean;
  canScan: boolean;
  resultsCount: number;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onCopyPorts: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}

export function ScannerToolbar({
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
  hasResults,
  canScan,
  resultsCount,
  onStart,
  onStop,
  onClear,
  onCopyPorts,
  onExportJson,
  onExportCsv,
}: ScannerToolbarProps) {
  return (
    <div className="flex flex-col border-b bg-muted/40 shrink-0">
      {/* GearSixIcon Row */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/10">
        <Input
          className="h-7 text-xs bg-background max-w-[280px]"
          placeholder="TargetIcon host or CIDR (e.g. example.com)"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
        />
        <Select value={preset} onValueChange={onPresetChange}>
          <SelectTrigger className="h-7 text-xs w-[110px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-xs">
            {PRESET_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[360px] text-xs">
            {selectedPortLabel}
          </TooltipContent>
        </Tooltip>

        {preset === 'custom' && (
          <Input
            className="h-7 text-xs bg-background flex-1 max-w-[200px]"
            value={ports}
            onChange={(e) => onPortsChange(e.target.value)}
            placeholder="1-100 or 80,443"
          />
        )}

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
              Timeout
            </Label>
            <Input
              className="h-7 w-14 bg-background text-right text-xs px-1.5 focus-visible:ring-1"
              value={timeoutMs}
              onChange={(e) => onTimeoutChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
              Concurrency
            </Label>
            <Input
              className="h-7 w-14 bg-background text-right text-xs px-1.5 focus-visible:ring-1"
              value={concurrency}
              onChange={(e) => onConcurrencyChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 rounded border bg-background h-7 px-2">
            <Checkbox
              id="banner-grab"
              checked={bannerGrab}
              onCheckedChange={(checked) => onBannerGrabChange(checked === true)}
            />
            <Label
              htmlFor="banner-grab"
              className="text-[10px] uppercase font-semibold text-muted-foreground cursor-pointer select-none"
            >
              Banner
            </Label>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex h-9 items-center justify-between px-3 gap-2 bg-muted/5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal text-[10px] py-0 h-5">
            SYN scan requires privileged helper
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyPorts}
            disabled={!hasResults}
            className="h-6 text-[11px] gap-1 px-2"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            CopyIcon Ports
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportJson}
            disabled={!hasResults}
            className="h-6 text-[11px] gap-1 px-2"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={!hasResults}
            className="h-6 text-[11px] gap-1 px-2"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={resultsCount === 0}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
          <div className="h-4 w-px bg-border mx-0.5" />
          {isRunning ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStop}
              className="h-6 text-[11px] gap-1 px-2.5"
            >
              <SquareIcon className="h-3 w-3 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onStart}
              disabled={!canScan}
              className="h-6 text-[11px] gap-1 px-2.5"
            >
              <PlayIcon className="h-3 w-3 fill-current" />
              Start
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
