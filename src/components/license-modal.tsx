import * as React from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { CheckCircleIcon, ArrowSquareOutIcon, SpinnerGapIcon, ShoppingBagIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLicenseStore } from '@/stores/license';

const CHECKOUT_URL = 'https://hexbuffer.com/payment';
const LICENSE_KEY_PATTERN = /^0XB-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;

function maskKey(key: string): string {
  if (key.length <= 14) return key;
  return `${key.slice(0, 8)}${'•'.repeat(10)}${key.slice(-5)}`;
}

interface LicenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LicenseModal({ open, onOpenChange }: LicenseModalProps) {
  const [keyInput, setKeyInput] = React.useState('');
  const licenseKey = useLicenseStore((state) => state.licenseKey);
  const status = useLicenseStore((state) => state.status);
  const activating = useLicenseStore((state) => state.activating);
  const activate = useLicenseStore((state) => state.activate);
  const deactivate = useLicenseStore((state) => state.deactivate);

  const isLicensed = status === 'lifetime';
  const keyValid = LICENSE_KEY_PATTERN.test(keyInput.trim().toUpperCase());

  const handleActivate = React.useCallback(async () => {
    const trimmed = keyInput.trim().toUpperCase();
    if (!LICENSE_KEY_PATTERN.test(trimmed)) return;
    try {
      await activate(trimmed);
      setKeyInput('');
    } catch {
      // toast already shown by store
    }
  }, [activate, keyInput]);

  const handleDeactivate = React.useCallback(async () => {
    try {
      await deactivate();
    } catch {
      // toast already shown by store
    }
  }, [deactivate]);

  const handleBuyLicense = React.useCallback(() => {
    openUrl(CHECKOUT_URL);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            License
          </DialogTitle>
          <DialogDescription>
            {isLicensed
              ? 'Your license is active.'
              : 'Activate your license or use the free evaluation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLicensed ? (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="size-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium">License active — never expires</span>
                </div>
                <Badge className="bg-green-600 text-white hover:bg-green-700">Lifetime</Badge>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Key: {licenseKey ? maskKey(licenseKey) : '—'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-muted bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  You are using the free evaluation.
                </span>
                <Badge variant="outline" className='rounded-md'>Free</Badge>
              </div>
              <Button
                className="mt-3 w-full"
                onClick={handleBuyLicense}
              >
                <ShoppingBagIcon className="size-4" />
                Buy License
                <ArrowSquareOutIcon className="size-3" />
              </Button>
            </div>
          )}

          {!isLicensed && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or enter your license key</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="0XB-XXXXX-XXXXX-XXXXX-XXXXX"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && keyValid && !activating) {
                      handleActivate();
                    }
                  }}
                  className="font-mono text-xs"
                  disabled={activating}
                />
                <Button
                  size="sm"
                  onClick={handleActivate}
                  disabled={!keyValid || activating}
                >
                  {activating ? (
                    <SpinnerGapIcon className="size-4 animate-spin" />
                  ) : (
                    'Activate'
                  )}
                </Button>
              </div>
            </>
          )}

          {isLicensed && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleDeactivate}
            >
              Deactivate
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
