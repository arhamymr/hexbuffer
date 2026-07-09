import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dispatchAiChatAction } from '@/lib/ai-chat-actions';

export function useAiChatActions() {
  const navigate = useNavigate();

  useEffect(() => {
    const promise = listen<{ action: string; payload: Record<string, unknown> }>(
      'ai-chat-action',
      (e) => {
        console.log('[useAiChatActions] event received:', e.payload?.action);
        dispatchAiChatAction(e.payload.action, e.payload.payload ?? {}, navigate);
      },
    );

    return () => {
      promise.then((fn) => fn());
    };
  }, [navigate]);
}

