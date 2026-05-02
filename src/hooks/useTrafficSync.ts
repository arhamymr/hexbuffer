import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTrafficStore } from '@/stores/trafficStore';
import type { ApiCall, ProxyConnection } from '@/types';
import type { ProxyLogEntry } from '@/hooks/useDebugLogs';

export function useTrafficSync() {
  const { addCall, addConnection, addProxyLog } = useTrafficStore();

  useEffect(() => {
    const unlistenApiCall = listen<ApiCall>('api-call', (event) => {
      addCall(event.payload);
    });

    const unlistenConnection = listen<ProxyConnection>('proxy-connection', (event) => {
      const conn = { ...event.payload, status: 'active' as const };
      addConnection(conn);
    });

    const unlistenConnectionClose = listen<
      ProxyConnection & { clientBytes: number; serverBytes: number; duration: number }
    >('proxy-connection-close', (event) => {
      const data = event.payload;
      addConnection({
        id: data.id,
        timestamp: data.timestamp,
        host: data.host,
        port: data.port,
        targetId: data.targetId,
        clientBytes: data.clientBytes,
        serverBytes: data.serverBytes,
        duration: data.duration,
        status: 'closed',
      });
    });

    const unlistenProxyLog = listen<ProxyLogEntry>('proxy-log', (event) => {
      addProxyLog(event.payload);
    });

    return () => {
      unlistenApiCall.then((fn) => fn());
      unlistenConnection.then((fn) => fn());
      unlistenConnectionClose.then((fn) => fn());
      unlistenProxyLog.then((fn) => fn());
    };
  }, [addCall, addConnection, addProxyLog]);
}
