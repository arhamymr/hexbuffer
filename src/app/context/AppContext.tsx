'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Target, ApiCall, ProxyConnection } from '@/types';

interface AppState {
  targets: Target[];
  selectedTarget: Target | null;
  calls: ApiCall[];
  connections: ProxyConnection[];
}

interface AppContextValue extends AppState {
  fetchTargets: () => Promise<void>;
  selectTarget: (target: Target | null) => void;
  setCalls: React.Dispatch<React.SetStateAction<ApiCall[]>>;
  setConnections: React.Dispatch<React.SetStateAction<ProxyConnection[]>>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [connections, setConnections] = useState<ProxyConnection[]>([]);

  const fetchTargets = useCallback(async () => {
    try {
      const data = await invoke<Target[]>('get_targets');
      setTargets(data);
    } catch (e) {
      console.error('Failed to fetch targets:', e);
    }
  }, []);

  const selectTarget = useCallback((target: Target | null) => {
    setSelectedTarget(target);
    setCalls([]);
    setConnections([]);
  }, [setCalls, setConnections]);

  return (
    <AppContext.Provider
      value={{
        targets,
        selectedTarget,
        calls,
        connections,
        fetchTargets,
        selectTarget,
        setCalls,
        setConnections,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}