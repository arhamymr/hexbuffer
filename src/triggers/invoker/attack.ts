import { invoke } from '@tauri-apps/api/core';
import type { AttackConfig } from '@/pages/invoker/types';

export async function startAttack(config: AttackConfig): Promise<string> {
  return invoke<string>('start_invoker_attack', {
    config: { ...config, mode: 'Sniper' },
  });
}

export async function stopAttack(attackId: string): Promise<void> {
  await invoke('stop_invoker_attack', { attackId });
}
