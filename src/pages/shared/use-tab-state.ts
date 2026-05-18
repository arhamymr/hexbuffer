import * as React from 'react';

interface TabDefinition {
  id: string;
}

export function useTabState<T extends TabDefinition>(tabs: T[]) {
  const [activeTabId, setActiveTabId] = React.useState(() => tabs[0]?.id ?? '');

  return {
    activeTabId,
    setActiveTabId,
  };
}
