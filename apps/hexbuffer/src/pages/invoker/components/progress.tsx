import { useInvokerStore } from '@/stores/invoker';

export function InvokerProgress() {
  const progress = useInvokerStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.progress ?? null;
  });

  if (!progress) {
    return null;
  }

  const percentage = Math.round((progress.current / progress.total) * 100);

  return (
    <div className="mt-2 p-2">
      <div className="flex items-center justify-between text-sm mb-1">
        <span>Progress</span>
        <span>
          {progress.current} / {progress.total} ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(progress.current / progress.total) * 100}%` }}
        />
      </div>
    </div>
  );
}
