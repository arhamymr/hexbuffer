import * as React from 'react';
import { useInterceptStore } from '../state/intercept-store';

export function useInterceptPage() {
  const refresh = useInterceptStore((state) => state.refresh);
  const syncActiveScope = useInterceptStore((state) => state.syncActiveScope);

  React.useEffect(() => {
    void syncActiveScope();
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 1000);

    return () => window.clearInterval(intervalId);
  }, [refresh, syncActiveScope]);
}
