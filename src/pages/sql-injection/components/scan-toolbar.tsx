import { DownloadIcon, PlayIcon, SquareIcon, TrashIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  return (
    <div className="flex flex-col border-b bg-muted/40 shrink-0">
      {/* Settings Row */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/10">
        <Input
          className="h-7 text-xs bg-background max-w-[280px]"
          placeholder="http://target.com/search?q="
          value={url}
          onChange={e => onUrlChange(e.target.value)}
        />
        <Select value={method} onValueChange={v => onMethodChange(v as 'GET' | 'POST')}>
          <SelectTrigger className="h-7 text-xs w-20 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="GET" className="text-xs">GET</SelectItem>
            <SelectItem value="POST" className="text-xs">POST</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
              Risk
            </Label>
            <Select value={riskLevel} onValueChange={v => onRiskLevelChange(v as SqliRiskLevel)}>
              <SelectTrigger className="h-7 text-xs w-[120px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="low" className="text-xs">Low (few tests)</SelectItem>
                <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                <SelectItem value="high" className="text-xs">High (all tests)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
              Techniques
            </span>
            <div className="flex items-center gap-3">
              {(Object.keys(TECHNIQUE_LABELS) as SqliTechnique[]).map(tech => (
                <label
                  key={tech}
                  className="flex items-center gap-1.5 cursor-pointer text-xs select-none"
                >
                  <Checkbox
                    checked={techniques.has(tech)}
                    onCheckedChange={() => onToggleTechnique(tech)}
                  />
                  <span>{TECHNIQUE_LABELS[tech]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex h-9 items-center justify-between px-3 gap-2 bg-muted/5">
        <div className="flex items-center gap-2">
          {isRunning && (
            <Badge variant="secondary" className="animate-pulse text-[9px] h-5 py-0 font-mono">
              {progress.phase}: {progress.current}/{progress.total}
            </Badge>
          )}
          {error && (
            <span className="text-[10px] text-destructive font-mono max-w-[320px] truncate">
              {error}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportJson}
            disabled={vulnerabilitiesCount === 0}
            className="h-6 text-[11px] gap-1 px-2"
          >
            <DownloadIcon className="h-3 w-3" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={vulnerabilitiesCount === 0}
            className="h-6 text-[11px] gap-1 px-2"
          >
            <DownloadIcon className="h-3 w-3" />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={vulnerabilitiesCount === 0 && databasesCount === 0}
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
              disabled={!hasUrlAndParams}
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
