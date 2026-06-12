'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CrawlSetupConfig } from '../types';

const formSchema = z.object({
  targetUrl: z.string().min(1, 'Target URL is required.').refine((val) => {
    try {
      const url = new URL(val);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }, 'Enter a valid URL (e.g. https://example.com).'),
  maxDepth: z.coerce.number({ message: 'Must be a number.' }).int().min(1, 'Must be at least 1.').max(20, 'Maximum depth is 20.'),
  maxPages: z.coerce.number({ message: 'Must be a number.' }).int().min(1, 'Must be at least 1.').max(10000, 'Maximum is 10,000.'),
  requestDelayMs: z.coerce.number({ message: 'Must be a number.' }).int().min(0, 'Cannot be negative.').max(30000, 'Maximum is 30,000 ms.'),
  timeoutMs: z.coerce.number({ message: 'Must be a number.' }).int().min(1000, 'Must be at least 1,000 ms.').max(120000, 'Maximum is 120,000 ms.'),
  networkSettleMs: z.coerce.number({ message: 'Must be a number.' }).int().min(0, 'Cannot be negative.').max(30000, 'Maximum is 30,000 ms.'),
  captureScreenshots: z.boolean(),
  captureRenderedHtml: z.boolean(),
  enableAiInsights: z.boolean(),
  excludePaths: z.string().refine((val) => {
    if (!val.trim()) return true;
    const segments = val.split(',').map((s) => s.trim()).filter(Boolean);
    return segments.every((s) => s.startsWith('/'));
  }, 'Each path must start with /.'),
});

type FormValues = z.infer<typeof formSchema>;

function toFormDefaults(setup: CrawlSetupConfig): FormValues {
  return {
    targetUrl: setup.targetUrl,
    maxDepth: setup.maxDepth,
    maxPages: setup.maxPages,
    requestDelayMs: setup.requestDelayMs,
    timeoutMs: setup.timeoutMs,
    networkSettleMs: setup.networkSettleMs ?? 2000,
    captureScreenshots: setup.captureScreenshots ?? true,
    captureRenderedHtml: setup.captureRenderedHtml ?? true,
    enableAiInsights: setup.enableAiInsights ?? true,
    excludePaths: setup.excludePaths,
  };
}

interface CrawlSetupScreenProps {
  setup: CrawlSetupConfig;
  disabled: boolean;
  onSetupChange: (patch: Partial<CrawlSetupConfig>) => void;
  onSave: () => void;
}

export function CrawlSetupScreen({
  setup,
  disabled,
  onSetupChange,
  onSave,
}: CrawlSetupScreenProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: toFormDefaults(setup),
    mode: 'onChange',
  });

  // Reset form with latest setup values when dialog opens
  useEffect(() => {
    if (open) {
      reset(toFormDefaults(setup));
    }
  }, [open, setup, reset]);

  const onSubmit = useCallback(
    (values: FormValues) => {
      onSetupChange(values);
      onSave();
      setOpen(false);
    },
    [onSetupChange, onSave],
  );

  const captureScreenshots = watch('captureScreenshots');
  const captureRenderedHtml = watch('captureRenderedHtml');
  const enableAiInsights = watch('enableAiInsights');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Settings2 className="h-4 w-4" />
          Config
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Automation Config</DialogTitle>
          <DialogDescription>
            Configure the target, crawl limits, scope rules, and timing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)}>
          <div className="max-h-[68vh] space-y-4 overflow-auto pr-1">
            {/* Target URL */}
            <div className="space-y-2">
              <Label htmlFor="target-url">Target URL</Label>
              <Input
                id="target-url"
                className="font-mono"
                placeholder="https://target.com"
                disabled={disabled}
                {...register('targetUrl')}
              />
              {errors.targetUrl && <p className="text-xs text-destructive">{errors.targetUrl.message}</p>}
            </div>

            {/* Numeric fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="max-depth">Max Depth</Label>
                <Input
                  id="max-depth"
                  type="number"
                  max={20}
                  disabled={disabled}
                  {...register('maxDepth')}
                />
                {errors.maxDepth && <p className="text-xs text-destructive">{errors.maxDepth.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-pages">Max Pages</Label>
                <Input
                  id="max-pages"
                  type="number"
                  max={10000}
                  disabled={disabled}
                  {...register('maxPages')}
                />
                {errors.maxPages && <p className="text-xs text-destructive">{errors.maxPages.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-delay">Delay (ms)</Label>
                <Input
                  id="request-delay"
                  type="number"
                  max={30000}
                  disabled={disabled}
                  {...register('requestDelayMs')}
                />
                {errors.requestDelayMs && <p className="text-xs text-destructive">{errors.requestDelayMs.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  max={120000}
                  disabled={disabled}
                  {...register('timeoutMs')}
                />
                {errors.timeoutMs && <p className="text-xs text-destructive">{errors.timeoutMs.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="network-settle">Network Settle (ms)</Label>
                <Input
                  id="network-settle"
                  type="number"
                  max={30000}
                  step={500}
                  disabled={disabled}
                  {...register('networkSettleMs')}
                />
                <p className="text-xs text-muted-foreground">Extra wait after page load to capture API/XHR calls.</p>
                {errors.networkSettleMs && <p className="text-xs text-destructive">{errors.networkSettleMs.message}</p>}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="mb-3 text-sm font-medium">Page Artifacts</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="enable-ai-insights">AI analysis</Label>
                    <p className="text-xs text-muted-foreground">Run AI-powered reconnaissance analysis during the crawl.</p>
                  </div>
                  <Switch
                    id="enable-ai-insights"
                    checked={enableAiInsights}
                    disabled={disabled}
                    onCheckedChange={(checked) => setValue('enableAiInsights', checked, { shouldDirty: true, shouldValidate: true })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="capture-screenshots">Capture screenshots</Label>
                    <p className="text-xs text-muted-foreground">Save a full-page PNG for each visited page.</p>
                  </div>
                  <Switch
                    id="capture-screenshots"
                    checked={captureScreenshots}
                    disabled={disabled}
                    onCheckedChange={(checked) => setValue('captureScreenshots', checked, { shouldDirty: true, shouldValidate: true })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="capture-rendered-html">Capture rendered HTML</Label>
                    <p className="text-xs text-muted-foreground">Save the post-JS DOM after the page finishes loading.</p>
                  </div>
                  <Switch
                    id="capture-rendered-html"
                    checked={captureRenderedHtml}
                    disabled={disabled}
                    onCheckedChange={(checked) => setValue('captureRenderedHtml', checked, { shouldDirty: true, shouldValidate: true })}
                  />
                </div>
              </div>
            </div>

            {/* Scope rules */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="exclude-paths">Exclude Paths</Label>
                <Input
                  id="exclude-paths"
                  className="font-mono"
                  placeholder="/logout, /delete, /billing"
                  disabled={disabled}
                  {...register('excludePaths')}
                />
                <p className="text-xs text-muted-foreground">Comma-separated paths to skip. Each must start with /.</p>
                {errors.excludePaths && <p className="text-xs text-destructive">{errors.excludePaths.message}</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={disabled || !isValid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
