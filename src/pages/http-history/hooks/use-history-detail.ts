import { useEffect, useState } from 'react';

import type { ApiCall } from '@/types';

import { fetchHistoryDetail } from '../services/history-service';
import { adaptProxyRecordToApiCall } from './use-history-table';
import { useHistoryQuery } from './use-history-query';

export function useHistoryDetail() {
  const { selectedCallId } = useHistoryQuery();
  const [call, setCall] = useState<ApiCall | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCallId) {
      setCall(null);
      setLoadError(null);
      return;
    }

    const fetchCall = async () => {
      setIsLoading(true);

      try {
        setLoadError(null);
        const result = await fetchHistoryDetail(selectedCallId);
        setCall(adaptProxyRecordToApiCall(result));
      } catch (error) {
        console.error('Failed to fetch call:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load request details.');
        setCall(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCall();
  }, [selectedCallId]);

  return {
    selectedCallId,
    call,
    isLoading,
    loadError,
  };
}
