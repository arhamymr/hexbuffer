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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
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
    <div className="flex h-full items-center justify-center overflow-auto bg-background p-4 md:p-8">
      <Card className="w-full max-w-xl border bg-card text-card-foreground shadow-lg">
        <CardHeader className="space-y-2 text-center pb-4 border-b">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Code2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">Playground</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Open a folder or create a new project to start editing code.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Main Action or Form */}
          {!showCreateForm ? (
            <div className="space-y-4">
              {/* Open Folder Button */}
              <Button
                className="w-full h-10 gap-2 text-sm"
                onClick={onOpenFolder}
              >
                <FolderOpen className="h-4 w-4" />
                Open Folder
              </Button>

              {/* Recent Folders */}
              {recentDisplay.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Recent Folders
                  </h3>
                  <div className="max-h-[180px] overflow-y-auto border rounded-md divide-y bg-background">
                    {recentDisplay.map((folderPath) => {
                      const segments = folderPath.split('/').filter(Boolean);
                      const folderName = segments[segments.length - 1] ?? folderPath;
                      const parentPath = segments.slice(0, -1).join('/') || '/';
                      return (
                        <div
                          key={folderPath}
                          className="flex items-center justify-between p-2 hover:bg-muted/50 transition-colors group"
                        >
                          <button
                            onClick={() => onOpenRecent(folderPath)}
                            className="flex-1 text-left flex items-center gap-3 min-w-0"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                              <FolderOpen className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium text-foreground">{folderName}</div>
                              <div className="truncate text-[10px] text-muted-foreground">{parentPath}</div>
                            </div>
                          </button>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Or Create Project Option */}
              <Button
                variant="outline"
                className="w-full h-10 gap-2 text-xs font-medium"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Project
              </Button>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold">New Project</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                  className="h-7 px-2 text-xs"
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                  <Input
                    placeholder="my-project"
                    value={projectName}
                    className="h-8 text-xs bg-background"
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isCreating) handleCreate();
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Language</label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as PlaygroundLanguage)}>
                    <SelectTrigger className="w-full h-8 text-xs bg-background">
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
                </div>

                <Button
                  className="w-full h-9 text-xs"
                  onClick={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Creating project...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Detected Toolchains */}
          <div className="border-t pt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detected Toolchains
            </h3>
            {isLoadingSystemInfo ? (
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : systemInfoError ? (
              <p className="text-xs text-destructive">{systemInfoError}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {systemInfo?.compilers.map((compiler) => (
                  <div
                    key={compiler.name}
                    className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
                  >
                    {compiler.available ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    )}
                    <span className="w-10 font-mono text-[11px] font-medium">{compiler.name}</span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {compiler.available ? compiler.version : 'Not installed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
