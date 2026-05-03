'use client';

import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTrafficStore, type ProxyLogEntry } from '@/stores/trafficStore';
import type { ApiCall, ProxyConnection } from '@/types';

function proxyLogEntryToApiCall(entry: ProxyLogEntry): ApiCall {
  return {
    id: entry.id,
    session_id: entry.connection_id || `session_${Date.now()}`,
    target_id: entry.target_id || '',
    timestamp: typeof entry.timestamp === 'string' ? new Date(entry.timestamp).getTime() : entry.timestamp || Date.now(),
    request_type: 'Other',
    method: entry.method || 'GET',
    url: entry.url || '',
    host: entry.host || '',
    path: entry.url?.split('?')[0] || '/',
    query_params: {},
    headers: Object.fromEntries((entry.headers || []).map(([k, v]) => [k, String(v)])),
    cookies: {},
    request_body: entry.request_body || null,
    request_body_size: entry.request_body_size || 0,
    response_status: entry.status || null,
    response_status_text: entry.status_text || null,
    response_headers: Object.fromEntries((entry.response_headers || []).map(([k, v]) => [k, String(v)])),
    response_cookies: {},
    response_body: entry.response_body || null,
    response_body_size: entry.response_body_size || 0,
    response_content_type: entry.content_type || null,
    security_state: 'unknown',
    server_ip: null,
  };
}

function apiCallToProxyLogEntry(call: ApiCall): ProxyLogEntry {
  return {
    id: call.id,
    timestamp: new Date(call.timestamp).toISOString(),
    event_type: 'api-call',
    connection_id: call.session_id,
    host: call.host,
    port: 443,
    target_id: call.target_id,
    method: call.method,
    url: call.url,
    status: call.response_status || null,
    status_text: call.response_status_text || null,
    headers: Object.entries(call.headers).map(([k, v]) => [k, v] as [string, string]),
    body: call.response_body,
    body_size: call.response_body_size,
    curl: null,
    request_headers: Object.entries(call.headers).map(([k, v]) => [k, v] as [string, string]),
    request_body: call.request_body || null,
    request_body_size: call.request_body_size || null,
    response_headers: Object.entries(call.response_headers).map(([k, v]) => [k, v] as [string, string]),
    response_body: call.response_body || null,
    response_body_size: call.response_body_size || null,
    content_type: call.response_content_type || null,
    client_addr: '0.0.0.0',
    duration_ms: null,
    client_bytes: call.request_body_size,
    server_bytes: call.response_body_size,
  };
}

interface TrafficProviderProps {
  children: React.ReactNode;
}

export function TrafficProvider({ children }: TrafficProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const { addCall, addConnection, addProxyLog } = useTrafficStore();

  useEffect(() => {
    if (initialized) return;

    const setupListeners = async () => {
      const unlistenApiCall = listen<ApiCall>('api-call', (event) => {
        addCall(event.payload);
        const logEntry = apiCallToProxyLogEntry(event.payload);
        addProxyLog(logEntry);
      });

      const unlistenProxyLog = listen<ProxyLogEntry>('proxy-log', (event) => {
        const entry = event.payload;
        addProxyLog(entry);
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

      const unlisteners = await Promise.all([
        unlistenApiCall,
        unlistenProxyLog,
        unlistenConnection,
        unlistenConnectionClose,
      ]);

      setInitialized(true);

      return () => {
        unlisteners.forEach((fn) => fn());
      };
    };

    setupListeners();
  }, [addCall, addConnection, addProxyLog, initialized]);

  return <>{children}</>;
}