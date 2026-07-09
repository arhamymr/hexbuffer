import { useState } from 'react';
import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { useNavStore } from '@/stores/nav';
import { toast } from 'sonner';
import type { MockDomain, MockRoute, RequestLog } from '../../types';

export function useLogsPanel(logs: RequestLog[], domains: MockDomain[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    const domain = domains.find((d) => d.id === log.domainId);
    const search = searchQuery.toLowerCase();
    return (
      log.path.toLowerCase().includes(search) ||
      log.method.toLowerCase().includes(search) ||
      log.statusCode.toString().includes(search) ||
      (domain && domain.hostname.toLowerCase().includes(search))
    );
  });

  return { searchQuery, setSearchQuery, filteredLogs };
}

export function useLogDetail(log: RequestLog, domains: MockDomain[], routes: MockRoute[]) {
  const [tab, setTab] = useState<'request' | 'response'>('request');
  const domain = domains.find((d) => d.id === log.domainId);
  const route = routes.find((r) => r.id === log.routeId);

  const handleSendToRepeater = async () => {
    try {
      const protocol = domain?.ssl ? 'https' : 'http';
      const hostname = domain?.hostname || 'localhost';
      const url = `${protocol}://${hostname}${log.path}`;

      const repeaterStore = useRepeaterStore.getState();
      let ws = repeaterStore.workspaces.find(w => w.name === 'mock-forge');
      let wsId = '';
      if (!ws) {
        wsId = repeaterStore.createWorkspace('mock-forge');
      } else {
        wsId = ws.id;
        repeaterStore.setActiveWorkspaceId(wsId);
      }

      const collectionsStore = useCollectionsStore.getState();
      let stash = collectionsStore.stashes.find(s => s.parentId === wsId);
      let stashId = '';
      if (!stash) {
        stashId = await collectionsStore.createStash('mock-forge', wsId);
      } else {
        stashId = stash.id;
      }

      const endpointName = `${log.method} ${log.path}`;
      const epId = await collectionsStore.createEndpoint(stashId, endpointName);

      const headersObj = log.requestHeaders || {};
      const parsedHeaders = Object.entries(headersObj).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }));

      const queryParams = url.includes('?')
        ? url.substring(url.indexOf('?') + 1).split('&').map(pair => {
          const eq = pair.indexOf('=');
          return {
            key: eq !== -1 ? decodeURIComponent(pair.substring(0, eq)) : decodeURIComponent(pair),
            value: eq !== -1 ? decodeURIComponent(pair.substring(eq + 1)) : '',
            enabled: true,
          };
        }).filter(p => p.key)
        : [];

      collectionsStore.setSelectedNodeId(`ep-${epId}`);
      collectionsStore.updateActiveRequest(() => ({
        method: log.method,
        url,
        headers: parsedHeaders,
        body: log.requestBody || '',
        bodyType: log.requestBody ? 'json' : 'none',
        preScript: '',
        testScript: '',
        response: null,
        isLoading: false,
        error: null,
        testResults: [],
        queryParams,
      }));

      await collectionsStore.saveActiveEndpoint();
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent to Repeater: ${log.method} ${log.path}`);
    } catch (error) {
      console.error('Failed to send request to Repeater:', error);
      toast.error('Failed to send request to Repeater');
    }
  };

  return { tab, setTab, domain, route, handleSendToRepeater };
}
