'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CaInstallDialog } from '@/components/ca-install-dialog';
import { trustInterceptCa } from '@/pages/live-traffic/api';

const GLOBAL_CA_INSTALL_MODAL_SEEN_KEY = '0xbuffer:ca-install-modal-seen';
const LEGACY_INTERCEPT_CA_INSTALL_MODAL_SEEN_KEY = '0xbuffer:intercept-ca-install-modal-seen';

export function GlobalCaInstallDialog() {
  const [open, setOpen] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    const hasSeenGlobalModal = window.localStorage.getItem(GLOBAL_CA_INSTALL_MODAL_SEEN_KEY) === 'true';
    const hasSeenLegacyModal = window.localStorage.getItem(LEGACY_INTERCEPT_CA_INSTALL_MODAL_SEEN_KEY) === 'true';

    if (hasSeenGlobalModal || hasSeenLegacyModal) {
      return;
    }

    window.localStorage.setItem(GLOBAL_CA_INSTALL_MODAL_SEEN_KEY, 'true');
    window.localStorage.setItem(LEGACY_INTERCEPT_CA_INSTALL_MODAL_SEEN_KEY, 'true');
    setOpen(true);
  }, []);

  const installCa = React.useCallback(async () => {
    setInstalling(true);

    try {
      const message = await trustInterceptCa();
      toast.success(message);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to install CA certificate.');
    } finally {
      setInstalling(false);
    }
  }, []);

  return (
    <CaInstallDialog
      open={open}
      installing={installing}
      onOpenChange={setOpen}
      onInstall={installCa}
    />
  );
}
