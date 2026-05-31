import * as React from 'react';
import { useInterceptStore } from '../state/intercept-store';

export function useInterceptPage() {
  const refresh = useInterceptStore((state) => state.refresh);

  React.useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 1000);

    return () => window.clearInterval(intervalId);
  }, [refresh]);
}
