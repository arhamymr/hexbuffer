'use client';

import { ChevronDown, ChevronRight, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTreeNode } from '@/pages/live-traffic/hooks/use-tree-node';
import type { TreeNodeData } from './types';

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  selectedId: string | null;
  defaultExpanded: boolean;
  onSelectEndpoint: (node: TreeNodeData) => void;
}

function getNodeIcon(nodeType: TreeNodeData['type']) {
  if (nodeType === 'host') {
    return { Icon: Globe, colorClassName: 'text-blue-500' };
  }

  return { Icon: FileText, colorClassName: 'text-gray-500' };
}

export function TreeNode({
  node,
  level,
  selectedId,
  defaultExpanded,
  onSelectEndpoint,
}: TreeNodeProps) {
  const { isExpanded, toggleExpanded } = useTreeNode(defaultExpanded);
  const hasChildren = node.children.length > 0;
  const isEndpoint = node.type === 'endpoint';
  const { Icon, colorClassName } = getNodeIcon(node.type);

  const handleClick = () => {
    if (isEndpoint) {
      onSelectEndpoint(node);
      return;
    }

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
          isExpanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
