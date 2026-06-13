import { useState } from 'react';
import { Code2, Loader2, Check, X, FolderOpen, Plus, Box, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemInfo, PlaygroundLanguage, ProjectSummary } from '../types';

interface GetStartedCardProps {
  systemInfo: SystemInfo | null;
  isLoadingSystemInfo: boolean;
  systemInfoError: string | null;
  existingProjects: ProjectSummary[];
  isLoadingProjects: boolean;
  onCreateProject: (name: string, language: PlaygroundLanguage) => Promise<void>;
  onOpenProject: (summary: ProjectSummary) => Promise<void>;
}

const LANGUAGE_OPTIONS: { value: PlaygroundLanguage; label: string }[] = [
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
];

function languageLabel(lang: string): string {
  if (lang === 'rust') return 'Rust';
  if (lang === 'cpp') return 'C++';
  return 'C';
}

export function GetStartedCard({
  systemInfo,
  isLoadingSystemInfo,
  systemInfoError,
  existingProjects,
  isLoadingProjects,
  onCreateProject,
  onOpenProject,
}: GetStartedCardProps) {
  const [projectName, setProjectName] = useState('');
  const [language, setLanguage] = useState<PlaygroundLanguage>('rust');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleGetStarted = async () => {
    const name = projectName.trim() || 'playground-project';
    setIsCreating(true);
    try {
      await onCreateProject(name, language);
    } finally {
      setIsCreating(false);
    }
  };

  const hasProjects = existingProjects.length > 0;

  return (
    <div className="flex h-full items-start justify-center bg-background p-8 overflow-auto">
      <div className="w-full max-w-lg space-y-6 pt-8">
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

        {/* Existing projects list */}
        {hasProjects && !showCreateForm && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your Projects
            </h3>
            {isLoadingProjects ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {existingProjects.map((proj) => (
                  <button
                    key={proj.path}
                    className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                    onClick={() => onOpenProject(proj)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Box className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{proj.name}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                          {languageLabel(proj.language)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Modified {proj.lastModified}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Project
            </Button>
          </div>
        )}

        {/* Create new project form */}
        {(showCreateForm || !hasProjects) && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            {hasProjects && (
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCreateForm(false)}
                >
                  ← Back to projects
                </button>
              </div>
            )}

            <label className="text-sm font-medium">Project Name</label>
            <Input
              placeholder="my-project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) handleGetStarted();
              }}
            />

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
        )}

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
