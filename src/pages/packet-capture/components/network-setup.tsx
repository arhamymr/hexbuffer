import { Eye, Lock, Network, Radio, Shield, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CaptureInterfaceOption, NetworkCaptureConfig, NetworkSecurityMode } from '../types';

interface NetworkSetupProps {
  config: NetworkCaptureConfig;
  interfaces: CaptureInterfaceOption[];
  isLoadingInterfaces: boolean;
  onConfigChange: <Key extends keyof NetworkCaptureConfig>(key: Key, value: NetworkCaptureConfig[Key]) => void;
  onContinue: () => void;
  onFixPermissions: () => void;
}

const securityModes: Array<{ value: NetworkSecurityMode; label: string }> = [
  { value: 'wpa-personal', label: 'WPA/WPA2 Personal' },
  { value: 'wpa-enterprise', label: 'WPA Enterprise' },
  { value: 'open', label: 'Open network' },
];

export function NetworkSetup({
  config,
  interfaces,
  isLoadingInterfaces,
  onConfigChange,
  onContinue,
  onFixPermissions,
}: NetworkSetupProps) {
  const selectedInterface = interfaces.find((item) => item.id === config.interfaceId) ?? interfaces[0];
  const isWifi = selectedInterface?.isWifi ?? selectedInterface?.label.toLowerCase().includes('wi-fi') ?? false;
  const isEnterprise = config.securityMode === 'wpa-enterprise';
  const needsPassword = isWifi && config.securityMode !== 'open';

  return (
    <div className="flex h-full min-h-0 items-stretch justify-center bg-background p-4">
      <Card className="h-full min-h-0 w-full max-w-5xl overflow-hidden !py-0">
        <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[320px_1fr]">
          <aside className="flex min-h-0 flex-col border-b bg-muted/30 md:border-b-0 md:border-r">
            <div className="shrink-0 p-5 pb-3">
              <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-md border bg-background">
                <Network className="size-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">Network Setup</div>
                <div className="text-xs text-muted-foreground">Configure before sniffing</div>
              </div>
            </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-5 pb-5">
              <div className="space-y-2 pr-3">
                {interfaces.map((item) => {
                  const active = item.id === config.interfaceId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${
                        active ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted/50'
                      }`}
                      onClick={() => onConfigChange('interfaceId', item.id)}
                    >
                      <div className="flex items-center gap-2">
                        {item.isWifi ? <Wifi className="size-4" /> : <Radio className="size-4" />}
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.address}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                    </button>
                  );
                })}
                {isLoadingInterfaces && (
                  <div className="rounded-md border bg-background px-3 py-3 text-xs text-muted-foreground">
                    Loading capture interfaces...
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="shrink-0 border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <h1 className="text-base font-semibold">{selectedInterface?.label ?? 'Network'} capture profile</h1>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Credentials are used for this capture setup form only and are not written to the project files.
              </p>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="grid gap-5 p-5 pr-7 lg:grid-cols-2">
                <div className="space-y-4">
                  {isWifi && (
                    <>
                      <Field label="SSID" htmlFor="packet-wifi-ssid">
                        <Input
                          id="packet-wifi-ssid"
                          value={config.ssid}
                          onChange={(event) => onConfigChange('ssid', event.target.value)}
                          placeholder="Office-WiFi"
                        />
                      </Field>

                      <Field label="Security" htmlFor="packet-wifi-security">
                        <Select
                          value={config.securityMode}
                          onValueChange={(value) => onConfigChange('securityMode', value as NetworkSecurityMode)}
                        >
                          <SelectTrigger id="packet-wifi-security" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {securityModes.map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {isEnterprise && (
                        <Field label="Username / identity" htmlFor="packet-wifi-username">
                          <Input
                            id="packet-wifi-username"
                            value={config.username}
                            onChange={(event) => onConfigChange('username', event.target.value)}
                            placeholder="analyst@example.com"
                          />
                        </Field>
                      )}

                      {needsPassword && (
                        <Field label={isEnterprise ? 'Password' : 'Wi-Fi password'} htmlFor="packet-wifi-password">
                          <Input
                            id="packet-wifi-password"
                            type="password"
                            value={config.password}
                            onChange={(event) => onConfigChange('password', event.target.value)}
                            placeholder="Network credential"
                          />
                        </Field>
                      )}

                      <Field label="BSSID" htmlFor="packet-wifi-bssid" optional>
                        <Input
                          id="packet-wifi-bssid"
                          value={config.bssid}
                          onChange={(event) => onConfigChange('bssid', event.target.value)}
                          placeholder="aa:bb:cc:dd:ee:ff"
                        />
                      </Field>
                    </>
                  )}

                  {!isWifi && (
                    <Field label="Device IP" htmlFor="packet-device-ip" optional>
                      <Input
                        id="packet-device-ip"
                        value={config.deviceIp}
                        onChange={(event) => onConfigChange('deviceIp', event.target.value)}
                        placeholder={selectedInterface?.address ?? ''}
                      />
                    </Field>
                  )}

                  <Field label="Channel" htmlFor="packet-channel">
                    <Input
                      id="packet-channel"
                      value={config.channel}
                      onChange={(event) => onConfigChange('channel', event.target.value)}
                      placeholder="auto"
                      disabled={!isWifi}
                    />
                  </Field>
                </div>

                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Eye className="size-4" />
                      Capture Options
                    </div>
                    <label className="flex items-start gap-3 rounded-md border bg-background p-3">
                      <Checkbox
                        checked={config.promiscuousMode}
                        onCheckedChange={(checked) => onConfigChange('promiscuousMode', checked === true)}
                      />
                      <span>
                        <span className="block text-sm font-medium">Promiscuous mode</span>
                        <span className="block text-xs text-muted-foreground">Receive traffic visible to the interface, where supported.</span>
                      </span>
                    </label>
                    <label className="mt-2 flex items-start gap-3 rounded-md border bg-background p-3">
                      <Checkbox
                        checked={config.monitorMode}
                        onCheckedChange={(checked) => onConfigChange('monitorMode', checked === true)}
                        disabled={!isWifi}
                      />
                      <span>
                        <span className="block text-sm font-medium">Wi-Fi monitor mode</span>
                        <span className="block text-xs text-muted-foreground">Capture wireless frames on a channel when the adapter allows it.</span>
                      </span>
                    </label>
                  </div>

                  <div className="rounded-md border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Lock className="size-4" />
                      HTTPS visibility
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>TLS packet capture shows metadata such as IPs, ports, SNI, TLS version, and certificate hints.</p>
                      <p>Readable HTTPS bodies still require MITM proxy mode or SSL key log decryption.</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t px-5 py-4">
              <Button variant="outline" onClick={onFixPermissions}>
                Fix Capture Permissions
              </Button>
              <Button onClick={onContinue}>
                Continue to Sniffing
              </Button>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}

function Field({
  children,
  htmlFor,
  label,
  optional,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor} className="text-xs font-medium">
          {label}
        </Label>
        {optional && <span className="text-xs text-muted-foreground">Optional</span>}
      </div>
      {children}
    </div>
  );
}
