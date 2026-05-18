'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { useTargetStore } from '@/stores/target';
import type { Target } from '@/types';

interface TargetDialogFormProps {
  target?: Target | null;
  onCancel: () => void;
}

interface FormValues {
  name: string;
  description: string;
  scope: string;
}

function parseScopePatterns(scope: string) {
  return scope
    .split(/[\n,]/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

export function TargetDialogForm({ target, onCancel }: TargetDialogFormProps) {
  const addTarget = useTargetStore((state) => state.addTarget);
  const updateTarget = useTargetStore((state) => state.updateTarget);
  const targets = useTargetStore((state) => state.targets);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      name: target?.name ?? '',
      description: target?.description ?? '',
      scope: target?.scope.join('\n') ?? '',
    },
  });

  React.useEffect(() => {
    reset({
      name: target?.name ?? '',
      description: target?.description ?? '',
      scope: target?.scope.join(', ') ?? '',
    });
  }, [reset, target]);

  const onSubmit = async (data: FormValues) => {
    const normalizedScope = parseScopePatterns(data.scope);

    if (target) {
      updateTarget(target.id, {
        name: data.name,
        description: data.description,
        scope: normalizedScope,
      });
      onCancel();
      return;
    }

    const now = new Date().toISOString();
    targets.forEach(t => updateTarget(t.id, { tabActive: false }));
    const target = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      scope: normalizedScope,
      createdAt: now,
      updatedAt: now,
      tabActive: true,
    };
    await addTarget(target);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            placeholder="e.g., Example API"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Input
            id="description"
            placeholder="Optional description"
            {...register('description')}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="scope" className="text-sm font-medium">
            Scope Patterns
          </label>
          <Textarea
            id="scope"
            placeholder="*.example.com, api.example.com"
            rows={3}
            {...register('scope', {
              validate: (value) =>
                parseScopePatterns(value).length > 0 || 'At least one scope pattern is required',
            })}
          />
          {errors.scope && (
            <p className="text-xs text-destructive">{errors.scope.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Separate multiple patterns with commas or new lines. Example: *.example.com, api.example.com
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {target ? 'Save Changes' : 'Create Target'}
        </Button>
      </DialogFooter>
    </form>
  );
}
