'use client';

import { useCallback, useState } from 'react';
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
import type { CrawlSetupConfig } from '../types';

interface CrawlSetupScreenProps {
  setup: CrawlSetupConfig;
  disabled: boolean;
  onSetupChange: (patch: Partial<CrawlSetupConfig>) => void;
  onSave: () => void;
}

/** Clamp a numeric string to [min, max] and return the clamped number. */
function clampNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Validation error messages per field. */
interface ValidationErrors {
  targetUrl?: string;
  maxDepth?: string;
  maxPages?: string;
  requestDelayMs?: string;
  timeoutMs?: string;
  networkSettleMs?: string;
  excludePaths?: string;
}

function validate(setup: CrawlSetupConfig): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!setup.targetUrl.trim()) {
    errors.targetUrl = 'Target URL is required.';
  } else {
    try {
      const url = new URL(setup.targetUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.targetUrl = 'URL must start with http:// or https://.';
      }
    } catch {
      errors.targetUrl = 'Enter a valid URL (e.g. https://example.com).';
    }
  }

  if (setup.maxDepth < 1) errors.maxDepth = 'Must be at least 1.';
  if (setup.maxDepth > 20) errors.maxDepth = 'Maximum depth is 20.';

  if (setup.maxPages < 1) errors.maxPages = 'Must be at least 1.';
  if (setup.maxPages > 10000) errors.maxPages = 'Maximum is 10,000.';

  if (setup.requestDelayMs < 0) errors.requestDelayMs = 'Cannot be negative.';
  if (setup.requestDelayMs > 30000) errors.requestDelayMs = 'Maximum is 30,000 ms.';

  if (setup.timeoutMs < 1000) errors.timeoutMs = 'Must be at least 1,000 ms.';
  if (setup.timeoutMs > 120000) errors.timeoutMs = 'Maximum is 120,000 ms.';

  const settleMs = setup.networkSettleMs ?? 2000;
  if (settleMs < 0) errors.networkSettleMs = 'Cannot be negative.';
  if (settleMs > 30000) errors.networkSettleMs = 'Maximum is 30,000 ms.';

  // Validate exclude paths: each entry should start with /
  if (setup.excludePaths.trim()) {
    const segments = setup.excludePaths.split(',').map((s) => s.trim()).filter(Boolean);
    const invalid = segments.filter((s) => !s.startsWith('/'));
    if (invalid.length > 0) {
      errors.excludePaths = `Each path must start with /. Invalid: ${invalid.join(', ')}`;
    }
  }

  return errors;
}

function hasErrors(errors: ValidationErrors) {
  return Object.values(errors).some((v) => v !== undefined);
}

export function CrawlSetupScreen({
  setup,
  disabled,
  onSetupChange,
  onSave,
}: CrawlSetupScreenProps) {
  const [open, setOpen] = useState(false);
  const errors = validate(setup);
  const canSave = !hasErrors(errors) && setup.targetUrl.trim().length > 0;

  const handleSave = useCallback(() => {
    onSave();
    setOpen(false);
  }, [onSave]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Settings2 className="h-4 w-4" />
          Automation Config
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Automation Config</DialogTitle>
          <DialogDescription>
            Configure the target, crawl limits, scope rules, and timing.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] space-y-4 overflow-auto pr-1">
          {/* Target URL */}
          <div className="space-y-2">
            <Label htmlFor="target-url">Target URL</Label>
            <Input
              id="target-url"
              className="font-mono"
              placeholder="https://target.com"
              value={setup.targetUrl}
              onChange={(event) => onSetupChange({ targetUrl: event.target.value })}
              disabled={disabled}
            />
            {errors.targetUrl && <p className="text-xs text-destructive">{errors.targetUrl}</p>}
          </div>

          {/* Numeric fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="max-depth">Max Depth</Label>
              <Input
                id="max-depth"
                type="number"
                min={1}
                max={20}
                value={setup.maxDepth}
                onChange={(event) =>
                  onSetupChange({ maxDepth: clampNumber(event.target.value, 1, 20, setup.maxDepth) })
                }
                disabled={disabled}
              />
              {errors.maxDepth && <p className="text-xs text-destructive">{errors.maxDepth}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-pages">Max Pages</Label>
              <Input
                id="max-pages"
                type="number"
                min={1}
                max={10000}
                value={setup.maxPages}
                onChange={(event) =>
                  onSetupChange({ maxPages: clampNumber(event.target.value, 1, 10000, setup.maxPages) })
                }
                disabled={disabled}
              />
              {errors.maxPages && <p className="text-xs text-destructive">{errors.maxPages}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-delay">Delay (ms)</Label>
              <Input
                id="request-delay"
                type="number"
                min={0}
                max={30000}
                value={setup.requestDelayMs}
                onChange={(event) =>
                  onSetupChange({ requestDelayMs: clampNumber(event.target.value, 0, 30000, setup.requestDelayMs) })
                }
                disabled={disabled}
              />
              {errors.requestDelayMs && <p className="text-xs text-destructive">{errors.requestDelayMs}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                min={1000}
                max={120000}
                value={setup.timeoutMs}
                onChange={(event) =>
                  onSetupChange({ timeoutMs: clampNumber(event.target.value, 1000, 120000, setup.timeoutMs) })
                }
                disabled={disabled}
              />
              {errors.timeoutMs && <p className="text-xs text-destructive">{errors.timeoutMs}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="network-settle">Network Settle (ms)</Label>
              <Input
                id="network-settle"
                type="number"
                min={0}
                max={30000}
                step={500}
                value={setup.networkSettleMs ?? 2000}
                onChange={(event) =>
                  onSetupChange({ networkSettleMs: clampNumber(event.target.value, 0, 30000, 2000) })
                }
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">Extra wait after page load to capture API/XHR calls.</p>
              {errors.networkSettleMs && <p className="text-xs text-destructive">{errors.networkSettleMs}</p>}
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
                value={setup.excludePaths}
                onChange={(event) => onSetupChange({ excludePaths: event.target.value })}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">Comma-separated paths to skip. Each must start with /.</p>
              {errors.excludePaths && <p className="text-xs text-destructive">{errors.excludePaths}</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={disabled || !canSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
