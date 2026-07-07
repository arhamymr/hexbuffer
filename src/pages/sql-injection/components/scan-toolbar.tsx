import { DownloadIcon, PlayIcon, SquareIcon, TrashIcon, GearIcon } from '@phosphor-icons/react';
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
import type { SqliRiskLevel, SqliTechnique } from '../types';
import { TECHNIQUE_LABELS } from '../constants';
import type { ProgressState } from '../hooks/use-sqli-page';

interface ScanToolbarProps {
  url: string;
  onUrlChange: (v: string) => void;
  method: 'GET' | 'POST';
  onMethodChange: (v: 'GET' | 'POST') => void;
  riskLevel: SqliRiskLevel;
  onRiskLevelChange: (v: SqliRiskLevel) => void;
  techniques: Set<SqliTechnique>;
  onToggleTechnique: (tech: SqliTechnique) => void;
  isRunning: boolean;
  progress: ProgressState;
  error: string;
  vulnerabilitiesCount: number;
  databasesCount: number;
  hasUrlAndParams: boolean;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}

export function ScanToolbar({
  url,
  onUrlChange,
  method,
  onMethodChange,
  riskLevel,
  onRiskLevelChange,
  techniques,
  onToggleTechnique,
  isRunning,
  progress,
  error,
  vulnerabilitiesCount,
  databasesCount,
  hasUrlAndParams,
  onStart,
  onStop,
  onClear,
  onExportJson,
  onExportCsv,
}: ScanToolbarProps) {
  // ponytail: Keep implementation simple, reuse existing state & actions.
  return (
    <div className="flex flex-col border-b bg-card shrink-0">
      {/* Target & Primary Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-background">
        <div className="flex flex-1 items-center min-w-[280px] max-w-xl">
          <div className="flex w-full items-center -space-x-px">
            <Select value={method} onValueChange={v => onMethodChange(v as 'GET' | 'POST')}>
              <SelectTrigger className="h-8 text-xs w-20 bg-muted/20 rounded-r-none focus:ring-0 focus:ring-offset-0 select-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="GET" className="text-xs">GET</SelectItem>
                <SelectItem value="POST" className="text-xs">POST</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="h-8 text-xs bg-background rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/50"
              placeholder="http://target.com/search?q="
              value={url}
              onChange={e => onUrlChange(e.target.value)}
            />
          </div>
        </div>

        {/* Scan Actions & Progress Status */}
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-[10px] text-destructive font-mono bg-destructive/5 px-2 py-1 rounded border border-destructive/10 max-w-[240px] truncate" title={error}>
              {error}
            </span>
          )}

          {isRunning && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              <span>{progress.phase || 'Scanning'}</span>
            </div>
          )}

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportJson}
              disabled={vulnerabilitiesCount === 0}
              className="h-7 text-[11px] gap-1.5 px-2.5 transition-colors font-medium"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              disabled={vulnerabilitiesCount === 0}
              className="h-7 text-[11px] gap-1.5 px-2.5 transition-colors font-medium"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              disabled={vulnerabilitiesCount === 0 && databasesCount === 0}
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              title="Clear results"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            {isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onStop}
                className="h-8 text-[11px] gap-1.5 px-3.5 font-semibold shadow-sm"
              >
                <SquareIcon className="h-3 w-3 fill-current" />
                Stop Scan
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onStart}
                disabled={!hasUrlAndParams}
                className="h-8 text-[11px] gap-1.5 px-3.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm disabled:bg-muted disabled:text-muted-foreground"
              >
                <PlayIcon className="h-3 w-3 fill-current" />
                Start Scan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Settings Row */}
      <div className="flex flex-wrap items-center gap-6 px-4 py-2 border-t bg-muted/20">
        <div className="flex items-center gap-2">
          <GearIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider select-none">
            Scan Parameters
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Label className="text-[11px] text-muted-foreground select-none">
            Risk:
          </Label>
          <Select value={riskLevel} onValueChange={v => onRiskLevelChange(v as SqliRiskLevel)}>
            <SelectTrigger className="h-6 text-[10px] w-24 bg-background py-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="low" className="text-xs">Low (Few)</SelectItem>
              <SelectItem value="medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="high" className="text-xs">High (All)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground select-none">
            Techniques:
          </span>
          <div className="flex items-center gap-1.5">
            {(Object.keys(TECHNIQUE_LABELS) as SqliTechnique[]).map(tech => {
              const isSelected = techniques.has(tech);
              return (
                <button
                  key={tech}
                  type="button"
                  onClick={() => onToggleTechnique(tech)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                      : 'bg-background border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {TECHNIQUE_LABELS[tech]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
