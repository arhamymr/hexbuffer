import { useNavStore } from '@/stores/nav';
import { allNavItems } from '@/layout/constants';

/**
 * Normalizes app paths and opens/focuses the corresponding window.
 */
export function openApp(path: string, navigate?: (path: string) => void): void {
  let targetPath = path;
  
  // Normalize old or incorrect paths from the sidecar
  if (targetPath === '/browser-automation') {
    targetPath = '/browser';
  } else if (targetPath === '/live-traffic') {
    targetPath = '/http-history';
  }

  const navItem = allNavItems.find((item) => item.href === targetPath);
  if (navItem) {
    useNavStore.getState().triggerNavBlink(targetPath);
    useNavStore.getState().openWindow(targetPath, navItem.label);
    useNavStore.getState().focusWindow(targetPath, navigate);
  } else if (targetPath === '/') {
    if (navigate) {
      navigate('/');
    }
  }
}
