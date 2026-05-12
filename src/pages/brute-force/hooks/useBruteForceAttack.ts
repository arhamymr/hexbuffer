import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AttackConfig, AttackProgress, AttackResult } from '../types';

export function useBruteForceAttack() {
  const [results, setResults] = useState<AttackResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [attackId, setAttackId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedResult, setSelectedResult] = useState<AttackResult | null>(null);

  const unlistenProgress = useRef<(() => void) | null>(null);
  const unlistenResult = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unlistenProgress.current) unlistenProgress.current();
      if (unlistenResult.current) unlistenResult.current();
    };
  }, []);

  const startAttack = useCallback(async (config: AttackConfig) => {
    if (!config.base_request.url) return;

    try {
      const id = await invoke<string>('start_intruder_attack', { config });
      setAttackId(id);
      setIsRunning(true);
      setResults([]);
      setProgress(null);

      unlistenProgress.current = await listen<AttackProgress>(
        `intruder-progress-${id}`,
        (event) => {
          const p = event.payload;
          if (p.type === 'Update' && p.current !== undefined && p.total !== undefined) {
            setProgress({ current: p.current, total: p.total });
          } else if (p.type === 'Complete') {
            setIsRunning(false);
            setProgress(null);
          }
        }
      );

      unlistenResult.current = await listen<AttackResult>(
        `intruder-result-${id}`,
        (event) => {
          setResults((prev) => [...prev, event.payload]);
        }
      );
    } catch (error) {
      console.error('Failed to start attack:', error);
      setIsRunning(false);
    }
  }, []);

  const stopAttack = useCallback(async () => {
    if (!attackId) return;

    try {
      await invoke('stop_intruder_attack', { attackId });
    } catch (error) {
      console.error('Failed to stop attack:', error);
    } finally {
      setIsRunning(false);
      if (unlistenProgress.current) {
        unlistenProgress.current();
        unlistenProgress.current = null;
      }
      if (unlistenResult.current) {
        unlistenResult.current();
        unlistenResult.current = null;
      }
    }
  }, [attackId]);

  const clearResults = useCallback(() => {
    setResults([]);
    setSelectedResult(null);
  }, []);

  return {
    results,
    isRunning,
    attackId,
    progress,
    selectedResult,
    setSelectedResult,
    startAttack,
    stopAttack,
    clearResults,
  };
}