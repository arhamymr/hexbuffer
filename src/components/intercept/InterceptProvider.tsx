'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ApiCall } from '@/types';
import { InterceptDialog } from './InterceptDialog';

interface InterceptRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

interface InterceptDecision {
  action: 'forward' | 'modify' | 'block';
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
  response?: {
    status?: number;
    status_text?: string;
    headers?: Record<string, string>;
    body?: string;
  };
}

interface InterceptContextValue {
  interceptEnabled: boolean;
  pendingCount: number;
  pendingIntercepts: InterceptRequest[];
  activeIntercept: InterceptRequest | null;
  setActiveIntercept: (intercept: InterceptRequest | null) => void;
  autoPopup: boolean;
  setAutoPopup: (auto: boolean) => void;
  enableIntercept: () => Promise<void>;
  disableIntercept: () => Promise<void>;
  toggleIntercept: () => Promise<void>;
  resolveIntercept: (id: string, decision: InterceptDecision) => Promise<void>;
}

const InterceptContext = createContext<InterceptContextValue | null>(null);

export function useInterceptContext() {
  const context = useContext(InterceptContext);
  if (!context) {
    throw new Error('useInterceptContext must be used within InterceptProvider');
  }
  return context;
}

export function InterceptProvider({ children }: { children: ReactNode }) {
  const [interceptEnabled, setInterceptEnabled] = useState(false);
  const [pendingIntercepts, setPendingIntercepts] = useState<InterceptRequest[]>([]);
  const [activeIntercept, setActiveIntercept] = useState<InterceptRequest | null>(null);
  const [autoPopup, setAutoPopup] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const enabled = await invoke<boolean>('get_intercept_status');
        setInterceptEnabled(enabled);
      } catch (err) {
        console.error('Failed to fetch intercept status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    const unlistenIntercept = listen<{ id: number; request: ApiCall }>('intercept-request', (event) => {
      const req = event.payload.request;
      const newIntercept: InterceptRequest = {
        id: String(event.payload.id),
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.request_body,
        timestamp: req.timestamp,
      };
      setPendingIntercepts(prev => [newIntercept, ...prev]);
      if (autoPopup && !activeIntercept) {
        setActiveIntercept(newIntercept);
      }
    });

    return () => {
      clearInterval(interval);
      unlistenIntercept.then(fn => fn());
    };
  }, [autoPopup, activeIntercept]);

  const resolveIntercept = async (id: string, decision: InterceptDecision) => {
    try {
      await invoke('resolve_intercept', {
        id: parseInt(id, 10),
        decision,
      });
      setPendingIntercepts(prev => prev.filter(p => p.id !== id));
      if (activeIntercept?.id === id) {
        setActiveIntercept(null);
      }
    } catch (err) {
      console.error('Failed to resolve intercept:', err);
      throw err;
    }
  };

  const toggleIntercept = async () => {
    try {
      const newState = await invoke<boolean>('toggle_intercept');
      setInterceptEnabled(newState);
    } catch (err) {
      console.error('Failed to toggle intercept:', err);
    }
  };

  const enableIntercept = async () => {
    try {
      await invoke('enable_intercept');
      setInterceptEnabled(true);
    } catch (err) {
      console.error('Failed to enable intercept:', err);
    }
  };

  const disableIntercept = async () => {
    try {
      await invoke('disable_intercept');
      setInterceptEnabled(false);
    } catch (err) {
      console.error('Failed to disable intercept:', err);
    }
  };

  return (
    <InterceptContext.Provider
      value={{
        interceptEnabled,
        pendingCount: pendingIntercepts.length,
        pendingIntercepts,
        activeIntercept,
        setActiveIntercept,
        autoPopup,
        setAutoPopup,
        enableIntercept,
        disableIntercept,
        toggleIntercept,
        resolveIntercept,
      }}
    >
      {children}
      {activeIntercept && (
        <InterceptDialog
          intercept={activeIntercept}
          onResolve={async (decision) => {
            await resolveIntercept(activeIntercept.id, decision);
          }}
          onClose={() => setActiveIntercept(null)}
        />
      )}
    </InterceptContext.Provider>
  );
}