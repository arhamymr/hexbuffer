import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTargetStore } from '@/stores/target';
import { TrashIcon } from '@phosphor-icons/react';
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
  const removeTarget = useTargetStore((state) => state.removeTarget);
  const updateTarget = useTargetStore((state) => state.updateTarget);
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
        updateTarget(target.id, {
          name: data.name,
          description: data.description,
          scope: normalizedScope,
        });
      } else {
        const now = new Date().toISOString();
        addTarget({
          id: createTargetId(),
          name: data.name,
          description: data.description,
          scope: normalizedScope,
          createdAt: now,
          updatedAt: now,
          tabActive: true,
        });
      }

      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveTarget();
  };

  const deleteTarget = () => {
    if (!target) {
      return;
    }

    removeTarget(target.id);
    onSaved();
  };

  return (
    <form onSubmit={onSubmit} className="select-none">
      <div className="space-y-4 py-3">
        {/* Target Name */}
        <div className="space-y-1">
          <label htmlFor="name" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Target Name
          </label>
          <Input
            id="name"
            placeholder="e.g., Production API, Local Staging"
            value={values.name}
            onChange={updateValue('name')}
            className="h-9 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
          {errors.name && (
            <p className="text-[10px] text-destructive font-medium mt-0.5">{errors.name}</p>
          )}
        </div>

        {/* Target Description */}
        <div className="space-y-1">
          <label htmlFor="description" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Description
          </label>
          <Input
            id="description"
            placeholder="Optional notes or details"
            value={values.description}
            onChange={updateValue('description')}
            className="h-9 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>

        {/* Scope Patterns */}
        <div className="space-y-1">
          <label htmlFor="scope" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Scope Patterns
          </label>
          <Textarea
            id="scope"
            placeholder="*.example.com&#10;api.example.com"
            rows={4}
            value={values.scope}
            onChange={updateValue('scope')}
            className="font-mono text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-primary/30 min-h-[90px] resize-none leading-relaxed bg-muted/5 focus-visible:bg-background"
          />
          {errors.scope && (
            <p className="text-[10px] text-destructive font-medium mt-0.5">{errors.scope}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed pt-0.5">
            Separate multiple domain patterns with commas or newlines. Wildcards are supported (e.g. <code className="font-mono bg-muted px-1 rounded">*.domain.com</code>).
          </p>
        </div>
      </div>

      <DialogFooter className={`pt-4 border-t border-border mt-3 flex items-center ${target ? 'sm:justify-between' : 'sm:justify-end'}`}>
        {target && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="h-8 text-xs font-semibold gap-1.5 active:scale-[0.97]">
                <TrashIcon className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border-border/80 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm font-semibold tracking-tight">Delete Target?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground/80 leading-relaxed">
                  This will permanently remove <strong className="text-foreground">{target.name}</strong> from your workspace. All associated traffic scopes will be unmonitored.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-2">
                <AlertDialogCancel type="button" className="h-8 text-xs font-medium">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  className="h-8 text-xs font-medium bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 active:scale-[0.97]"
                  onClick={deleteTarget}
                >
                  Delete Target
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-8 text-xs font-medium active:scale-[0.97]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => void saveTarget()}
            className="h-8 text-xs font-semibold active:scale-[0.97]"
          >
            {target ? 'Save Changes' : 'Create Target'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
