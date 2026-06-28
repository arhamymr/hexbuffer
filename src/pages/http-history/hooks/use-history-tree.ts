import { useCallback, useEffect, useState, useMemo } from 'react';

import type { TreeNode as ApiTreeNode } from '@/pages/http-history/api';

import { fetchHistoryTree } from '../services/history-service';
import { useHttpHistoryQueryStore } from '../state/history-query-store';
import { useShallow } from 'zustand/react/shallow';
import { buildHistoryQuery } from '../state/build-history-query';

export function useHistoryTree() {
  const { filter, activeScope, sortOrder, page, perPage, refreshKey } = useHttpHistoryQueryStore(
    useShallow((state) => ({
      filter: state.filter,
      activeScope: state.activeScope,
      sortOrder: state.sortOrder,
      page: state.page,
      perPage: state.perPage,
      refreshKey: state.refreshKey,
    }))
  );

  const query = useMemo(
    () =>
      buildHistoryQuery({
        filter,
        activeScope,
        sortOrder,
        page,
        perPage,
      }),
    [filter, activeScope, sortOrder, page, perPage]
  );
  const [treeData, setTreeData] = useState<ApiTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  console.log(query, "query")
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
