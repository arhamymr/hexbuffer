import * as React from 'react';
import { useInterceptStore } from '../../state/intercept-store';

export function useBypassPanel() {
  const tabs = useInterceptStore((state) => state.tabs);
  const activeTabId = useInterceptStore((state) => state.activeTabId);
  const addCaptureHost = useInterceptStore((state) => state.addCaptureHost);
  const removeCaptureHost = useInterceptStore((state) => state.removeCaptureHost);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const patterns = activeTab?.captureHosts ?? [];

  const [value, setValue] = React.useState('');
  const [open, setOpen] = React.useState(true);

  const handleAdd = React.useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) {
      addCaptureHost(trimmed);
      setValue('');
    }
  }, [value, addCaptureHost]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    },
    [handleAdd]
  );

  const toggleOpen = React.useCallback(() => {
    setOpen((o) => !o);
  }, []);

  const handleRemovePattern = React.useCallback(
    (pattern: string) => {
      removeCaptureHost(pattern);
    },
    [removeCaptureHost]
  );

  const handleValueChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return {
    patterns,
    value,
    open,
    handleAdd,
    handleKeyDown,
    toggleOpen,
    handleRemovePattern,
    handleValueChange,
  };
}
