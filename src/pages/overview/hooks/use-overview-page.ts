import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { allNavItems } from '@/components/layout/constants';
import { useNavStore } from '@/stores/nav';
import { FEATURE_DESCRIPTIONS } from '../constants';

export function useOverviewPage() {
  const navigate = useNavigate();
  const searchQuery = useNavStore((s) => s.overviewSearchQuery);
  const setSearchQuery = useNavStore((s) => s.setOverviewSearchQuery);

  const [wallpaperType, setWallpaperType] = React.useState(() => localStorage.getItem('desktop-wallpaper-type') ?? 'gradient');
  const [wallpaperUrl, setWallpaperUrl] = React.useState(() => localStorage.getItem('desktop-wallpaper-url') ?? '');

  // Get all unique navigation items, filter out 'Overview', apply environment check and query matching
  const displayItems = React.useMemo(() => {
    const baseItems = allNavItems.filter((item) => item.label !== 'Overview');
    
    const activeItems = import.meta.env.PROD
      ? baseItems.filter((item) => !item.devOnly)
      : baseItems;

    return activeItems.filter((item) => {
      const matchQuery = searchQuery.toLowerCase();
      const matchesLabel = item.label.toLowerCase().includes(matchQuery);
      const matchesDesc = (FEATURE_DESCRIPTIONS[item.label] ?? '')
        .toLowerCase()
        .includes(matchQuery);
      return matchesLabel || matchesDesc;
    });
  }, [searchQuery]);

  const wallpaperBackgroundStyle = React.useMemo<React.CSSProperties>(() => {
    if (wallpaperType === 'image' && wallpaperUrl) {
      return {
        backgroundImage: `url("${wallpaperUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    if (wallpaperType === 'solid' && wallpaperUrl) {
      return {
        backgroundColor: wallpaperUrl,
        backgroundImage: 'none',
      };
    }
    return {};
  }, [wallpaperType, wallpaperUrl]);

  const handleItemClick = (href: string) => {
    navigate(href);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return {
    searchQuery,
    setSearchQuery,
    wallpaperType,
    setWallpaperType,
    wallpaperUrl,
    setWallpaperUrl,
    displayItems,
    wallpaperBackgroundStyle,
    handleItemClick,
    handleClearSearch,
  };
}
