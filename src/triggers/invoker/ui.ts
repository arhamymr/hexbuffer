import { useInvokerStore } from '@/stores/invoker';

export function startInvokerAttack(): void {
  void useInvokerStore.getState().startAttack();
}

export function stopInvokerAttack(): void {
  void useInvokerStore.getState().stopAttack();
}
