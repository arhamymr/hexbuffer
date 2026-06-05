'use client';

import type { MouseEvent } from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Lock, LockOpen } from 'lucide-react';
import { HighlightedText } from '@/components/highlighted-text';
import { cn } from '@/lib/utils';
import type { TreeNodeData } from './types';

interface TreeNodeProps<TMeta = unknown> {
  node: TreeNodeData<TMeta>;
  level: number;
  selectedId: string | null;
  defaultExpanded: boolean;
  defaultExpandedIds: string[];
  onSelectNode?: (node: TreeNodeData<TMeta>) => void;
  onSelectEndpoint?: (node: TreeNodeData<TMeta>) => void;
  onSelectHost?: (node: TreeNodeData<TMeta>) => void;
  searchQuery?: string;
}

function isHttpsHost<TMeta>(node: TreeNodeData<TMeta>): boolean {
  if (node.label.endsWith(':443')) {
    return true;
  }

  return node.children.some((child) => child.label.toLowerCase().startsWith('https://'));
}

function getNodeIcon<TMeta>(node: TreeNodeData<TMeta>) {
  if (node.icon) {
    return { Icon: node.icon, colorClassName: node.iconClassName };
  }

  if (node.type === 'host') {
    return isHttpsHost(node)
      ? { Icon: Lock, colorClassName: 'text-emerald-500' }
      : { Icon: LockOpen, colorClassName: 'text-red-500' };
  }

  return { Icon: FileText, colorClassName: 'text-gray-500' };
}

export function TreeNode<TMeta = unknown>({
  node,
  level,
  selectedId,
  defaultExpanded,
  defaultExpandedIds,
  onSelectNode,
  onSelectEndpoint,
  onSelectHost,
  searchQuery = '',
}: TreeNodeProps<TMeta>) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;
  const isEndpoint = node.type === 'endpoint';
  const isHost = node.type === 'host';
  const { Icon, colorClassName } = getNodeIcon(node);

  const toggleExpanded = () => {
    setIsExpanded((currentValue) => !currentValue);
  };

  const handleClick = () => {
    onSelectNode?.(node);

    if (isEndpoint) {
      onSelectEndpoint?.(node);
      return;
    }

    if (isHost) {
      onSelectHost?.(node);
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
          'flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 font-mono transition-colors hover:bg-muted/50',
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
        <Icon className={cn('h-3 w-3 flex-shrink-0', colorClassName)} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn('truncate text-xs', isEndpoint && 'font-mono')}>
              <HighlightedText text={node.label} query={searchQuery} />
            </span>
            {node.badge}
          </div>
          {node.description && (
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {node.description}
            </div>
          )}
        </div>
        {node.count !== undefined && node.count > 0 && (
          <span className="rounded bg-muted px-1 text-xs text-muted-foreground">
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
              defaultExpanded={defaultExpandedIds.includes(child.id)}
              defaultExpandedIds={defaultExpandedIds}
              onSelectNode={onSelectNode}
              onSelectEndpoint={onSelectEndpoint}
              onSelectHost={onSelectHost}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}
