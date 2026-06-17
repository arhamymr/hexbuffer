import React from 'react';
import { ArrowDown, ArrowUp, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { StepKind, TestStep } from '../types';
import { STEP_KIND_ICONS, STEP_KIND_LABELS, STEP_KIND_OPTIONS } from '../constants';
import { StepFields } from './step-builder';
import { StepFlowCanvas } from './step-flow-canvas';

interface StepFlowBuilderProps {
  steps: TestStep[];
  onStepsChange: (steps: TestStep[]) => void;
  onAddStep: () => void;
  emptyActions: React.ReactNode;
}

function moveStep<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function StepFlowBuilder({ steps, onStepsChange, onAddStep, emptyActions }: StepFlowBuilderProps) {
  const [selectedStepIndex, setSelectedStepIndex] = React.useState<number | null>(
    steps.length > 0 ? 0 : null
  );
  const [stepUiIds, setStepUiIds] = React.useState<string[]>(() =>
    steps.map(() => crypto.randomUUID())
  );
  const [layoutVersion, setLayoutVersion] = React.useState(0);

  React.useEffect(() => {
    setSelectedStepIndex((current) => {
      if (steps.length === 0) return null;
      if (current === null) return 0;
      return Math.min(current, steps.length - 1);
    });
  }, [steps.length]);

  React.useEffect(() => {
    setStepUiIds((current) => {
      if (current.length === steps.length) return current;
      if (current.length > steps.length) return current.slice(0, steps.length);
      return [
        ...current,
        ...Array.from({ length: steps.length - current.length }, () => crypto.randomUUID()),
      ];
    });
  }, [steps.length]);

  const handleStepChange = React.useCallback(
    (index: number, step: TestStep) => {
      onStepsChange(steps.map((current, currentIndex) => (currentIndex === index ? step : current)));
    },
    [onStepsChange, steps]
  );

  const handleStepRemove = React.useCallback(
    (index: number) => {
      onStepsChange(steps.filter((_, currentIndex) => currentIndex !== index));
      setStepUiIds((current) => current.filter((_, currentIndex) => currentIndex !== index));
      setSelectedStepIndex((current) => {
        if (current === null) return null;
        if (steps.length <= 1) return null;
        if (current === index) return Math.min(index, steps.length - 2);
        if (current > index) return current - 1;
        return current;
      });
    },
    [onStepsChange, steps]
  );

  const handleStepMove = React.useCallback(
    (from: number, to: number) => {
      onStepsChange(moveStep(steps, from, to));
      setStepUiIds((current) => moveStep(current, from, to));
      setLayoutVersion((current) => current + 1);
      setSelectedStepIndex(to);
    },
    [onStepsChange, steps]
  );

  const selectedStep =
    selectedStepIndex !== null ? steps[selectedStepIndex] ?? null : null;

  const handleSelectedKindChange = React.useCallback(
    (kind: StepKind) => {
      if (selectedStepIndex === null) return;
      handleStepChange(selectedStepIndex, { kind });
    },
    [handleStepChange, selectedStepIndex]
  );

  const handleSelectedFieldChange = React.useCallback(
    (field: keyof TestStep, value: string | number) => {
      if (selectedStepIndex === null || !selectedStep) return;
      handleStepChange(selectedStepIndex, { ...selectedStep, [field]: value });
    },
    [handleStepChange, selectedStep, selectedStepIndex]
  );

  if (steps.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          No steps defined yet. Add steps manually or generate them with AI.
        </p>
        <div className="flex items-center justify-center gap-2">
          {emptyActions}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-[620px] max-h-[calc(100vh-260px)] min-h-[460px] overflow-hidden rounded-md border bg-background lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative h-full min-h-0">
        <StepFlowCanvas
          steps={steps}
          stepUiIds={stepUiIds}
          layoutVersion={layoutVersion}
          selectedStepIndex={selectedStepIndex}
          onSelectedStepChange={setSelectedStepIndex}
          onStepRemove={handleStepRemove}
          onStepMove={handleStepMove}
          onAddStep={onAddStep}
        />
      </div>

      <aside className="flex min-h-0 flex-col border-t bg-card/40 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold">
              {selectedStepIndex !== null ? `Step ${selectedStepIndex + 1} Properties` : 'Step Properties'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {selectedStep ? STEP_KIND_LABELS[selectedStep.kind] : 'Select a node to edit'}
            </p>
          </div>
          {selectedStepIndex !== null && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setSelectedStepIndex(null)}
              title="Close properties"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        {selectedStep && selectedStepIndex !== null ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Step Type</Label>
                <Select value={selectedStep.kind} onValueChange={(value) => handleSelectedKindChange(value as StepKind)}>
                  <SelectTrigger size="sm" className="w-full">
                    {React.createElement(STEP_KIND_ICONS[selectedStep.kind], {
                      className: 'size-3.5 text-muted-foreground',
                    })}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STEP_KIND_OPTIONS.map(({ value, label }) => {
                      const Icon = STEP_KIND_ICONS[value];
                      return (
                        <SelectItem key={value} value={value}>
                          <Icon className="size-3.5" />
                          <span>{label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <StepFields step={selectedStep} onChange={handleSelectedFieldChange} />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedStepIndex === 0}
                  onClick={() => handleStepMove(selectedStepIndex, selectedStepIndex - 1)}
                >
                  <ArrowUp className="size-3.5" />
                  Move Up
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedStepIndex === steps.length - 1}
                  onClick={() => handleStepMove(selectedStepIndex, selectedStepIndex + 1)}
                >
                  <ArrowDown className="size-3.5" />
                  Move Down
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className={cn('w-full justify-center text-muted-foreground hover:text-destructive')}
                onClick={() => handleStepRemove(selectedStepIndex)}
              >
                <Trash2 className="size-3.5" />
                Remove Step
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
            Select a step node to edit its details.
          </div>
        )}
      </aside>
    </div>
  );
}
