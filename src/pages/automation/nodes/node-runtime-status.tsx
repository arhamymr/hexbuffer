import { WarningCircleIcon, CheckCircleIcon, DatabaseIcon, SpinnerGapIcon, SkipForwardIcon, type Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAutomationStore, type NodeRuntimeState } from '@/stores/automation';

interface NodeRuntimeStatusProps {
  runtime: NodeRuntimeState | null;
  accentClassName: string;
}

const statusStyles: Record<NodeRuntimeState['status'], { icon: Icon; className: string; label: string }> = {
  running: {
    icon: SpinnerGapIcon,
    className: 'text-primary',
    label: 'Running',
  },
  success: {
    icon: CheckCircleIcon,
    className: 'text-emerald-500',
    label: 'Completed',
  },
  error: {
    icon: WarningCircleIcon,
    className: 'text-red-500',
    label: 'Error',
  },
  skipped: {
    icon: SkipForwardIcon,
    className: 'text-amber-500',
    label: 'Skipped',
  },
};

export function useNodeRuntimeStatus(nodeId: string): NodeRuntimeState | null {
  return useAutomationStore((s) => s.nodeRuntimeById[nodeId] ?? null);
}

function formatPayloadPreview(data: unknown): string {
  if (data == null) return 'No data';

  if (Array.isArray(data)) {
    return `${data.length} item${data.length !== 1 ? 's' : ''}`;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data as Record<string, unknown>);
    if (keys.length === 0) return 'Empty object';

    return keys.slice(0, 3).join(', ') + (keys.length > 3 ? ` +${keys.length - 3}` : '');
  }

  const value = String(data);
  return value.length > 36 ? `${value.slice(0, 33)}...` : value;
}

export function NodeRuntimeStatus({ runtime, accentClassName }: NodeRuntimeStatusProps) {
  if (!runtime) return null;

  const item = statusStyles[runtime.status];
  const Icon = item.icon;
  const hasInputData = runtime.inputData != null;

  return (
    <div className={cn('border-t px-3 py-1.5', accentClassName)}>
      <div className={cn('flex items-center gap-1.5 text-[10px] font-medium', item.className)}>
        <Icon className={cn('size-3', runtime.status === 'running' && 'animate-spin')} />
        <span>{item.label}</span>
      </div>
      {hasInputData && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <DatabaseIcon className="size-3 shrink-0" />
          <span className="shrink-0 font-medium">Received</span>
          <span className="min-w-0 truncate font-mono">
            {formatPayloadPreview(runtime.inputData)}
          </span>
        </div>
      )}
    </div>
  );
}
