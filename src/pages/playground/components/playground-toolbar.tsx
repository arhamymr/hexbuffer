import { Hammer, Play, FilePlus, RefreshCw, FolderX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PlaygroundProject } from '../types';

interface PlaygroundToolbarProps {
  project: PlaygroundProject;
  isBuilding: boolean;
  onBuild: () => void;
  onRun: () => void;
  onNewFile: () => void;
  onRefresh: () => void;
  onCloseProject: () => void;
}

export function PlaygroundToolbar({
  project,
  isBuilding,
  onBuild,
  onRun,
  onNewFile,
  onRefresh,
  onCloseProject,
}: PlaygroundToolbarProps) {
  const languageLabel =
    project.language === 'rust' ? 'Rust' : project.language === 'cpp' ? 'C++' : 'C';

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b bg-card px-3 py-1.5">
      {/* Project info */}
      <div className="mr-2 flex items-center gap-2 min-w-0">
        <span className="truncate text-sm font-medium">{project.name}</span>
        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
          {languageLabel}
        </span>
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Actions */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onBuild}
            disabled={isBuilding}
          >
            {isBuilding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Hammer className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Build</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRun}
            disabled={isBuilding}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Run</TooltipContent>
      </Tooltip>

      <div className="h-5 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNewFile}>
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">New File</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Refresh</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onCloseProject}
          >
            <FolderX className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Close Project</TooltipContent>
      </Tooltip>
    </div>
  );
}
