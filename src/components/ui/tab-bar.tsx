import * as React from 'react';
import { XIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface TabItem {
  id: string;
  name: string;
  method?: string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onAddTab?: () => void;
  onRemoveTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  addTabLabel?: string;
}

export function TabBar({
  tabs,
  activeTabId,
  onAddTab,
  onRemoveTab,
  onSelectTab,
  addTabLabel = 'New Tab',
}: TabBarProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/30 overflow-x-auto">
      {onAddTab && (
        <>
          <Button
            variant="outline"
            size="xs"
            onClick={onAddTab}
            className="h-7 px-2 shrink-0"
          >
            <XIcon className="h-3 w-3 mr-1 rotate-45" />
            {addTabLabel}
          </Button>
          <div className="h-6 w-px bg-border mx-1 shrink-0" />
        </>
      )}

      <div className="flex items-center gap-1 flex-1 min-w-0">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab.name}
            method={tab.method}
            isActive={activeTabId === tab.id}
            onClick={() => onSelectTab(tab.id)}
            onClose={(e) => {
              e.stopPropagation();
              onRemoveTab(tab.id);
            }}
            canClose={tabs.length > 1}
          />
        ))}
      </div>
    </div>
  );
}

interface TabItemProps {
  tab: string;
  method?: string;
  isActive: boolean;
  onClick: () => void;
  onClose?: (e: React.MouseEvent) => void;
  canClose?: boolean;
}

function TabItem({ tab, method, isActive, onClick, onClose, canClose = true }: TabItemProps) {
  const methodColors: Record<string, string> = {
    GET: 'text-green-600',
    POST: 'text-blue-600',
    PUT: 'text-orange-600',
    DELETE: 'text-red-600',
    PATCH: 'text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'flex items-center rounded-md text-sm transition-colors min-w-0 hover:bg-muted/50 py-1.5 px-2 cursor-pointer gap-2',
        isActive
          ? 'bg-background font-medium border-x border-t border-green-500 font-semibold'
          : 'border text-muted-foreground'
      )}
      onClick={onClick}
    >
      {method && (
        <span className={cn('text-xs px-1.5 py-0.5 font-normal', methodColors[method] || 'text-muted-foreground')}>
          {method}
        </span>
      )}
      <span className="truncate text-xs max-w-[150px]">{tab}</span>
      {canClose && onClose && (
        <div
          onClick={onClose}
          className="shrink-0 hover:bg-muted rounded p-0.5"
        >
          <XIcon className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}