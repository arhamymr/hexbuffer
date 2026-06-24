import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Target } from '@/types';

export function useTargets(selectedTarget: Target | null) {
  const [targets, setTargets] = useState<Target[]>([]);

  const fetchTargets = useCallback(async () => {
    try {
      const data = await invoke<Target[]>('get_targets');
      setTargets(data);
    } catch (e) {
      console.error('Failed to fetch targets:', e);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return { targets, fetchTargets };
}
