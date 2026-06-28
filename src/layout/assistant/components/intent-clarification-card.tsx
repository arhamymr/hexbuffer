import { CheckIcon, QuestionIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IntentClarificationRequest } from '../types';

interface IntentClarificationCardProps {
  request: IntentClarificationRequest;
  onSubmit: (selectedCategoryId: string) => void;
  onDismiss: () => void;
}

export function IntentClarificationCard({
  request,
  onSubmit,
  onDismiss,
}: IntentClarificationCardProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit(selected);
  };

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <QuestionIcon className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="font-medium text-amber-600 dark:text-amber-400">
            Clarification Needed
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

      <div className="mt-2 grid grid-cols-1 gap-1.5">
        {request.categories.map((category) => {
          const isSelected = selected === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelected(category.id)}
              className={cn(
                'flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                isSelected
                  ? 'border-amber-500/60 bg-amber-500/20 text-foreground'
                  : 'border-border bg-background/50 hover:bg-accent/50',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                  isSelected
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-muted-foreground/40',
                )}
              >
                {isSelected && <CheckIcon className="h-3 w-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <span className="block font-medium text-xs">{category.label}</span>
                {category.description ? (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {category.description}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!selected}
          className="gap-1.5"
        >
          <CheckIcon className="h-3.5 w-3.5" />
          Confirm
        </Button>
        <span className="text-xs text-muted-foreground">
          Select a task to clarify your intent
        </span>
      </div>
    </div>
  );
}
