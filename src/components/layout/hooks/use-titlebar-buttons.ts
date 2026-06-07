import * as React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useTitlebarButtons() {
  const appWindow = React.useMemo(() => getCurrentWindow(), []);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleMinimize = React.useCallback(async () => {
    await appWindow.minimize();
  }, [appWindow]);

  const handleFullscreen = React.useCallback(async () => {
    const nextIsFullscreen = !isFullscreen;
    setIsFullscreen(nextIsFullscreen);
    await appWindow.setFullscreen(nextIsFullscreen);
  }, [appWindow, isFullscreen]);

  const handleClose = React.useCallback(async () => {
    await appWindow.close();
  }, [appWindow]);

  return {
    handleClose,
    handleFullscreen,
    handleMinimize,
  };
}
