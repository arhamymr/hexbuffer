import React from 'react';
import { TrashIcon, DotsSixVerticalIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TestStep, StepKind } from '../types';
import { STEP_KIND_ICONS, STEP_KIND_OPTIONS } from '../constants';

interface StepBuilderProps {
  step: TestStep;
  index: number;
  onChange: (index: number, step: TestStep) => void;
  onRemove: (index: number) => void;
  onMove?: (from: number, to: number) => void;
  totalSteps: number;
}

export function StepBuilder({ step, index, onChange, onRemove, onMove, totalSteps }: StepBuilderProps) {
  const handleKindChange = (kind: StepKind) => {
    // Reset step-specific fields when kind changes
    const base: TestStep = { kind };
    onChange(index, base);
  };

  const handleFieldChange = (field: keyof TestStep, value: string | number) => {
    onChange(index, { ...step, [field]: value });
  };

  const Icon = STEP_KIND_ICONS[step.kind];

  return (
    <div className="rounded-md border bg-card/50 p-3 group">
      <div className="flex items-start gap-3">
        {/* DotsSixIcon handle for drag reorder */}
        {onMove && (
          <button
            className="mt-1.5 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing shrink-0"
            title="Drag to reorder"
          >
            <DotsSixVerticalIcon className="size-4" />
          </button>
        )}

        <div className="flex-1 min-w-0 space-y-3">
          {/* Step kind selector + remove */}
          <div className="flex items-center gap-2">
            <Select value={step.kind} onValueChange={(v) => handleKindChange(v as StepKind)}>
              <SelectTrigger size="sm" className="w-[170px]">
                {Icon && <Icon className="size-3.5 text-muted-foreground" />}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEP_KIND_OPTIONS.map(({ value, label }) => {
                  const OptionIcon = STEP_KIND_ICONS[value];
                  return (
                    <SelectItem key={value} value={value}>
                      <OptionIcon className="size-3.5" />
                      <span>{label}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground truncate">
              Step {index + 1}
            </span>

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(index)}
              title="Remove step"
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </div>

          {/* Dynamic fields based on step kind */}
          <StepFields step={step} onChange={handleFieldChange} />
        </div>
      </div>
    </div>
  );
}

export function StepFields({
  step,
  onChange,
}: {
  step: TestStep;
  onChange: (field: keyof TestStep, value: string | number) => void;
}) {
  switch (step.kind) {
    case 'navigate':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">URL</Label>
          <Input
            placeholder="https://example.com"
            value={step.value || ''}
            onChange={(e) => onChange('value', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      );

    case 'click':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">CSS Selector</Label>
          <Input
            placeholder="button.submit, #login-btn, a[href='/login']"
            value={step.selector || ''}
            onChange={(e) => onChange('selector', e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>
      );

    case 'fill':
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">CSS Selector</Label>
            <Input
              placeholder="input[name='email']"
              value={step.selector || ''}
              onChange={(e) => onChange('selector', e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value</Label>
            <Input
              placeholder="test@example.com"
              value={step.value || ''}
              onChange={(e) => onChange('value', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      );

    case 'wait':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Duration (milliseconds)</Label>
          <Input
            type="number"
            placeholder="2000"
            value={step.ms || ''}
            onChange={(e) => onChange('ms', parseInt(e.target.value, 10) || 0)}
            className="h-8 text-sm w-40"
            min={100}
            step={100}
          />
        </div>
      );

    case 'screenshot':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Screenshot Name</Label>
          <Input
            placeholder="dashboard-loaded"
            value={step.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      );

    case 'assert-visible':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">CSS Selector (element must be visible)</Label>
          <Input
            placeholder=".dashboard, #main-content"
            value={step.selector || ''}
            onChange={(e) => onChange('selector', e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>
      );

    case 'assert-text':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Expected Text</Label>
          <Input
            placeholder="Welcome back"
            value={step.value || ''}
            onChange={(e) => onChange('value', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      );

    case 'assert-url':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">URL Pattern (glob or regex)</Label>
          <Input
            placeholder="/dashboard/**"
            value={step.pattern || ''}
            onChange={(e) => onChange('pattern', e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>
      );

    case 'ai-verify':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Natural Language Prompt for AI Verification</Label>
          <Textarea
            placeholder="Verify the dashboard shows the user's name, recent activity, and a working logout button"
            value={step.prompt || ''}
            onChange={(e) => onChange('prompt', e.target.value)}
            className="text-sm min-h-[60px]"
            rows={2}
          />
        </div>
      );

    default:
      return null;
  }
}
