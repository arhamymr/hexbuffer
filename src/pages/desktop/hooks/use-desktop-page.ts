import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { allNavItems } from '@/layout/constants';
import { useNavStore } from '@/stores/nav';
import { useAppSettingsStore } from '@/stores/app-settings-store';

export function useDesktopPage() {
  const navigate = useNavigate();
  const searchQuery = useNavStore((s) => s.desktopSearchQuery);
  const setSearchQuery = useNavStore((s) => s.setDesktopSearchQuery);
  const hiddenNavItems = useAppSettingsStore((s) => s.hiddenNavItems);

  // Get all unique navigation items, filter out 'Desktop', apply environment check and query matching
  const displayItems = React.useMemo(() => {
    const baseItems = allNavItems.filter(
      (item) => item.label !== 'Desktop' && !hiddenNavItems.includes(item.href)
    );
    
    const activeItems = import.meta.env.PROD
      ? baseItems.filter((item) => item.flag !== 'alpha')
      : baseItems;

    return activeItems.filter((item) => {
      const matchQuery = searchQuery.toLowerCase();
      const matchesLabel = item.label.toLowerCase().includes(matchQuery);
      const matchesDesc = (item.description ?? '')
        .toLowerCase()
        .includes(matchQuery);
      return matchesLabel || matchesDesc;
    });
  }, [searchQuery]);

  const handleItemClick = (href: string) => {
    navigate(href);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return {
    searchQuery,
    setSearchQuery,
    displayItems,
    handleItemClick,
    handleClearSearch,
  };
}
