import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ApiCall, ProxyConnection } from '@/types';

export function useProxyEvents() {
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [connections, setConnections] = useState<ProxyConnection[]>([]);

  useEffect(() => {
    const unlistenApiCall = listen<ApiCall>('api-call', (event) => {
      setCalls(prev => [event.payload, ...prev].slice(0, 15));
    });

    const unlistenConnection = listen<ProxyConnection>('proxy-connection', (event) => {
      const conn = { ...event.payload, status: 'active' as const };
      setConnections(prev => {
        const existing = prev.findIndex(c => c.id === conn.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = conn;
          return updated;
        }
        return [conn, ...prev].slice(0, 50);
      });
    });

    const unlistenConnectionClose = listen<ProxyConnection & { clientBytes: number; serverBytes: number; duration: number }>('proxy-connection-close', (event) => {
      const data = event.payload;
      setConnections(prev => {
        const conn = prev.find(c => c.id === data.id);
        if (conn) {
          return prev.map(c =>
            c.id === data.id
              ? { ...c, status: 'closed' as const, clientBytes: data.clientBytes, serverBytes: data.serverBytes, duration: data.duration }
              : c
          );
        }
        return prev;
      });
    });

    return () => {
      unlistenApiCall.then(fn => fn());
      unlistenConnection.then(fn => fn());
      unlistenConnectionClose.then(fn => fn());
    };
  }, []);

  return { calls, connections, setCalls, setConnections };
}
