'use client';

import { useState, useCallback, useEffect } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { AlertTriangle, Globe, KeyRound, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { trustInterceptCa } from '@/pages/live-traffic/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STORAGE_KEY = 'ca-install-dialog-dismissed';

export function CaInstallDialog() {
  const [installing, setInstalling] = useState(false);
  const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (!open) {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  }, [open]);

  const handleInstall = useCallback(async () => {
    try {
      setInstalling(true);
      const message = await trustInterceptCa();
      toast.success(message);
    } catch (error) {
      console.error('Failed to install CA certificate:', error);
      toast.error(`Failed to install certificate: ${error}`);
    } finally {
      setInstalling(false);
    }
  }, []);

  const openSettings = async () => {
    setOpen(false);
    try {
      const existing = await WebviewWindow.getByLabel('settings');
      if (existing) {
        await existing.unminimize();
        await existing.show();
        await existing.setFocus();
        return;
      }
      new WebviewWindow('settings', {
        url: '/?window=settings',
        title: '0xbuffer - Settings',
        width: 700,
        height: 600,
        decorations: true,
        resizable: true,
      });
    } catch {
      window.open('/settings', '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install Root CA Certificate</DialogTitle>
          <DialogDescription>
            0xbuffer uses your installed Chrome with an isolated profile. Install the CA only when you want
            to intercept traffic from your regular browser or other apps.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="min-h-11 items-center shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTitle>External apps need this certificate</AlertTitle>
          <AlertDescription>
            Browsers or apps outside 0xbuffer may block intercepted HTTPS requests unless they trust the 0xbuffer CA that signs proxy certificates
          </AlertDescription>
        </Alert>

       <Alert variant="default" className="min-h-11 items-center shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertDescription>
            Use <b>Open Browser </b>for ready-to-go interception, or install the CA from here when you need external
            traffic capture.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={openSettings}>
            <Settings className="size-4" />
            Open Settings
          </Button>
          <Button onClick={handleInstall} disabled={installing}>
            {installing ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {installing ? 'Installing...' : 'Install CA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
