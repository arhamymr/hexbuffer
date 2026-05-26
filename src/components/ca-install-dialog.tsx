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
            AppRecon needs its root CA trusted in your keychain before HTTPS interception can work cleanly.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>HTTPS requests need this certificate</AlertTitle>
          <AlertDescription>
            If the CA is not installed, intercepted HTTPS requests may be blocked by the browser or shown as
            untrusted because the proxy signs traffic with an unknown certificate.
          </AlertDescription>
        </Alert>

        <p className="text-sm text-muted-foreground">
          You can install it now, or install it later from Settings under CA Certificate.
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
