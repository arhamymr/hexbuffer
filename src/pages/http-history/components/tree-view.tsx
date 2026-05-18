'use client';

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Globe, Folder, FileText } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getProxyTree, type TreeNode as ApiTreeNode, type TreePath } from '@/pages/http-history/api';
import { filterStateToProxyFilter } from '@/stores/filter';
import { useFilterStore } from '@/stores/filter';

export interface TreeNodeData {
  id: string;
  type: 'host' | 'path' | 'endpoint';
  label: string;
  fullPath?: string;
  method?: string;
  status?: number;
  children: TreeNodeData[];
  count?: number;
  methods?: string[];
}

interface TreeViewProps {
  onSelectEndpoint: (node: TreeNodeData) => void;
  selectedId: string | null;
}

function buildTreeNodeData(host: string, paths: TreePath[]): TreeNodeData {
  const hostNode: TreeNodeData = {
    id: `host-${host}`,
    type: 'host',
    label: host,
    children: [],
    count: paths.reduce((sum, p) => sum + p.count, 0),
    methods: [...new Set(paths.flatMap(p => p.methods))],
  };

  const pathMap = new Map<string, TreeNodeData>();

  for (const pathEntry of paths) {
    const segments = pathEntry.path.split('/').filter(Boolean);
    let current = hostNode;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      const childId = isLast
        ? `${current.id}/${segment}-${pathEntry.methods.join(',')}`
        : `${current.id}/${segment}`;

      let child = pathMap.get(childId);
      if (!child) {
        child = {
          id: childId,
          type: isLast ? 'endpoint' : 'path',
          label: segment,
          children: [],
          count: isLast ? pathEntry.count : 0,
          methods: isLast ? pathEntry.methods : [],
        };
        if (isLast) {
          child.fullPath = pathEntry.path;
        }
        current.children.push(child);
        pathMap.set(childId, child);
      } else if (isLast) {
        child.count = (child.count || 0) + pathEntry.count;
        child.methods = [...new Set([...(child.methods || []), ...pathEntry.methods])];
      }
    }
  }

  sortChildren(hostNode);
  return hostNode;
}

function sortChildren(node: TreeNodeData): void {
  node.children.sort((a, b) => {
    if (a.type === 'endpoint' && b.type !== 'endpoint') return 1;
    if (a.type !== 'endpoint' && b.type === 'endpoint') return -1;
    return a.label.localeCompare(b.label);
  });

  for (const child of node.children) {
    sortChildren(child);
  }
}

function TreeNodeComponent({
  node,
  level,
  onSelectEndpoint,
  selectedId,
  defaultExpanded,
}: {
  node: TreeNodeData;
  level: number;
  onSelectEndpoint: (node: TreeNodeData) => void;
  selectedId: string | null;
  defaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;
  const isEndpoint = node.type === "endpoint";

  const Icon = node.type === "host" ? Globe : node.type === "path" ? Folder : FileText;
  const iconColor =
    node.type === "host"
      ? "text-blue-500"
      : node.type === "path"
        ? "text-yellow-500"
        : "text-gray-500";

  return (
    <div>
      <div
        className={cn(
          "flex items-center font-mono gap-1.5 px-2 py-1 hover:bg-muted/50 cursor-pointer rounded-sm transition-colors",
          selectedId === node.id && "bg-muted"
        )}
        style={{ paddingLeft: `${level * 12}px` }}
        onClick={() => {
          if (isEndpoint) {
            onSelectEndpoint(node);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
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
        <Icon className={cn("w-3 h-3 flex-shrink-0", iconColor)} />
        <span className={cn("text-xs truncate flex-1", isEndpoint && "font-mono")}>
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
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onSelectEndpoint={onSelectEndpoint}
              selectedId={selectedId}
              defaultExpanded={level < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeView({
  onSelectEndpoint,
  selectedId,
}: TreeViewProps) {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const filter = useFilterStore((s) => s.filter);

  const fetchTree = useCallback(async () => {
    setIsLoading(true);
    try {
      const proxyFilter = filterStateToProxyFilter(filter);
      const result = await getProxyTree(proxyFilter);
      const tree = result.map(node => buildTreeNodeData(node.host, node.paths));
      setTreeData(tree);
    } catch (error) {
      console.error('Failed to fetch tree:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pl-1">
      {treeData.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          level={0}
          onSelectEndpoint={onSelectEndpoint}
          selectedId={selectedId}
          defaultExpanded={true}
        />
      ))}
    </div>
  );
}