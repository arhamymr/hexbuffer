'use client';

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, KeyRound, Loader2, Settings } from 'lucide-react';
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

interface CaInstallDialogProps {
  open: boolean;
  installing: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: () => void;
}

export function CaInstallDialog({
  open,
  installing,
  onOpenChange,
  onInstall,
}: CaInstallDialogProps) {
  const navigate = useNavigate();

  const openSettings = () => {
    onOpenChange(false);
    navigate('/settings');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install Root CA Certificate</DialogTitle>
          <DialogDescription>
            0xbuffer uses your installed Chrome with an isolated profile. Install the CA only when you want
            to intercept traffic from your regular browser or other apps.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>External apps need this certificate</AlertTitle>
          <AlertDescription>
            Browsers or apps outside 0xbuffer may block intercepted HTTPS requests unless they trust the
            0xbuffer CA that signs proxy certificates.
          </AlertDescription>
        </Alert>

        <p className="text-sm text-muted-foreground">
          Use Open Browser for ready-to-go interception, or install the CA from here when you need external
          traffic capture.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={openSettings}>
            <Settings className="size-4" />
            Open Settings
          </Button>
          <Button onClick={onInstall} disabled={installing}>
            {installing ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {installing ? 'Installing...' : 'Install CA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
