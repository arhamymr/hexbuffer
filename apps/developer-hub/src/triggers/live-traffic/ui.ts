import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { useFloatingBarUiStore } from '@/stores/floating-bar-ui';

export function openTargetSelector(): void {
  useFloatingBarUiStore.getState().setTargetSelectorOpen(true);
}

export function closeTargetSelector(): void {
  useFloatingBarUiStore.getState().setTargetSelectorOpen(false);
}

export function toggleStreamPause(): void {
  const store = useHistoryQueryStore.getState();
  const wasPaused = store.isStreamManuallyPaused;
  store.setStreamManuallyPaused(!wasPaused);
  // When resuming, trigger a refresh to pull in any missed traffic
  if (wasPaused) {
    store.triggerRefresh();
  }
}

export function toggleHistoryMode(): void {
  const current = localStorage.getItem('history-mode') === 'websocket' ? 'websocket' : 'http';
  const next = current === 'http' ? 'websocket' : 'http';
  localStorage.setItem('history-mode', next);
  window.dispatchEvent(new CustomEvent('history-mode-change', { detail: next }));
}
