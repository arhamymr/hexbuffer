"use client";

import { formatTimestamp, formatBytes, formatDuration, getMethodBadge, StatusBadge, getExtension } from "./utils";
import { LogEntryContextMenu } from "./log-context-menu";
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from "react";
import type { ProxyRecord } from '../../../../types';
import type { ApiCall } from '@/types';
import { useHttpHistoryStore } from '@/stores/http-history';

function adaptProxyRecordToApiCall(record: ProxyRecord): ApiCall {
  const uri = record.request.uri;
  const urlObj = uri.includes('://') ? new URL(uri) : null;
  return {
    id: record.id,
    session_id: '',
    target_id: '',
    timestamp: new Date(record.timestamp).getTime(),
    request_type: 'Other',
    method: record.request.method,
    url: uri,
    host: urlObj?.host || uri.split('://').pop()?.split('/')[0] || '',
    path: urlObj?.pathname || '/',
    query_params: {},
    headers: record.request.headers,
    cookies: {},
    request_body: new TextDecoder().decode(new Uint8Array(record.request.body)),
    request_body_size: record.request.body.length,
    response_status: record.response?.status_code ?? null,
    response_status_text: record.response?.status_text || null,
    response_headers: record.response?.headers || {},
    response_cookies: {},
    response_body: record.response ? new TextDecoder().decode(new Uint8Array(record.response.body)) : null,
    response_body_size: record.response?.body.length ?? 0,
    response_content_type: record.response?.headers['content-type'] || null,
    security_state: '',
    server_ip: record.server_addr || null,
    duration_ms: null,
  };
}

export function TrafficTable() {
  const [logs, setLogs] = useState<ProxyRecord[]>([]);

  useEffect(() => {
    invoke<ProxyRecord[]>('get_proxy_all').then((records) => {
      const calls = records.map(adaptProxyRecordToApiCall);
      useHttpHistoryStore.getState().setCalls(calls);
      setLogs(records);
    });

    const unlistenPromise = listen<ProxyRecord>('proxy-record', (event) => {
      setLogs((prev) => [...prev, event.payload]);
      const call = adaptProxyRecordToApiCall(event.payload);
      useHttpHistoryStore.setState((state) => ({ calls: [...state.calls, call] }));
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  console.log(logs, "los")

  return (
    <div className="overflow-auto h-full">
      <table className="w-full">
        <thead className="sticky top-0 backdrop-blur z-10 border-b">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[90px]">Time</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[70px]">Method</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[60px]">Status</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[150px]">Host</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 flex-1">Path</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[70px]">Size</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[80px]">Duration</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[70px]">Length</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[150px]">MIME Type</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[80px]">Ext</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[120px]">IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((record) => {
            const call = adaptProxyRecordToApiCall(record);
            return (
            <LogEntryContextMenu key={call.id} call={call}>
              <tr className="hover:bg-muted/50 transition-colors border-b cursor-pointer">
                <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                  {formatTimestamp(record.timestamp)}
                </td>
                <td className="px-3 py-2">
                  {getMethodBadge(record.request.method)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={record.response?.status_code ?? 0} />
                </td>
                <td className="text-xs truncate max-w-[150px] px-3 py-2" title={record.request.uri}>
                  {record.request.uri.split('://').pop()?.split('/')[0] || '-'}
                </td>
                <td className="text-xs text-muted-foreground truncate max-w-[200px] px-3 py-2" title={record.request.uri}>
                  {record.request.uri.split('/').slice(3).join('/') || '/'}
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">
                  {formatBytes(record.response?.body.length ?? 0)}
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">-</td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">
                  {formatBytes(record.request.body.length)}
                </td>
                <td className="text-xs text-muted-foreground px-3 py-2 truncate max-w-[150px]" title={record.response?.headers['content-type']}>
                  {record.response?.headers['content-type'] || "-"}
                </td>
                <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                  {getExtension(record.request.uri)}
                </td>
                <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                  {record.server_addr || "-"}
                </td>
              </tr>
            </LogEntryContextMenu>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}