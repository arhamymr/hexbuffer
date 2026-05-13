'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RepeaterTab } from '../types';

interface RepeaterTabBarProps {
  tabs: RepeaterTab[];
  activeTabId: string | null;
  onAddTab: () => void;
  onRemoveTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
}

export function RepeaterTabBar({
  tabs,
  activeTabId,
  onAddTab,
  onRemoveTab,
  onSelectTab,
}: RepeaterTabBarProps) {
  return (
    <div className="flex items-center gap-1 border-b bg-muted/30 p-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onAddTab}
        className="h-7 px-2"
      >
        <Plus className="h-4 w-4 mr-1" />
        New Tab
      </Button>

      <div className="h-6 w-px bg-border mx-2" />

      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            flex items-center gap-1 px-3 py-1 rounded-md cursor-pointer text-sm
            transition-colors
            ${tab.id === activeTabId
              ? 'bg-background shadow-sm border'
              : 'hover:bg-muted'
            }
          `}
          onClick={() => onSelectTab(tab.id)}
        >
          <Badge
            variant="outline"
            className={`
              text-xs px-1.5 py-0.5 font-normal
              ${tab.request.method === 'GET' ? 'text-green-600' : ''}
              ${tab.request.method === 'POST' ? 'text-blue-600' : ''}
              ${tab.request.method === 'PUT' ? 'text-orange-600' : ''}
              ${tab.request.method === 'DELETE' ? 'text-red-600' : ''}
              ${['PATCH', 'HEAD', 'OPTIONS'].includes(tab.request.method) ? 'text-muted-foreground' : ''}
            `}
          >
            {tab.request.method}
          </Badge>
          <span className="max-w-[100px] truncate">{tab.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (tabs.length > 1) {
                onRemoveTab(tab.id);
              }
            }}
            className={`
              ml-1 rounded hover:bg-muted p-0.5
              ${tabs.length === 1 ? 'opacity-30 cursor-not-allowed' : ''}
            `}
            disabled={tabs.length === 1}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}