import { useInterceptStore } from '@/pages/intercept/state/intercept-store';

export function toggleInterceptEnabled(): void {
  const store = useInterceptStore.getState();
  const newEnabled = store.status?.mode !== 'Enabled';
  void store.toggleIntercept(newEnabled);
}

export function forwardPaused(): void {
  const store = useInterceptStore.getState();
  void store.forwardSelectedRequest();
}
