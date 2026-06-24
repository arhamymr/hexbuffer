import { useTargetStore } from '@/stores/target';
import { useNavStore } from '@/stores/nav';

export interface AddTargetParams {
  host: string;
  name?: string | null;
}

export interface AddTargetsParams {
  hosts: Array<{ host: string; name?: string | null }>;
  targetId?: string | null;
}

export interface DeleteTargetParams {
  targetId: string;
}

export function addTarget(params: AddTargetParams): void {
  const { host, name } = params;
  if (!host) return;

  const store = useTargetStore.getState();
  const target = store.addHostTarget(host);
  if (target && name) {
    store.updateTarget(target.id, { name });
  }
  if (target) useNavStore.getState().triggerNavBlink('/');
}

export function addTargets(params: AddTargetsParams): void {
  const { hosts, targetId } = params;
  if (!hosts?.length) return;

  const store = useTargetStore.getState();

  const resolved = targetId
    ? store.targets.find((t) => t.name === targetId || t.id === targetId)
    : null;

  if (resolved) {
    const target = store.addHostsToTarget(resolved.id, hosts.map((h) => h.host));
    if (target) {
      const namedEntry = hosts.find((h) => h.name);
      if (namedEntry && hosts.length === 1) {
        store.updateTarget(target.id, { name: namedEntry.name! });
      }
    }
    useNavStore.getState().triggerNavBlink('/');
  } else if (targetId) {
    const scope = hosts.map((h) => h.host).filter(Boolean);
    const now = new Date().toISOString();
    store.addTarget({
      id: crypto.randomUUID(),
      name: targetId,
      description: '',
      scope,
      createdAt: now,
      updatedAt: now,
      tabActive: true,
    });
    useNavStore.getState().triggerNavBlink('/');
  } else {
    let added = false;
    for (const entry of hosts) {
      if (!entry.host) continue;
      const target = store.addHostTarget(entry.host);
      if (target && entry.name) {
        store.updateTarget(target.id, { name: entry.name });
      }
      if (target) added = true;
    }
    if (added) useNavStore.getState().triggerNavBlink('/');
  }
}

export function deleteTarget(params: DeleteTargetParams): void {
  const { targetId } = params;
  if (!targetId) return;

  const store = useTargetStore.getState();
  const resolved = store.targets.find(
    (t) => t.name === targetId || t.id === targetId,
  );
  if (resolved) {
    store.removeTarget(resolved.id);
    useNavStore.getState().triggerNavBlink('/');
  }
}

export function deleteAllTargets(): void {
  const store = useTargetStore.getState();
  store.removeAllTargets();
  useNavStore.getState().triggerNavBlink('/');
}
