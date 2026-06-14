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
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const hasBuildSupport = workspace.language !== 'unknown' && LANGUAGE_LABELS[workspace.language] !== undefined || ['rust', 'c', 'cpp'].includes(workspace.language);
  const languageLabel = LANGUAGE_LABELS[workspace.language] ?? null;

  const isTerminalOpen = useGlobalTerminalStore((s) => s.isOpen);
  const setIsOpen = useGlobalTerminalStore((s) => s.setIsOpen);

  const handleToggleTerminal = () => setIsOpen(!isTerminalOpen);

  return (
    <header className="shrink-0 border-b bg-muted px-3 py-3">
      <div className="flex flex-row gap-3 xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">{workspace.name}</span>
          {languageLabel && (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
              {languageLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasBuildSupport && (
            <ButtonGroup>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="xs"
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
                <TooltipContent side="bottom">Build</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={onRun}
                    disabled={isBuilding}
                    aria-label="Run"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Run</TooltipContent>
              </Tooltip>
            </ButtonGroup>
          )}

          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={onRefresh}
                  aria-label="Refresh files"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh</TooltipContent>
            </Tooltip>
          </ButtonGroup>

          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
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
              <TooltipContent side="bottom">
                {isTerminalOpen ? 'Hide Terminal' : 'Show Terminal'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={onCloseFolder}
                  aria-label="Close folder"
                >
                  <FolderX className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close Folder</TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </div>
      </div>
    </header>
  );
}
