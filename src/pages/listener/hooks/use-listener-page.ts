import { useCallback, useEffect, useMemo } from 'react';
import { useListenerStore } from '@/stores/listener';
import { useShallow } from 'zustand/react/shallow';
import * as api from '../api';
import type {
  ListenerInteraction,
  CreatePayloadRequest,
  CreateServerRequest,
  ListenerServer,
} from '../types';

export function useListenerPage() {
  const {
    activeSubTab,
    setActiveSubTab,
    servers,
    setServers,
    payloads,
    setPayloads,
    interactions,
    setInteractions,
    stats,
    setStats,
    selectedInteractionId,
    setSelectedInteractionId,
    selectedPayloadFilter,
    setSelectedPayloadFilter,
    selectedTypeFilter,
    setSelectedTypeFilter,
    isPolling,
    setIsPolling,
    setLastPollError,
    isEnabled,
    setIsEnabled,
  } = useListenerStore(
    useShallow((s) => ({
      activeSubTab: s.activeSubTab,
      setActiveSubTab: s.setActiveSubTab,
      servers: s.servers,
      setServers: s.setServers,
      payloads: s.payloads,
      setPayloads: s.setPayloads,
      interactions: s.interactions,
      setInteractions: s.setInteractions,
      stats: s.stats,
      setStats: s.setStats,
      selectedInteractionId: s.selectedInteractionId,
      setSelectedInteractionId: s.setSelectedInteractionId,
      selectedPayloadFilter: s.selectedPayloadFilter,
      setSelectedPayloadFilter: s.setSelectedPayloadFilter,
      selectedTypeFilter: s.selectedTypeFilter,
      setSelectedTypeFilter: s.setSelectedTypeFilter,
      isPolling: s.isPolling,
      setIsPolling: s.setIsPolling,
      setLastPollError: s.setLastPollError,
      isEnabled: s.isEnabled,
      setIsEnabled: s.setIsEnabled,
    }))
  );

  // ponytail: simplified loader calls direct to Tauri commands with zero mock boilerplate
  const loadServers = useCallback(async () => {
    try {
      const s = await api.listListenerServers();
      setServers(s);
    } catch (e) {
      console.error('Failed to load listener servers', e);
      setServers([]);
    }
  }, [setServers]);

  const loadPayloads = useCallback(async () => {
    try {
      const p = await api.listListenerPayloads();
      setPayloads(p);
    } catch (e) {
      console.error('Failed to load listener payloads', e);
      setPayloads([]);
    }
  }, [setPayloads]);

  const loadInteractions = useCallback(async () => {
    try {
      const i = await api.listListenerInteractions(
        selectedPayloadFilter ?? undefined,
        selectedTypeFilter ?? undefined
      );
      setInteractions(i);
    } catch (e) {
      console.error('Failed to load listener interactions', e);
      setInteractions([]);
    }
  }, [setInteractions, selectedPayloadFilter, selectedTypeFilter]);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.getListenerDashboardStats();
      setStats(s);
    } catch (e) {
      console.error('Failed to load listener stats', e);
    }
  }, [setStats]);

  const handleAddServer = useCallback(
    async (req: CreateServerRequest) => {
      const server = await api.addListenerServer(req);
      setServers([server, ...servers]);
      return server;
    },
    [servers, setServers]
  );

  const handleUpdateServer = useCallback(
    async (server: ListenerServer) => {
      const updated = await api.updateListenerServer(server);
      setServers(servers.map((s) => (s.id === server.id ? updated : s)));
      return updated;
    },
    [servers, setServers]
  );

  const handleDeleteServer = useCallback(
    async (id: string) => {
      await api.deleteListenerServer(id);
      setServers(servers.filter((s) => s.id !== id));
    },
    [servers, setServers]
  );

  const handleCheckHealth = useCallback(
    async (id: string) => {
      const updated = await api.checkListenerServerHealth(id);
      setServers(servers.map((s) => (s.id === id ? updated : s)));
      return updated;
    },
    [servers, setServers]
  );

  const handleCreatePayload = useCallback(
    async (req: CreatePayloadRequest) => {
      const payload = await api.createListenerPayload(req);
      setPayloads([payload, ...payloads]);
      return payload;
    },
    [payloads, setPayloads]
  );

  const handleDeletePayload = useCallback(
    async (id: string) => {
      await api.deleteListenerPayload(id);
      setPayloads(payloads.filter((p) => p.id !== id));
    },
    [payloads, setPayloads]
  );

  const handleArchivePayload = useCallback(
    async (id: string) => {
      await api.archiveListenerPayload(id);
      setPayloads(
        payloads.map((p) => (p.id === id ? { ...p, status: 'archived' as const } : p))
      );
    },
    [payloads, setPayloads]
  );

  // auto-polling
  useEffect(() => {
    if (!isEnabled || servers.length === 0) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    setLastPollError(null);

    const poll = async () => {
      try {
        for (const server of servers) {
          await api.pollListenerInteractions(server.id);
        }
        await loadInteractions();
        await loadStats();
        await loadPayloads();
      } catch (e) {
        setLastPollError(e instanceof Error ? e.message : String(e));
      }
    };

    poll();
    const interval = setInterval(poll, 10_000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [isEnabled, servers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // load data on mount
  useEffect(() => {
    loadServers();
    loadPayloads();
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // reload interactions when filters change
  useEffect(() => {
    loadInteractions();
  }, [selectedPayloadFilter, selectedTypeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ponytail: auto-generate a default callback payload in the background if a server has none
  useEffect(() => {
    if (servers.length === 0) return;

    const serversWithoutPayloads = servers.filter(
      (s) => !payloads.some((p) => p.serverId === s.id && p.status === 'active')
    );

    for (const server of serversWithoutPayloads) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      api.createListenerPayload({
        serverId: server.id,
        name: `Default Callback [${timeStr}]`,
        description: `Auto-generated default callback URL`,
        tags: [],
      }).then((newPayload) => {
        setPayloads([newPayload, ...payloads]);
      }).catch((e) => {
        console.error('Failed to auto-generate default payload for server', server.id, e);
      });
    }
  }, [servers, payloads, setPayloads]);

  const selectedInteraction = useMemo<ListenerInteraction | null>(
    () => interactions.find((i) => i.id === selectedInteractionId) ?? null,
    [interactions, selectedInteractionId]
  );

  return {
    activeSubTab,
    setActiveSubTab,
    servers,
    payloads,
    interactions,
    stats,
    selectedInteractionId,
    setSelectedInteractionId,
    selectedPayloadFilter,
    setSelectedPayloadFilter,
    selectedTypeFilter,
    setSelectedTypeFilter,
    isPolling,
    selectedInteraction,
    isEnabled,
    setIsEnabled,
    loadServers,
    loadPayloads,
    loadInteractions,
    loadStats,
    handleAddServer,
    handleUpdateServer,
    handleDeleteServer,
    handleCheckHealth,
    handleCreatePayload,
    handleDeletePayload,
    handleArchivePayload,
  };
}
