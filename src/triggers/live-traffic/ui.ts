import { useFloatingBarUiStore } from '@/stores/floating-bar-ui';

export function openTargetSelector(): void {
  useFloatingBarUiStore.getState().setTargetSelectorOpen(true);
}

export function closeTargetSelector(): void {
  useFloatingBarUiStore.getState().setTargetSelectorOpen(false);
}
