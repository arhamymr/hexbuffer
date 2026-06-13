import { useState } from 'react';
import { Code2, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemInfo, PlaygroundLanguage } from '../types';

interface GetStartedCardProps {
  systemInfo: SystemInfo | null;
  isLoadingSystemInfo: boolean;
  systemInfoError: string | null;
  onCreateProject: (name: string, language: PlaygroundLanguage) => Promise<void>;
}

const LANGUAGE_OPTIONS: { value: PlaygroundLanguage; label: string }[] = [
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
];

export function GetStartedCard({
  systemInfo,
  isLoadingSystemInfo,
  systemInfoError,
  onCreateProject,
}: GetStartedCardProps) {
  const [language, setLanguage] = useState<PlaygroundLanguage>('rust');
  const [isCreating, setIsCreating] = useState(false);

  const handleGetStarted = async () => {
    setIsCreating(true);
    try {
      await onCreateProject('playground-project', language);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Code2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
          <p className="text-sm text-muted-foreground">
            Write, build, and test code with your system toolchains.
          </p>
        </div>

        {/* Language selector + Get Started button */}
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <label className="text-sm font-medium">Language</label>
          <Select value={language} onValueChange={(v) => setLanguage(v as PlaygroundLanguage)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="w-full"
            size="lg"
            onClick={handleGetStarted}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating project...
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>

        {/* Compiler detection */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Detected Toolchains
          </h3>
          {isLoadingSystemInfo ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : systemInfoError ? (
            <p className="text-sm text-destructive">{systemInfoError}</p>
          ) : (
            <div className="space-y-1.5">
              {systemInfo?.compilers.map((compiler) => (
                <div
                  key={compiler.name}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  {compiler.available ? (
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-red-400" />
                  )}
                  <span className="font-mono text-xs font-medium w-14">{compiler.name}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {compiler.available ? compiler.version : 'Not installed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
