import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ArrowDownIcon, ArrowUpIcon, DotsSixIcon, TrashIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestStep } from '../types';
import { STEP_KIND_ICONS, STEP_KIND_LABELS } from '../constants';

export interface RegressionStepNodeData extends Record<string, unknown> {
  step: TestStep;
  index: number;
  totalSteps: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

function getStepSummary(step: TestStep): string {
  switch (step.kind) {
    case 'navigate':
      return step.value || 'No URL set';
    case 'click':
      return step.selector || 'No selector set';
    case 'fill':
      return step.selector ? `${step.selector} = ${step.value || 'empty'}` : 'No input selector set';
    case 'wait':
      return `${step.ms || 1000}ms`;
    case 'screenshot':
      return step.name || 'Screenshot';
    case 'assert-visible':
      return step.selector || 'No selector set';
    case 'assert-text':
      return step.value ? `"${step.value}"` : 'No text set';
    case 'assert-url':
      return step.pattern || 'No URL pattern set';
    case 'ai-verify':
      return step.prompt || 'No prompt set';
    default:
      return 'Configure step';
  }
}

function StepNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RegressionStepNodeData;
  const { step, index, totalSteps, onSelect, onRemove, onMove } = nodeData;
  const Icon = STEP_KIND_ICONS[step.kind];
  const canMoveUp = index > 0;
  const canMoveDown = index < totalSteps - 1;

  return (
    <div
      className={cn(
        'group relative min-w-[260px] rounded-md border-2 bg-background shadow-sm transition-shadow',
        'border-border hover:border-primary/60',
        selected && 'border-primary ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
      onClick={() => onSelect(index)}
    >
      {index > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          style={{ width: 12, height: 12, borderWidth: 2, left: -6 }}
          className="!border-background !bg-primary"
        />
      )}

      <div className="flex items-center gap-2 px-3 py-2.5">
        <DotsSixIcon className="size-3.5 shrink-0 text-muted-foreground/30 opacity-80 transition-opacity group-hover:opacity-100" />
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-medium">{STEP_KIND_LABELS[step.kind]}</p>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {index + 1}
            </span>
          </div>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {getStepSummary(step)}
          </p>
        </div>
      </div>

      <div className="nodrag flex items-center justify-between border-t px-2 py-1">
        <span className="text-[10px] text-muted-foreground">
          Step {index + 1} of {totalSteps}
        </span>
        <div className="flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={!canMoveUp}
            title="Move step up"
            onClick={(event) => {
              event.stopPropagation();
              if (canMoveUp) onMove(index, index - 1);
            }}
          >
            <ArrowUpIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={!canMoveDown}
            title="Move step down"
            onClick={(event) => {
              event.stopPropagation();
              if (canMoveDown) onMove(index, index + 1);
            }}
          >
            <ArrowDownIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-destructive"
            title="Remove step"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(index);
            }}
          >
            <TrashIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {index < totalSteps - 1 && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          style={{ width: 12, height: 12, borderWidth: 2, right: -6 }}
          className="!border-background !bg-primary"
        />
      )}
    </div>
  );
}

export const StepNode = React.memo(StepNodeComponent);
