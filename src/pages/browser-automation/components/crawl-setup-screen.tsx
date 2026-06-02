'use client';

import { Bookmark, FolderOpen, Play, Settings2 } from 'lucide-react';
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

interface CrawlSetupScreenProps {
  setup: CrawlSetupConfig;
  disabled: boolean;
  onSetupChange: (patch: Partial<CrawlSetupConfig>) => void;
  onStart: () => void;
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CrawlSetupScreen({
  setup,
  disabled,
  onSetupChange,
  onStart,
}: CrawlSetupScreenProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="h-4 w-4" />
          Crawl Config
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Crawl Config</DialogTitle>
          <DialogDescription>
            Configure the target, crawl limits, scope rules, timing, and AI analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] space-y-4 overflow-auto pr-1">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="max-depth">Max Depth</Label>
            <Input
              id="max-depth"
              type="number"
              min={1}
              value={setup.maxDepth}
              onChange={(event) => onSetupChange({ maxDepth: numberValue(event.target.value, setup.maxDepth) })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-pages">Max Pages</Label>
            <Input
              id="max-pages"
              type="number"
              min={1}
              value={setup.maxPages}
              onChange={(event) => onSetupChange({ maxPages: numberValue(event.target.value, setup.maxPages) })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request-delay">Delay</Label>
            <Input
              id="request-delay"
              type="number"
              min={0}
              value={setup.requestDelayMs}
              onChange={(event) =>
                onSetupChange({ requestDelayMs: numberValue(event.target.value, setup.requestDelayMs) })
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout</Label>
            <Input
              id="timeout"
              type="number"
              min={1000}
              value={setup.timeoutMs}
              onChange={(event) => onSetupChange({ timeoutMs: numberValue(event.target.value, setup.timeoutMs) })}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border p-2">
            <div>
              <div className="text-sm font-medium">Same-domain only</div>
              <div className="text-xs text-muted-foreground">Keep navigation inside the target origin.</div>
            </div>
            <Switch
              checked={setup.sameDomainOnly}
              onCheckedChange={(checked) => onSetupChange({ sameDomainOnly: checked })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="include-paths">Include Paths</Label>
            <Input
              id="include-paths"
              className="font-mono"
              value={setup.includePaths}
              onChange={(event) => onSetupChange({ includePaths: event.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exclude-paths">Exclude Paths</Label>
            <Input
              id="exclude-paths"
              className="font-mono"
              value={setup.excludePaths}
              onChange={(event) => onSetupChange({ excludePaths: event.target.value })}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between rounded-md border p-2">
            <span className="text-sm">AI insights</span>
            <Switch
              checked={setup.enableAiInsights}
              onCheckedChange={(checked) => onSetupChange({ enableAiInsights: checked })}
              disabled={disabled}
            />
          </div>
        </div>

        </div>

        <DialogFooter className="grid grid-cols-[1fr_auto_auto] gap-2 sm:flex">
          <Button onClick={onStart} disabled={disabled || !setup.targetUrl.trim()}>
            <Play className="h-4 w-4" />
            Start Crawl
          </Button>
          <Button variant="outline" disabled={disabled}>
            <Bookmark className="h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" disabled={disabled}>
            <FolderOpen className="h-4 w-4" />
            Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
