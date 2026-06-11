'use client';

import { AlertCircle, CheckCircle2, Loader2, SkipForward, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutomationStore, type NodeRuntimeState } from '@/stores/automation';

interface NodeRuntimeStatusProps {
  runtime: NodeRuntimeState | null;
  accentClassName: string;
}

const statusStyles: Record<NodeRuntimeState['status'], { icon: LucideIcon; className: string; label: string }> = {
  running: {
    icon: Loader2,
    className: 'text-primary',
    label: 'Running',
  },
  success: {
    icon: CheckCircle2,
    className: 'text-emerald-500',
    label: 'Completed',
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-500',
    label: 'Error',
  },
  skipped: {
    icon: SkipForward,
    className: 'text-amber-500',
    label: 'Skipped',
  },
};

export function useNodeRuntimeStatus(nodeId: string): NodeRuntimeState | null {
  return useAutomationStore((s) => s.nodeRuntimeById[nodeId] ?? null);
}

export function NodeRuntimeStatus({ runtime, accentClassName }: NodeRuntimeStatusProps) {
  if (!runtime) return null;

  const item = statusStyles[runtime.status];
  const Icon = item.icon;

  return (
    <div className={cn('border-t px-3 py-1.5', accentClassName)}>
      <div className={cn('flex items-center gap-1.5 text-[10px] font-medium', item.className)}>
        <Icon className={cn('size-3', runtime.status === 'running' && 'animate-spin')} />
        <span>{item.label}</span>
      </div>
    </div>
  );
}
