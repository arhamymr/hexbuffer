import * as React from 'react';
import { EyeIcon, EyeSlashIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SettingsPageState } from '../hooks/use-settings-page';
import { SettingsGroup, SettingsRow } from './settings-group';

interface R2SettingsTabProps {
  settings: SettingsPageState;
}

export function R2SettingsTab({ settings }: R2SettingsTabProps) {
  const {
    r2AccountId,
    setR2AccountId,
    r2AccessKeyId,
    setR2AccessKeyId,
    r2SecretAccessKey,
    setR2SecretAccessKey,
    r2CustomEndpointUrl,
    setR2CustomEndpointUrl,
    r2HasSecretKey,
    r2Saving,
    r2Loading,
    handleSaveR2Settings,
    handleClearR2Credentials,
  } = settings;

  const [showSecret, setShowSecret] = React.useState(false);

  return (
    <SettingsGroup
      label="Cloudflare R2 Storage"
      description="Configure S3-compatible Cloudflare R2 credentials. The Secret Access Key is securely saved in your OS Keychain vault."
    >
      <SettingsRow label="Account ID">
        <Input
          value={r2AccountId}
          onChange={(e) => setR2AccountId(e.target.value)}
          placeholder="e.g. 2dea62aaeecb0c970c637e61bff9119a"
          disabled={r2Loading}
          className="w-80"
        />
      </SettingsRow>
      <SettingsRow label="Access Key ID">
        <Input
          value={r2AccessKeyId}
          onChange={(e) => setR2AccessKeyId(e.target.value)}
          placeholder="e.g. 5f626a9c5d09584a2139414f87002ab4"
          disabled={r2Loading}
          className="w-80"
        />
      </SettingsRow>
      <SettingsRow
        label="Secret Access Key"
        description={
          r2HasSecretKey
            ? 'A Secret Access Key is securely stored in your OS Keychain.'
            : 'No secret key saved yet.'
        }
      >
        <div className="relative w-80">
          <Input
            type={showSecret ? 'text' : 'password'}
            value={r2SecretAccessKey}
            onChange={(e) => setR2SecretAccessKey(e.target.value)}
            placeholder={r2HasSecretKey ? '••••••••••••••••••••••••••••••••' : 'Secret Access Key'}
            disabled={r2Loading}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowSecret((prev) => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showSecret ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </SettingsRow>
      <SettingsRow
        label="Custom Endpoint URL"
        description="Optional. Leave blank to use the default https://<account-id>.r2.cloudflarestorage.com"
      >
        <Input
          value={r2CustomEndpointUrl}
          onChange={(e) => setR2CustomEndpointUrl(e.target.value)}
          placeholder="e.g. https://files.my-domain.com"
          disabled={r2Loading}
          className="w-80"
        />
      </SettingsRow>
      <SettingsRow label="Actions">
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            onClick={handleSaveR2Settings}
            disabled={r2Loading || r2Saving}
          >
            <FloppyDiskIcon className="mr-1.5 size-3.5" />
            {r2Saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={handleClearR2Credentials}
            disabled={r2Loading || r2Saving || (!r2AccountId && !r2HasSecretKey)}
          >
            Clear Settings
          </Button>
        </div>
      </SettingsRow>
    </SettingsGroup>
  );
}
