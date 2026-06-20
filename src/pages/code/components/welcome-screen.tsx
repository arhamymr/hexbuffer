import {
  Code2,
  FolderOpen,
  Loader2,
  Check,
  X,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react';
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
import type { SystemInfo, PlaygroundLanguage } from '../types';
import { useWelcomeScreen } from './hooks/use-welcome-screen';

interface WelcomeScreenProps {
  onOpenFolder: () => void;
  recentFolders: string[];
  onOpenRecent: (path: string) => void;
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

export function WelcomeScreen({
  onOpenFolder,
  recentFolders,
  onOpenRecent,
  systemInfo,
  isLoadingSystemInfo,
  systemInfoError,
  onCreateProject,
}: WelcomeScreenProps) {
  const {
    showCreateForm,
    setShowCreateForm,
    projectName,
    setProjectName,
    language,
    setLanguage,
    isCreating,
    recentDisplay,
    handleCreate,
  } = useWelcomeScreen({
    onCreateProject,
    recentFolders,
  });

  return (
    <div className="flex h-full items-start justify-center overflow-auto bg-background p-8">
      <div className="w-full max-w-lg space-y-8 pt-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Code2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
          <p className="text-sm text-muted-foreground">
            Open a folder to start editing code.
          </p>
        </div>

        {/* Open Folder — primary action */}
        <Button
          className="w-full"
          size="lg"
          onClick={onOpenFolder}
        >
          <FolderOpen className="mr-2 h-5 w-5" />
          Open Folder
        </Button>

        {/* Recent folders */}
        {recentDisplay.length > 0 && !showCreateForm && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Clock className="mr-1.5 inline h-3.5 w-3.5" />
              Recent Folders
            </h3>
            <div className="space-y-1">
              {recentDisplay.map((folderPath) => {
                const segments = folderPath.split('/').filter(Boolean);
                const folderName = segments[segments.length - 1] ?? folderPath;
                const parentPath = segments.slice(0, -1).join('/') || '/';
                return (
                  <button
                    key={folderPath}
                    className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                    onClick={() => onOpenRecent(folderPath)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <FolderOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-sm font-medium">{folderName}</span>
                      <p className="truncate text-[11px] text-muted-foreground">{parentPath}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Create New Project (secondary) */}
        {!showCreateForm ? (
          <button
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="mr-1 inline h-3 w-3" />
            Or create a new Rust / C / C++ project
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">New Project</h3>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>

            <label className="text-sm font-medium">Project Name</label>
            <Input
              placeholder="my-project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) handleCreate();
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
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating project...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        )}

        {/* Detected Toolchains */}
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
                  <span className="w-14 font-mono text-xs font-medium">{compiler.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
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
