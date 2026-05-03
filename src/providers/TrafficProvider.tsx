'use client';

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTrafficStore } from '@/stores/trafficStore';
import type { ApiCall } from '@/types';

interface TrafficProviderProps {
  children: React.ReactNode;
}

export function TrafficProvider({ children }: TrafficProviderProps) {
  const addHttpLog = useTrafficStore((s) => s.addHttpLog);

  useEffect(() => {
    const setup = async () => {
      const unlisten = await listen<ApiCall>('proxy-log', (event) => {
        addHttpLog(event.payload);
      });
      return unlisten;
    };

    const promise = setup();
    return () => {
      promise.then((fn) => fn());
    };
  }, [addHttpLog]);

  return <>{children}</>;
}