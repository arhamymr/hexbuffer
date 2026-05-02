"use client";

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { ProxyConnection } from '@/types';

export interface ProxyLogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  connection_id: string;
  host: string;
  port: number;
  target_id: string;
  method: string | null;
  url: string | null;
  status: number | null;
  status_text: string | null;
  headers: [string, string][];
  body: string | null;
  body_size: number;
  curl: string | null;
  request_headers: [string, string][] | null;
  request_body: string | null;
  request_body_size: number | null;
  response_headers: [string, string][] | null;
  response_body: string | null;
  response_body_size: number | null;
  content_type: string | null;
  client_addr: string;
  duration_ms: number | null;
  client_bytes: number;
  server_bytes: number;
}

export interface DebugLog {
  id: string;
  timestamp: number;
  type: 'proxy-log' | 'connection' | 'connection-close' | 'error';
  data: unknown;
}

export function useDebugLogs() {
  const [logs, setLogs] = useState<DebugLog[]>([]);

  useEffect(() => {
    console.log('[Debugger] Setting up event listeners');

    const unlistenProxyLog = listen<ProxyLogEntry>('proxy-log', (event) => {
      const payload = event.payload;
      console.log('[Debugger] === Proxy Log ===');
      console.log('[Debugger] id:', payload.id);
      console.log('[Debugger] event_type:', payload.event_type);
      console.log('[Debugger] method:', payload.method);
      console.log('[Debugger] url:', payload.url);
      console.log('[Debugger] status:', payload.status);
      console.log('[Debugger] host:', payload.host);
      console.log('[Debugger] duration_ms:', payload.duration_ms);
      console.log('[Debugger] ==================');

      const timestamp = typeof payload.timestamp === 'string'
        ? new Date(payload.timestamp).getTime()
        : (payload.timestamp as unknown as number) || Date.now();

      const log: DebugLog = {
        id: payload.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        type: 'proxy-log',
        data: payload,
      };
      setLogs(prev => {
        const newLogs = [...prev, log].slice(-200);
        console.log('[Debugger] Total logs in state:', newLogs.length);
        return newLogs;
      });
    });

    const unlistenConnection = listen<ProxyConnection>('proxy-connection', (event) => {
      console.log('[Debugger] Received proxy-connection event:', event.payload);
      const log: DebugLog = {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: event.payload.timestamp || Date.now(),
        type: 'connection',
        data: event.payload,
      };
      setLogs(prev => [...prev, log].slice(-200));
    });

    const unlistenConnectionClose = listen<ProxyConnection & { clientBytes: number; serverBytes: number; duration: number }>('proxy-connection-close', (event) => {
      console.log('[Debugger] Received proxy-connection-close event:', event.payload);
      const log: DebugLog = {
        id: `close_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: event.payload.timestamp || Date.now(),
        type: 'connection-close',
        data: event.payload,
      };
      setLogs(prev => [...prev, log].slice(-200));
    });

    return () => {
      unlistenProxyLog.then(fn => fn());
      unlistenConnection.then(fn => fn());
      unlistenConnectionClose.then(fn => fn());
    };
  }, []);

  return { logs, setLogs };
}