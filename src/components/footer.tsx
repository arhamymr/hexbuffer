"use client";

import * as React from 'react';
import { Badge } from './ui/badge';
import { invoke } from '@tauri-apps/api/core';

export function Footer() {
  const [proxyStatus, setProxyStatus] = React.useState<'running' | 'stopped' | 'unknown'>('unknown');

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await invoke<{ running: boolean }>('get_proxy_status');
        setProxyStatus(status.running ? 'running' : 'stopped');
      } catch (e) {
        setProxyStatus('unknown');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="flex items-center justify-between h-10 px-4 border-t bg-card text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <Badge
          variant={proxyStatus === 'running' ? 'default' : 'secondary'}
          className={`text-xs ${proxyStatus === 'running' ? 'bg-green-500 hover:bg-green-600' : ''}`}
        >
          Proxy: {proxyStatus === 'running' ? 'Active' : proxyStatus === 'stopped' ? 'Inactive' : 'Unknown'}
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <span>Bug Bounty Tools v0.1.0</span>
      </div>
    </footer>
  );
}
