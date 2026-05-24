import { TOOLS_TABS } from '../constants';
import { useTabState } from '@/components/tabs-layout/use-tab-state';

export function useToolsPage() {
  const { activeTabId, setActiveTabId } = useTabState(TOOLS_TABS);

  return {
    tabs: TOOLS_TABS,
    activeTabId,
    setActiveTabId,
  };
}
