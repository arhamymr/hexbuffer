"use client";

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { ApiCall, ProxyConnection } from '@/types';

export interface ParsedRequest {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  http_version: string;
  host: string;
  path: string;
  query: string | null;
  headers: [string, string][];
  cookies: [string, string][];
  body: string | null;
  content_type: string | null;
  peer: string;
  curl: string;
  raw: string;
}

export interface ParsedResponse {
  status: number;
  status_text: string;
  headers: [string, string][];
  body: string | null;
  body_size: number;
  content_type: string | null;
}

export interface DebugLog {
  id: string;
  timestamp: number;
  type: 'api-call' | 'connection' | 'connection-close' | 'error' | 'logger-request' | 'logger-curl' | 'logger-response';
  data: unknown;
}

export function useDebugLogs() {
  const [logs, setLogs] = useState<DebugLog[]>([]);

  useEffect(() => {
    console.log('[Debugger] Setting up event listeners');

    const unlistenApiCall = listen<ApiCall>('api-call', (event) => {
      const payload = event.payload;
      console.log('[Debugger] === API Call Received ===');
      console.log('[Debugger] id:', payload.id);
      console.log('[Debugger] method:', payload.method);
      console.log('[Debugger] url:', payload.url);
      console.log('[Debugger] host:', payload.host);
      console.log('[Debugger] path:', payload.path);
      console.log('[Debugger] timestamp:', payload.timestamp);
      console.log('[Debugger] request_type:', payload.request_type);
      console.log('[Debugger] session_id:', payload.session_id);
      console.log('[Debugger] target_id:', payload.target_id);
      console.log('[Debugger] headers:', payload.headers);
      console.log('[Debugger] headers.cookie:', payload.headers?.cookie);
      console.log('[Debugger] cookies:', payload.cookies);
      console.log('[Debugger] query_params:', payload.query_params);
      console.log('[Debugger] request_body:', payload.request_body);
      console.log('[Debugger] response_status:', payload.response_status);
      console.log('[Debugger] response_headers:', payload.response_headers);
      console.log('[Debugger] response_body:', payload.response_body ? '(present)' : null);
      console.log('[Debugger] ==============================');

      const log: DebugLog = {
        id: payload.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: payload.timestamp || Date.now(),
        type: 'api-call',
        data: payload,
      };
      setLogs(prev => {
        const newLogs = [...prev, log].slice(-100);
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
      setLogs(prev => [...prev, log].slice(-100));
    });

    const unlistenConnectionClose = listen<ProxyConnection & { clientBytes: number; serverBytes: number; duration: number }>('proxy-connection-close', (event) => {
      console.log('[Debugger] Received proxy-connection-close event:', event.payload);
      const log: DebugLog = {
        id: `close_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: event.payload.timestamp || Date.now(),
        type: 'connection-close',
        data: event.payload,
      };
      setLogs(prev => [...prev, log].slice(-100));
    });

    const unlistenLoggerRequest = listen<ParsedRequest>('logger-request', (event) => {
      const payload = event.payload;
      console.log('[Debugger] === Logger Request ===');
      console.log('[Debugger] method:', payload.method);
      console.log('[Debugger] url:', payload.url);
      console.log('[Debugger] headers:', payload.headers);
      console.log('[Debugger] cookies:', payload.cookies);
      console.log('[Debugger] body:', payload.body);
      console.log('[Debugger] raw:', payload.raw);
      console.log('[Debugger] =========================');
      const log: DebugLog = {
        id: payload.id,
        timestamp: Date.now(),
        type: 'logger-request',
        data: payload,
      };
      setLogs(prev => [...prev, log].slice(-100));
    });

    const unlistenLoggerCurl = listen<{ curl: string }>('logger-curl', (event) => {
      console.log('[Debugger] === Logger Curl ===', event.payload);
      const log: DebugLog = {
        id: `curl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'logger-curl',
        data: event.payload,
      };
      setLogs(prev => [...prev, log].slice(-100));
    });

    const unlistenLoggerResponse = listen<ParsedResponse>('logger-response', (event) => {
      const payload = event.payload;
      console.log('[Debugger] === Logger Response ===');
      console.log('[Debugger] status:', payload.status);
      console.log('[Debugger] headers:', payload.headers);
      console.log('[Debugger] body_size:', payload.body_size);
      console.log('[Debugger] =========================');
      const log: DebugLog = {
        id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'logger-response',
        data: payload,
      };
      setLogs(prev => [...prev, log].slice(-100));
    });

    return () => {
      unlistenApiCall.then(fn => fn());
      unlistenConnection.then(fn => fn());
      unlistenConnectionClose.then(fn => fn());
      unlistenLoggerRequest.then(fn => fn());
      unlistenLoggerCurl.then(fn => fn());
      unlistenLoggerResponse.then(fn => fn());
    };
  }, []);

  return { logs, setLogs };
}