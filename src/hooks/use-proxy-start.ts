import { useState } from 'react';
import { useAppStore } from '@/stores/app';
import { toast } from 'sonner';

export function useProxyStart() {
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const startProxy = useAppStore((state) => state.startProxy);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartProxy = async () => {
    setIsStarting(true);
    try {
      await startProxy();
      toast.success('Proxy started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start proxy');
    } finally {
      setIsStarting(false);
    }
  };

  return { proxyStatus, isStarting, handleStartProxy };
}
