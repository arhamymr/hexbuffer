import {
  FolderX,
  Hammer,
  Loader2,
  PanelBottomClose,
  PanelBottomOpen,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useGlobalTerminalStore } from '@/stores/global-terminal';
import type { WorkspaceFolder } from '../types';

interface PlaygroundToolbarProps {
  workspace: WorkspaceFolder;
  isBuilding: boolean;
  onBuild: () => void;
  onRun: () => void;
  onRefresh: () => void;
  onCloseFolder: () => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  rust: 'Rust',
  c: 'C',
  cpp: 'C++',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
};

export function PlaygroundToolbar({
  workspace,
  isBuilding,
  onBuild,
  onRun,
  onRefresh,
  onCloseFolder,
}: PlaygroundToolbarProps) {
  const hasBuildSupport =
    (workspace.language !== 'unknown' && LANGUAGE_LABELS[workspace.language] !== undefined) ||
    ['rust', 'c', 'cpp'].includes(workspace.language);

  const languageLabel = LANGUAGE_LABELS[workspace.language] ?? null;

  const isTerminalOpen = useGlobalTerminalStore((s) => s.isOpen);
  const setIsOpen = useGlobalTerminalStore((s) => s.setIsOpen);

  const handleToggleTerminal = () => setIsOpen(!isTerminalOpen);

  return (
    <aside className="flex w-11 shrink-0 flex-col items-center gap-1 border-r bg-muted/50 py-2">
      {/* Workspace label (rotated, top) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mb-1 flex h-7 w-7 cursor-default items-center justify-center">
            <span
              className="max-w-[24px] truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              title={workspace.name}
            >
              {workspace.name.slice(0, 2)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span className="font-medium">{workspace.name}</span>
          {languageLabel && (
            <span className="ml-1.5 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
              {languageLabel}
            </span>
          )}
        </TooltipContent>
      </Tooltip>

      <Separator className="w-6" />

      {/* Build / Run */}
      {hasBuildSupport && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8"
                onClick={onBuild}
                disabled={isBuilding}
                aria-label="Build"
              >
                {isBuilding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Hammer className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Build</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8"
                onClick={onRun}
                disabled={isBuilding}
                aria-label="Run"
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Run</TooltipContent>
          </Tooltip>

          <Separator className="my-0.5 w-6" />
        </>
      )}

      {/* File operations */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            onClick={onRefresh}
            aria-label="Refresh files"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Refresh Files</TooltipContent>
      </Tooltip>

      {/* Spacer pushes bottom actions down */}
      <div className="flex-1" />

      <Separator className="my-0.5 w-6" />

      {/* Terminal toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            onClick={handleToggleTerminal}
            aria-label={isTerminalOpen ? 'Hide terminal' : 'Show terminal'}
          >
            {isTerminalOpen ? (
              <PanelBottomClose className="h-4 w-4" />
            ) : (
              <PanelBottomOpen className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isTerminalOpen ? 'Hide Terminal' : 'Show Terminal'}
        </TooltipContent>
      </Tooltip>

      {/* Close folder */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onCloseFolder}
            aria-label="Close folder"
          >
            <FolderX className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Close Folder</TooltipContent>
      </Tooltip>
    </aside>
  );
}
