import type { ApiCall } from '@/types';
import type { TreeNodeData } from './mock';

export function buildSiteMapTree(calls: ApiCall[]): TreeNodeData[] {
  const dedupedCalls = deduplicateCalls(calls);
  const hostMap = new Map<string, ApiCall[]>();

  for (const call of dedupedCalls) {
    const existing = hostMap.get(call.host);
    if (existing) {
      existing.push(call);
    } else {
      hostMap.set(call.host, [call]);
    }
  }

  const tree: TreeNodeData[] = [];

  for (const [host, hostCalls] of hostMap) {
    const root: TreeNodeData = {
      id: `host-${host}`,
      type: 'host',
      label: host,
      children: [],
    };

    for (const call of hostCalls) {
      insertCallIntoTree(root, call);
    }

    sortChildren(root);
    tree.push(root);
  }

  tree.sort((a, b) => a.label.localeCompare(b.label));

  return tree;
}

function deduplicateCalls(calls: ApiCall[]): ApiCall[] {
  const seen = new Map<string, ApiCall>();

  for (const call of calls) {
    const key = `${call.host}|${call.path}|${call.method}`;
    const existing = seen.get(key);
    if (!existing || call.timestamp > existing.timestamp) {
      seen.set(key, call);
    }
  }

  return Array.from(seen.values());
}

function insertCallIntoTree(hostNode: TreeNodeData, call: ApiCall) {
  const segments = call.path.split('/').filter(Boolean);
  let current = hostNode;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    const childId = isLast
      ? `endpoint-${call.id}`
      : `${current.id}/${segment}`;

    let child = current.children.find((c) => c.label === segment && c.type !== 'endpoint');

    if (!child) {
      child = {
        id: childId,
        type: isLast ? 'endpoint' : 'path',
        label: segment,
        children: [],
      };
      if (isLast) {
        child.fullPath = call.path;
        child.method = call.method;
        child.status = call.response_status ?? undefined;
      }
      current.children.push(child);
    }

    current = child;
  }
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