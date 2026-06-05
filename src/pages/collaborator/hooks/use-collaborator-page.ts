'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useCollaboratorStore } from '@/stores/collaborator';
import * as api from '../api';
import {
  MOCK_INTERACTIONS,
  MOCK_PAYLOADS,
  MOCK_SERVERS,
  MOCK_STATS,
} from '../mock-data';
import type {
  CollaboratorInteraction,
  CreatePayloadRequest,
  CreateServerRequest,
} from '../types';

/** When true, the hook seeds the store with mock data instead of calling the backend. */
const USE_MOCK = true;

export function useCollaboratorPage() {
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
  } = useCollaboratorStore();

  const loadServers = useCallback(async () => {
    if (USE_MOCK) {
      setServers(MOCK_SERVERS);
      return;
    }
    try {
      const s = await api.listCollaboratorServers();
      setServers(s);
    } catch (e) {
      console.error('Failed to load collaborator servers', e);
      setServers(MOCK_SERVERS);
    }
  }, [setServers]);

  const loadPayloads = useCallback(async () => {
    if (USE_MOCK) {
      setPayloads(MOCK_PAYLOADS);
      return;
    }
    try {
      const p = await api.listCollaboratorPayloads();
      setPayloads(p);
    } catch (e) {
      console.error('Failed to load collaborator payloads', e);
      setPayloads(MOCK_PAYLOADS);
    }
  }, [setPayloads]);

  const loadInteractions = useCallback(async () => {
    if (USE_MOCK) {
      let filtered = MOCK_INTERACTIONS;
      if (selectedPayloadFilter) {
        filtered = filtered.filter((i) => i.payloadId === selectedPayloadFilter);
      }
      if (selectedTypeFilter) {
        filtered = filtered.filter((i) => i.interactionType === selectedTypeFilter);
      }
      setInteractions(filtered);
      return;
    }
    try {
      const i = await api.listCollaboratorInteractions(
        selectedPayloadFilter ?? undefined,
        selectedTypeFilter ?? undefined
      );
      setInteractions(i);
    } catch (e) {
      console.error('Failed to load collaborator interactions', e);
      setInteractions(MOCK_INTERACTIONS);
    }
  }, [setInteractions, selectedPayloadFilter, selectedTypeFilter]);

  const loadStats = useCallback(async () => {
    if (USE_MOCK) {
      setStats(MOCK_STATS);
      return;
    }
    try {
      const s = await api.getCollaboratorDashboardStats();
      setStats(s);
    } catch (e) {
      console.error('Failed to load collaborator stats', e);
      setStats(MOCK_STATS);
    }
  }, [setStats]);

  const handleAddServer = useCallback(
    async (req: CreateServerRequest) => {
      const server = await api.addCollaboratorServer(req);
      setServers([server, ...servers]);
      return server;
    },
    [servers, setServers]
  );

  const handleDeleteServer = useCallback(
    async (id: string) => {
      await api.deleteCollaboratorServer(id);
      setServers(servers.filter((s) => s.id !== id));
    },
    [servers, setServers]
  );

  const handleCheckHealth = useCallback(
    async (id: string) => {
      const updated = await api.checkCollaboratorServerHealth(id);
      setServers(servers.map((s) => (s.id === id ? updated : s)));
      return updated;
    },
    [servers, setServers]
  );

  const handleCreatePayload = useCallback(
    async (req: CreatePayloadRequest) => {
      const payload = await api.createCollaboratorPayload(req);
      setPayloads([payload, ...payloads]);
      return payload;
    },
    [payloads, setPayloads]
  );

  const handleDeletePayload = useCallback(
    async (id: string) => {
      await api.deleteCollaboratorPayload(id);
      setPayloads(payloads.filter((p) => p.id !== id));
    },
    [payloads, setPayloads]
  );

  const handleArchivePayload = useCallback(
    async (id: string) => {
      await api.archiveCollaboratorPayload(id);
      setPayloads(
        payloads.map((p) => (p.id === id ? { ...p, status: 'archived' as const } : p))
      );
    },
    [payloads, setPayloads]
  );

  // auto-polling
  useEffect(() => {
    if (servers.length === 0) return;

    setIsPolling(true);
    setLastPollError(null);

    const poll = async () => {
      try {
        for (const server of servers) {
          await api.pollCollaboratorInteractions(server.id);
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
  }, [servers.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const selectedInteraction = useMemo<CollaboratorInteraction | null>(
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
    loadServers,
    loadPayloads,
    loadInteractions,
    loadStats,
    handleAddServer,
    handleDeleteServer,
    handleCheckHealth,
    handleCreatePayload,
    handleDeletePayload,
    handleArchivePayload,
  };
}
