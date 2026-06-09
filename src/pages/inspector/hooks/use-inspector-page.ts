'use client';

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useInspectorStore } from '@/stores/inspector';
import type { InspectorConsoleLog } from '../types';

export function useInspectorPage() {
  const addConsoleLog = useInspectorStore((state) => state.addConsoleLog);
  const setConnected = useInspectorStore((state) => state.setConnected);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let mounted = true;

    async function wireEvents() {
      try {
        unlisteners.push(
          await listen<InspectorConsoleLog>('inspector:console-log', (event) => {
            addConsoleLog(event.payload);
          })
        );
        unlisteners.push(
          await listen<boolean>('inspector:connected', (event) => {
            if (mounted) {
              setConnected(event.payload);
            }
          })
        );
      } catch (error) {
        if (mounted) {
          console.warn(
            '[inspector] Tauri event listeners unavailable in this runtime.',
            error
          );
        }
      }
    }

    wireEvents();

    return () => {
      mounted = false;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [addConsoleLog, setConnected]);
}
