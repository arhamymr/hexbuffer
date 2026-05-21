'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import { useTargetStore } from '@/stores/target';
import type { Target } from '@/types';

interface TargetDialogFormProps {
  target?: Target | null;
  onCancel: () => void;
  onSaved: () => void;
}

interface FormValues {
  name: string;
  description: string;
  scope: string;
}

interface FormErrors {
  name?: string;
  scope?: string;
}

function parseScopePatterns(scope: string) {
  return scope
    .split(/[\n,]/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

function createTargetId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `target-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function TargetDialogForm({ target, onCancel, onSaved }: TargetDialogFormProps) {
  const addTarget = useTargetStore((state) => state.addTarget);
  const updateTarget = useTargetStore((state) => state.updateTarget);
  const targets = useTargetStore((state) => state.targets);
  const [values, setValues] = React.useState<FormValues>({
    name: target?.name ?? '',
    description: target?.description ?? '',
    scope: target?.scope.join('\n') ?? '',
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setValues({
      name: target?.name ?? '',
      description: target?.description ?? '',
      scope: target?.scope.join('\n') ?? '',
    });
    setErrors({});
  }, [target]);

  const updateValue = (field: keyof FormValues) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  };

  const validateForm = (data: FormValues, normalizedScope: string[]) => {
    const nextErrors: FormErrors = {};

    if (!data.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    if (normalizedScope.length === 0) {
      nextErrors.scope = 'At least one scope pattern is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveTarget = async () => {
    if (isSubmitting) {
      return;
    }

    const data = {
      name: values.name.trim(),
      description: values.description.trim(),
      scope: values.scope,
    };
    const normalizedScope = parseScopePatterns(data.scope);

    if (!validateForm(data, normalizedScope)) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (target) {
        targets.forEach((storedTarget) => {
          updateTarget(storedTarget.id, storedTarget.id === target.id
            ? {
                name: data.name,
                description: data.description,
                scope: normalizedScope,
                tabActive: true,
              }
            : { tabActive: false }
          );
        });
        onSaved();
        return;
      }

      const now = new Date().toISOString();
      targets.forEach(t => updateTarget(t.id, { tabActive: false }));
      addTarget({
        id: createTargetId(),
        name: data.name,
        description: data.description,
        scope: normalizedScope,
        createdAt: now,
        updatedAt: now,
        tabActive: true,
      });
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveTarget();
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            placeholder="e.g., Example API"
            value={values.name}
            onChange={updateValue('name')}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="grid gap-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Input
            id="description"
            placeholder="Optional description"
            value={values.description}
            onChange={updateValue('description')}
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
            value={values.scope}
            onChange={updateValue('scope')}
          />
          {errors.scope && (
            <p className="text-xs text-destructive">{errors.scope}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Separate multiple patterns with commas or new lines. Example: *.example.com, api.example.com
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button size="xs" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="xs" type="button" disabled={isSubmitting} onClick={() => void saveTarget()}>
          {target ? 'Save Changes' : 'Create Target'}
        </Button>
      </DialogFooter>
    </form>
  );
}
