import { useRef, useState, useCallback, useMemo } from 'react';
import type { ListenerInteraction, ListenerPayload, ListenerServer } from '../../types';

interface UseInteractionsPanelParams {
  servers: ListenerServer[];
  interactions: ListenerInteraction[];
  payloads: ListenerPayload[];
}

export function useInteractionsPanel({
  servers,
  interactions,
  payloads,
}: UseInteractionsPanelParams) {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [collapsedServers, setCollapsedServers] = useState<Record<string, boolean>>({});

  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
    setIsDragging(true);

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }, []);

  const toggleServerCollapse = useCallback((serverId: string) => {
    setCollapsedServers((prev) => ({
      ...prev,
      [serverId]: !prev[serverId],
    }));
  }, []);

  const coverStyle = useMemo(() => {
    return isDragging
      ? { pointerEvents: 'none' as const, userSelect: 'none' as const }
      : undefined;
  }, [isDragging]);

  // Group interactions by server mapping
  const interactionsByServer = useMemo(() => {
    const map: Record<string, ListenerInteraction[]> = {};
    for (const s of servers) {
      const serverPayloadIds = payloads.filter((p) => p.serverId === s.id).map((p) => p.id);
      map[s.id] = interactions.filter((i) => serverPayloadIds.includes(i.payloadId));
    }
    return map;
  }, [servers, payloads, interactions]);

  const orphanedInteractions = useMemo(() => {
    return interactions.filter((i) => {
      const payload = payloads.find((p) => p.id === i.payloadId);
      return !payload || !servers.some((s) => s.id === payload.serverId);
    });
  }, [servers, payloads, interactions]);

  return {
    isDragging,
    collapsedServers,
    handlePointerDown,
    toggleServerCollapse,
    coverStyle,
    interactionsByServer,
    orphanedInteractions,
  };
}
