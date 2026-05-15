'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { useTargetStore } from '@/stores/target';

interface TargetDialogFormProps {
  onCancel: () => void;
}

interface FormValues {
  name: string;
  description: string;
  scope: string;
}

export function TargetDialogForm({ onCancel }: TargetDialogFormProps) {
  const addTarget = useTargetStore((state) => state.addTarget);
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<FormValues>({
    mode: 'onChange',
  });

  const onSubmit = async (data: FormValues) => {
    const now = new Date().toISOString();
    const target = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      scope: data.scope.split('\n').filter(Boolean),
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
            placeholder="*.example.com&#10;api.example.com"
            rows={3}
            {...register('scope', { required: 'At least one scope pattern is required' })}
          />
          {errors.scope && (
            <p className="text-xs text-destructive">{errors.scope.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter one pattern per line. Use *.domain.com for wildcard matching.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid}>
          Create Target
        </Button>
      </DialogFooter>
    </form>
  );
}