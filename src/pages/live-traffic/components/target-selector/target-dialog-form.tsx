import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DialogFooter } from '@/components/ui/dialog';
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
import { TrashIcon, CheckIcon, PlusIcon, GlobeIcon, TagIcon } from '@phosphor-icons/react';
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

  const parsedPatterns = React.useMemo(() => {
    return parseScopePatterns(values.scope);
  }, [values.scope]);

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
      nextErrors.name = 'Target name is required';
    }

    if (normalizedScope.length === 0) {
      nextErrors.scope = 'At least one valid scope pattern is required';
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
    <form onSubmit={onSubmit} className="space-y-4 py-1">
      <div className="space-y-3.5">
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-semibold text-foreground flex items-center justify-between">
            Target Name
            <span className="text-[10px] text-muted-foreground font-normal">Required</span>
          </label>
          <Input
            id="name"
            placeholder="e.g., Production API & Web"
            value={values.name}
            onChange={updateValue('name')}
            className="h-8 text-xs focus-visible:ring-1"
          />
          {errors.name && (
            <p className="text-[11px] font-medium text-destructive mt-1">{errors.name}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="text-xs font-semibold text-foreground flex items-center justify-between">
            Description
            <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
          </label>
          <Input
            id="description"
            placeholder="e.g., Main customer portal scope definition"
            value={values.description}
            onChange={updateValue('description')}
            className="h-8 text-xs focus-visible:ring-1"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="scope" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <GlobeIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Scope Patterns
            </label>
            {parsedPatterns.length > 0 && (
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {parsedPatterns.length} rule{parsedPatterns.length === 1 ? '' : 's'} parsed
              </span>
            )}
          </div>
          <Textarea
            id="scope"
            placeholder="*.example.com&#10;api.example.com"
            rows={3}
            value={values.scope}
            onChange={updateValue('scope')}
            className="text-xs font-mono resize-none focus-visible:ring-1"
          />
          {errors.scope ? (
            <p className="text-[11px] font-medium text-destructive">{errors.scope}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground/80">
              Separate multiple wildcard patterns or domain names with new lines or commas.
            </p>
          )}

          {/* Dynamic Scope Tag Chips Preview */}
          {parsedPatterns.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <TagIcon className="h-3 w-3" /> Scope Preview
              </div>
              <div className="flex flex-wrap gap-1 max-h-[64px] overflow-y-auto">
                {parsedPatterns.map((pattern, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-mono py-0 px-1.5 bg-muted/80 text-foreground border-border/40">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="pt-2 border-t border-border/40 flex items-center justify-between">
        {target ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="xs" className="gap-1.5">
                <TrashIcon className="h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base font-semibold">Delete Target?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground">
                  This action cannot be undone. Permanent removal of <span className="font-semibold text-foreground">{target.name}</span> will clear its stored scope rules.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button" size="xs">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={deleteTarget}
                >
                  Delete Target
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="xs" disabled={isSubmitting} onClick={() => void saveTarget()} className="gap-1.5">
            {target ? (
              <>
                <CheckIcon className="h-3.5 w-3.5" />
                Save Changes
              </>
            ) : (
              <>
                <PlusIcon className="h-3.5 w-3.5" />
                Create Target
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

