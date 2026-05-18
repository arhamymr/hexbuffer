import { AI_TOOLS_TABS } from '../constants';
import { useTabState } from '@/pages/shared/use-tab-state';

export function useAIToolsPage() {
  const { activeTabId, setActiveTabId } = useTabState(AI_TOOLS_TABS);

  return {
    tabs: AI_TOOLS_TABS,
    activeTabId,
    setActiveTabId,
  };
}
