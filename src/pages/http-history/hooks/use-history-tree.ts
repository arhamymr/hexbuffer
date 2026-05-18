import { useCallback, useEffect, useState } from 'react';

import type { TreeNode as ApiTreeNode } from '@/pages/http-history/api';

import { fetchHistoryTree } from '../services/history-service';
import { useHistoryQuery } from './use-history-query';

export function useHistoryTree() {
  const { query, refreshKey } = useHistoryQuery();
  const [treeData, setTreeData] = useState<ApiTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    setIsLoading(true);

    try {
      setLoadError(null);
      const result = await fetchHistoryTree(query);
      setTreeData(result);
    } catch (error) {
      console.error('Failed to fetch tree:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load tree.');
      setTreeData([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, refreshKey]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return {
    treeData,
    isLoading,
    loadError,
  };
}
