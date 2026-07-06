import { CheckIcon, ListChecksIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HumanSelectionRequest } from '../types';

interface HumanSelectionCardProps {
  request: HumanSelectionRequest;
  onSubmit: (selectedValues: string[]) => void;
  onDismiss: () => void;
}

export function HumanSelectionCard({
  request,
  onSubmit,
  onDismiss,
}: HumanSelectionCardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // ponytail: store custom user typed option value
  const [customText, setCustomText] = useState('');

  const toggleOption = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (request.multiSelect) {
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
      } else {
        // Single select: replace
        next.clear();
        next.add(value);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const finalValues: string[] = [];
    selected.forEach((val) => {
      if (val === '__custom__') {
        if (customText.trim()) {
          finalValues.push(customText.trim());
        }
      } else {
        finalValues.push(val);
      }
    });
    if (finalValues.length === 0) return;
    onSubmit(finalValues);
  };

  const isSubmitDisabled = () => {
    const hasPreset = Array.from(selected).some((v) => v !== '__custom__');
    const hasCustomText = selected.has('__custom__') && customText.trim().length > 0;
    return !hasPreset && !hasCustomText;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isSubmitDisabled()) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecksIcon className="h-4 w-4 shrink-0 text-blue-500" />
          <span className="font-medium text-blue-600 dark:text-blue-400">
            Selection Required
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={onDismiss}
        >
          <XIcon className="h-3 w-3" />
        </Button>
      </div>

      <p className="mt-1.5">{request.question}</p>

      <div className="mt-2 space-y-1">
        {request.options.map((option) => {
          const isSelected = selected.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleOption(option.value)}
              className={cn(
                'flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                isSelected
                  ? 'border-blue-500/60 bg-blue-500/20 text-foreground'
                  : 'border-border bg-background/50 hover:bg-accent/50',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                  isSelected
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : request.multiSelect
                      ? 'border-muted-foreground/40 rounded'
                      : 'border-muted-foreground/40 rounded-full',
                )}
              >
                {isSelected && <CheckIcon className="h-3 w-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <span className="block font-medium text-xs">{option.label}</span>
                {option.description ? (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}

        {/* ponytail: Custom typing option */}
        <button
          type="button"
          onClick={() => toggleOption('__custom__')}
          className={cn(
            'flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
            selected.has('__custom__')
              ? 'border-blue-500/60 bg-blue-500/20 text-foreground'
              : 'border-border bg-background/50 hover:bg-accent/50',
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
              selected.has('__custom__')
                ? 'border-blue-500 bg-blue-500 text-white'
                : request.multiSelect
                  ? 'border-muted-foreground/40 rounded'
                  : 'border-muted-foreground/40 rounded-full',
            )}
          >
            {selected.has('__custom__') && <CheckIcon className="h-3 w-3" />}
          </span>
          <div className="flex-1 min-w-0">
            <span className="block font-medium text-xs">Other (type your own)</span>
          </div>
        </button>
      </div>

      {selected.has('__custom__') && (
        <div className="mt-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your custom selection..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs focus:border-blue-500 focus:outline-none placeholder:text-muted-foreground/50"
            autoFocus
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitDisabled()}
          className="gap-1.5"
        >
          <CheckIcon className="h-3.5 w-3.5" />
          Confirm Selection
        </Button>
        <span className="text-xs text-muted-foreground">
          {request.multiSelect
            ? `Select one or more (${selected.size} selected)`
            : 'Select one option'}
        </span>
      </div>
    </div>
  );
}
