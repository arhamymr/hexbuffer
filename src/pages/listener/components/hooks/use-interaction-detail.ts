import { useState, useMemo } from 'react';
import type { ListenerInteraction } from '../../types';

export type Tab = 'overview' | 'headers' | 'body' | 'raw';

export interface UseInteractionDetailParams {
  interaction: ListenerInteraction | null;
}

export function useInteractionDetail({ interaction }: UseInteractionDetailParams) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const parsedHeaders = useMemo(() => {
    if (!interaction?.headers) return null;
    try {
      return JSON.parse(interaction.headers);
    } catch {
      return null;
    }
  }, [interaction?.headers]);

  // ponytail: extract and parse query parameters from the request path
  const parsedQuery = useMemo(() => {
    if (!interaction?.path) return null;
    try {
      const queryIdx = interaction.path.indexOf('?');
      if (queryIdx === -1) return null;
      const params = new URLSearchParams(interaction.path.slice(queryIdx));
      const obj: Record<string, string> = {};
      params.forEach((v, k) => {
        obj[k] = v;
      });
      return Object.keys(obj).length > 0 ? obj : null;
    } catch {
      return null;
    }
  }, [interaction?.path]);

  return {
    activeTab,
    setActiveTab,
    parsedHeaders,
    parsedQuery,
  };
}
