import { useAppStore } from '@/stores/app';

export function useTriangleLogo() {
  const proxyStatus = useAppStore((state) => state.proxyStatus);

  return {
    isConnected: proxyStatus === 'connected',
  };
}
