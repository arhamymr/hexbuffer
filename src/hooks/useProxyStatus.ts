'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useProxyStatus() {
  const [running, setRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const check = async () => {
      try {
        const status = await invoke<{ running: boolean }>('get_proxy_status');
        setRunning(status.running);
      } catch (e) {
        console.error('Failed to get proxy status:', e);
      }
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  const start = async () => {
    setLoading(true);
    try { await invoke('start_proxy', { port: 8888, targetId: null }); setRunning(true); }
    catch (e) { console.error('Failed to start proxy:', e); }
    finally { setLoading(false); }
  };

  const stop = async () => {
    setLoading(true);
    try { await invoke('stop_proxy'); setRunning(false); }
    catch (e) { console.error('Failed to stop proxy:', e); }
    finally { setLoading(false); }
  };

  return { running, loading, start, stop };
}