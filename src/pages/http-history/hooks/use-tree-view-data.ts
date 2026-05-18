import { useMemo } from 'react';
import type { TreePath } from '@/pages/http-history/api';
import { useHistoryTree } from '@/pages/http-history/hooks/use-history-tree';
import type { TreeNodeData } from '@/pages/http-history/components/tree-view/types';

function sortChildren(node: TreeNodeData): void {
  node.children.sort((left, right) => {
    if (left.type === 'endpoint' && right.type !== 'endpoint') return 1;
    if (left.type !== 'endpoint' && right.type === 'endpoint') return -1;
    return left.label.localeCompare(right.label);
  });

  for (const child of node.children) {
    sortChildren(child);
  }
}

function buildTreeNodeData(host: string, paths: TreePath[]): TreeNodeData {
  const hostNode: TreeNodeData = {
    id: `host-${host}`,
    type: 'host',
    label: host,
    children: [],
    count: paths.reduce((sum, path) => sum + path.count, 0),
    methods: [...new Set(paths.flatMap((path) => path.methods))],
  };

  const pathMap = new Map<string, TreeNodeData>();

  for (const pathEntry of paths) {
    const segments = pathEntry.path.split('/').filter(Boolean);
    let currentNode = hostNode;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isEndpoint = index === segments.length - 1;
      const childId = isEndpoint
        ? `${currentNode.id}/${segment}-${pathEntry.methods.join(',')}`
        : `${currentNode.id}/${segment}`;

      let childNode = pathMap.get(childId);
      if (!childNode) {
        childNode = {
          id: childId,
          type: isEndpoint ? 'endpoint' : 'path',
          label: segment,
          children: [],
          count: isEndpoint ? pathEntry.count : 0,
          methods: isEndpoint ? pathEntry.methods : [],
        };

        if (isEndpoint) {
          childNode.fullPath = pathEntry.path;
        }

        currentNode.children.push(childNode);
        pathMap.set(childId, childNode);
      } else if (isEndpoint) {
        childNode.count = (childNode.count || 0) + pathEntry.count;
        childNode.methods = [...new Set([...(childNode.methods || []), ...pathEntry.methods])];
      }

      currentNode = childNode;
    }
  }

  sortChildren(hostNode);
  return hostNode;
}

export function useTreeViewData() {
  const { treeData, isLoading, loadError } = useHistoryTree();

  const nodes = useMemo(
    () => treeData.map((node) => buildTreeNodeData(node.host, node.paths)),
    [treeData]
  );

  return {
    nodes,
    isLoading,
    loadError,
  };
}
