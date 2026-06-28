import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrashIcon } from '@phosphor-icons/react';
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
  return (
    <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
      <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            Parameters
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {injectCount} marked for injection
          </span>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 p-2">
        <div className="space-y-2">
          {parameters.map(param => (
            <div
              key={param.name}
              className="flex items-center gap-2 border p-1.5 rounded bg-muted/5"
            >
              <Checkbox
                checked={param.inject}
                onCheckedChange={() => onToggleParamInject(param.name)}
              />
              <span className="font-mono text-xs w-20 truncate" title={param.name}>
                {param.name}
              </span>
              <span className="text-[10px] text-muted-foreground w-10 shrink-0">
                {param.location}
              </span>
              <Input
                className="flex-1 h-7 text-xs bg-background"
                value={param.value}
                onChange={e => onParamValueChange(param.name, e.target.value)}
                placeholder="value"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveParameter(param.name)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <TrashIcon className="h-3 w-3" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2 border border-dashed p-1.5 rounded bg-background pt-2">
            <Input
              className="flex-1 h-7 text-xs"
              placeholder="name"
              value={newParamName}
              onChange={e => onNewParamNameChange(e.target.value)}
            />
            <Input
              className="flex-1 h-7 text-xs"
              placeholder="value"
              value={newParamValue}
              onChange={e => onNewParamValueChange(e.target.value)}
            />
            <Button size="sm" onClick={onAddParameter} className="h-7 text-xs px-2.5">
              Add
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
