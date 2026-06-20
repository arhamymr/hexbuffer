import { Circle, FileCode2, SplitSquareVertical, X } from 'lucide-react';
import type { OpenTab } from '../../../types';

interface TabBarProps {
  tabs: OpenTab[];
  activePath: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (tab: OpenTab) => void;
  dirtyMap?: Record<string, boolean>;
  onSplit?: () => void;
  onClosePane?: () => void;
  workspacePath?: string;
}

export function TabBar({
  tabs,
  activePath,
  onTabClick,
  onTabClose: onClose,
  dirtyMap,
  onSplit,
  onClosePane,
  workspacePath,
}: TabBarProps) {
  return (
    <div className="flex shrink-0 items-center border-b bg-muted">
      <div className="flex min-w-0 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.path === activePath;
          const isDirty = dirtyMap ? dirtyMap[tab.path] : tab.isDirty;
          return (
            <button
              key={tab.path}
              className={`group flex h-9 max-w-[220px] items-center gap-1.5 border-r px-3 text-xs whitespace-nowrap transition-colors ${isActive
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              onClick={() => onTabClick(tab.path)}
              type="button"
            >
              <FileCode2 className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[120px] truncate">{tab.name}</span>
              {isDirty && (
                <Circle className="h-1.5 w-1.5 shrink-0 fill-current text-amber-500" />
              )}
              <span
                className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab);
                }}
                role="button"
                aria-label={`Close ${tab.name}`}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>
      {onSplit && workspacePath && (
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center border-l text-muted-foreground hover:bg-muted/50"
          onClick={onSplit}
          aria-label="Split editor"
          type="button"
        >
          <SplitSquareVertical className="h-4 w-4" />
        </button>
      )}
      {onClosePane && (
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center border-l text-muted-foreground hover:bg-muted/50"
          onClick={onClosePane}
          aria-label="Close pane"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
