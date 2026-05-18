import { useAppStore } from '@/stores/app';

export function AppFooter() {
  const status = useAppStore((s) => s.proxyStatus);

  return (
    <footer className="border-t px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'starting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
          <span>{status === 'connected' ? 'Connected' : status === 'starting' ? 'Starting...' : 'Disconnected'}</span>
        </div>
      </div>
      <span>© 2024 | Apprecon Version 0.1</span>
    </footer>
  );
}