import { useEffect } from 'react';
import { TOOLS_TABS } from '../constants';
import { useTabState } from '@/components/tabs-layout/use-tab-state';
import { useToolsStore } from '@/stores/tools';

export function useToolsPage() {
  const { activeTabId, setActiveTabId } = useTabState(TOOLS_TABS);
  const consumeActiveTabOverride = useToolsStore((s) => s.consumeActiveTabOverride);

  useEffect(() => {
    const override = consumeActiveTabOverride();
    if (override) {
      setActiveTabId(override);
    }
  }, [consumeActiveTabOverride, setActiveTabId]);

  return {
    tabs: TOOLS_TABS,
    activeTabId,
    setActiveTabId,
  };
}
