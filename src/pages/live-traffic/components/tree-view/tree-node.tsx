'use client';

import type { MouseEvent } from 'react';
import { ChevronDown, ChevronRight, FileText, Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTreeNode } from '@/pages/live-traffic/hooks/use-tree-node';
import type { TreeNodeData } from './types';

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  selectedId: string | null;
  defaultExpanded: boolean;
  onSelectEndpoint: (node: TreeNodeData) => void;
  onSelectHost: (node: TreeNodeData) => void;
}

function isHttpsHost(node: TreeNodeData): boolean {
  if (node.label.endsWith(':443')) {
    return true;
  }

  return node.children.some((child) => child.label.toLowerCase().startsWith('https://'));
}

function getNodeIcon(node: TreeNodeData) {
  if (node.type === 'host') {
    return isHttpsHost(node)
      ? { Icon: Lock, colorClassName: 'text-emerald-500' }
      : { Icon: LockOpen, colorClassName: 'text-red-500' };
  }

  return { Icon: FileText, colorClassName: 'text-gray-500' };
}

export function TreeNode({
  node,
  level,
  selectedId,
  defaultExpanded,
  onSelectEndpoint,
  onSelectHost,
}: TreeNodeProps) {
  const { isExpanded, toggleExpanded } = useTreeNode(defaultExpanded);
  const hasChildren = node.children.length > 0;
  const isEndpoint = node.type === 'endpoint';
  const isHost = node.type === 'host';
  const { Icon, colorClassName } = getNodeIcon(node);

  const handleClick = () => {
    if (isEndpoint) {
      onSelectEndpoint(node);
      return;
    }

    if (isHost) {
      onSelectHost(node);
    }

    if (hasChildren && !isExpanded) {
      toggleExpanded();
    }
  };

  const handleChevronClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    toggleExpanded();
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center font-mono gap-1.5 px-2 py-1 hover:bg-muted/50 cursor-pointer rounded-sm transition-colors',
          selectedId === node.id && 'bg-muted'
        )}
        style={{ paddingLeft: `${level * 12}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-3 w-3 flex-shrink-0 items-center justify-center text-muted-foreground"
            onClick={handleChevronClick}
            aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <Icon className={cn('w-3 h-3 flex-shrink-0', colorClassName)} />
        <span className={cn('text-xs truncate flex-1', isEndpoint && 'font-mono')}>
          {node.label}
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1 rounded">
            {node.count}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              defaultExpanded={false}
              onSelectEndpoint={onSelectEndpoint}
              onSelectHost={onSelectHost}
            />
          ))}
        </div>
      )}
    </div>
  );
}
