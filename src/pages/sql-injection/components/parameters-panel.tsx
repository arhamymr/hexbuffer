import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrashIcon, PlusIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import type { SqliParam } from '../types';

interface ParametersPanelProps {
  parameters: SqliParam[];
  newParamName: string;
  newParamValue: string;
  injectCount: number;
  onNewParamNameChange: (v: string) => void;
  onNewParamValueChange: (v: string) => void;
  onAddParameter: () => void;
  onRemoveParameter: (name: string) => void;
  onToggleParamInject: (name: string) => void;
  onParamValueChange: (name: string, value: string) => void;
}

export function ParametersPanel({
  parameters,
  newParamName,
  newParamValue,
  injectCount,
  onNewParamNameChange,
  onNewParamValueChange,
  onAddParameter,
  onRemoveParameter,
  onToggleParamInject,
  onParamValueChange,
}: ParametersPanelProps) {
  // ponytail: Keep location logic and mapping simple and native.
  const getLocationBadgeStyle = (location: string) => {
    switch (location) {
      case 'url':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case 'body':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'header':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Panel Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/15 px-3">
        <div className="flex items-center gap-2 select-none">
          <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
            Target Parameters
          </span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-semibold border-muted bg-muted/20 text-muted-foreground">
            {injectCount} Active
          </Badge>
        </div>
      </div>

      {/* Parameter List Scroll Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1.5">
          {parameters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none">
              <span className="text-xs text-muted-foreground font-medium">No parameters defined</span>
              <span className="text-[10px] text-muted-foreground/60 mt-1 max-w-[180px]">
                Add HTTP parameters below to mark them for vulnerability testing.
              </span>
            </div>
          ) : (
            parameters.map(param => (
              <div
                key={param.name}
                className={`flex items-center gap-2 border p-1.5 rounded-md transition-all ${
                  param.inject 
                    ? 'bg-muted/30 border-muted-foreground/15 shadow-sm' 
                    : 'bg-muted/5 border-border/50 opacity-70 hover:opacity-100'
                }`}
              >
                <Checkbox
                  checked={param.inject}
                  onCheckedChange={() => onToggleParamInject(param.name)}
                  className="h-3.5 w-3.5"
                  title={param.inject ? "Marked for injection" : "Skip injection testing"}
                />
                
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="font-mono text-xs font-semibold text-foreground truncate" 
                      title={param.name}
                    >
                      {param.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[8px] px-1 h-3.5 leading-none uppercase font-bold tracking-wide select-none ${getLocationBadgeStyle(param.location)}`}
                    >
                      {param.location}
                    </Badge>
                  </div>
                  
                  <Input
                    className="h-6 text-xs bg-background mt-1 py-0 px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground/30 font-mono"
                    value={param.value}
                    onChange={e => onParamValueChange(param.name, e.target.value)}
                    placeholder="Value (optional)"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveParameter(param.name)}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded shrink-0 transition-colors"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Sticky Add Parameter Section */}
      <div className="p-2.5 border-t bg-muted/15 shrink-0 space-y-2">
        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block select-none">
          Add Custom Parameter
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Input
              className="h-7 text-xs bg-background"
              placeholder="Name"
              value={newParamName}
              onChange={e => onNewParamNameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onAddParameter();
              }}
            />
            <Input
              className="h-7 text-xs bg-background"
              placeholder="Value"
              value={newParamValue}
              onChange={e => onNewParamValueChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onAddParameter();
              }}
            />
          </div>
          <Button 
            size="sm" 
            onClick={onAddParameter} 
            disabled={!newParamName.trim()}
            className="w-full h-7 text-xs gap-1 font-semibold"
          >
            <PlusIcon className="h-3 w-3" />
            Add Parameter
          </Button>
        </div>
      </div>
    </div>
  );
}
