'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { DownloadIcon, ShieldCheckIcon, InfoIcon, AlertTriangleIcon, SettingsIcon } from 'lucide-react';
import { getCaCert, saveCaCert } from '@/lib/api';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';

export function Settings() {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownloadCert = async () => {
    try {
      setDownloading(true);

      const filePath = await save({
        title: 'Save CA Certificate',
        defaultPath: 'apprecon-ca.pem',
        filters: [{
          name: 'PEM Certificate',
          extensions: ['pem', 'crt', 'cer']
        }]
      });

      if (filePath) {
        const certPem = await getCaCert();
        console.log('Certificate received, length:', certPem.length);
        await saveCaCert(filePath, certPem);
        toast.success(`Certificate saved to ${filePath}`);
      }
    } catch (error) {
      console.error('Failed to download CA certificate:', error);
      toast.error(`Failed to save certificate: ${error}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your application settings</p>
      </div>

      <Tabs defaultValue="ca-cert" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="settings">
              <SettingsIcon className="mr-2 size-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="ca-cert">
              <ShieldCheckIcon className="mr-2 size-4" />
              CA Certificate
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="settings" className="flex-1 overflow-auto px-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Application</CardTitle>
              <CardDescription>
                General application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Application configuration options will appear here in future updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ca-cert" className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <Alert>
            <AlertTriangleIcon className="size-4" />
            <AlertTitle>Important Security Notice</AlertTitle>
            <AlertDescription>
              To intercept HTTPS traffic, you must install the Apprecon CA certificate in your browser or device.
              This allows the proxy to inspect encrypted connections for security analysis.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-5 text-primary" />
                <CardTitle>CA Certificate</CardTitle>
              </div>
              <CardDescription>
                Download and install the CA certificate to enable HTTPS interception
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button onClick={handleDownloadCert} disabled={downloading} className="w-fit">
                  <DownloadIcon className="mr-2 size-4" />
                  {downloading ? 'Saving...' : 'Save CA Certificate'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Choose a location to save <code className="bg-muted px-1 py-0.5 rounded">apprecon-ca.pem</code>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Installation Guides</CardTitle>
              <CardDescription>
                Follow the steps for your browser or device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="chrome-windows">
                  <AccordionTrigger>Chrome / Edge (Windows)</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Save the CA certificate above to a location you can find</li>
                      <li>Open Chrome and go to Settings → Privacy and security</li>
                      <li>Click &quot;Manage certificates&quot;</li>
                      <li>Go to the &quot;Authorities&quot; tab</li>
                      <li>Click &quot;Import&quot; and select the saved <code>apprecon-ca.pem</code> file</li>
                      <li>When prompted, check &quot;Trust this certificate for identification of websites&quot;</li>
                      <li>Click &quot;OK&quot; and restart your browser</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="chrome-mac">
                  <AccordionTrigger>Chrome / Edge (macOS)</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Save the CA certificate above to a location you can find</li>
                      <li>Open Chrome and go to Settings → Privacy and security → Security</li>
                      <li>Scroll down and click &quot;Manage certificates&quot;</li>
                      <li>Click &quot;Import&quot; in the dialog that appears</li>
                      <li>Select the saved <code>apprecon-ca.pem</code> file</li>
                      <li>Check &quot;Trust for SSL/TLS websites&quot; when prompted</li>
                      <li>Click &quot;OK&quot; and restart your browser</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="firefox">
                  <AccordionTrigger>Firefox (All Platforms)</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Save the CA certificate above to a location you can find</li>
                      <li>Open Firefox and go to Options → Privacy & Security</li>
                      <li>Scroll to &quot;Certificates&quot; section and click &quot;View Certificates&quot;</li>
                      <li>Click &quot;Authorities&quot; tab</li>
                      <li>Click &quot;Import&quot; and select the saved <code>apprecon-ca.pem</code> file</li>
                      <li>Check &quot;Trust this CA to identify websites&quot;</li>
                      <li>Click &quot;OK&quot; and restart Firefox</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="safari">
                  <AccordionTrigger>Safari (macOS)</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Save the CA certificate above to a location you can find</li>
                      <li>Open Safari → Preferences → Privacy</li>
                      <li>Click &quot;Manage Websites&quot; then &quot;Certificates&quot;</li>
                      <li>Import the saved <code>apprecon-ca.pem</code> file</li>
                      <li>Set certificate trust to &quot;Always Trust&quot;</li>
                      <li>Authenticate with Touch ID if prompted</li>
                      <li>Restart Safari</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ios">
                  <AccordionTrigger>iOS (iPhone / iPad)</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Save the CA certificate on your device (Files app recommended)</li>
                      <li>Go to Settings → General → VPN & Device Management</li>
                      <li>Tap the downloaded profile to install it</li>
                      <li>Go to Settings → General → About → Certificate Trust Settings</li>
                      <li>Enable full trust for &quot;Apprecon Root CA&quot;</li>
                    </ol>
                    <Alert className="mt-3">
                      <InfoIcon className="size-4" />
                      <AlertDescription className="text-xs">
                        On iOS 13+, you may need to allow the profile in Settings → General → Profiles
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="android">
                  <AccordionTrigger>Android</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Save the CA certificate to your device</li>
                      <li>Go to Settings → Security → Advanced → Encryption & credentials</li>
                      <li>Tap &quot;Install a certificate&quot; → &quot;CA certificate&quot;</li>
                      <li>Select the saved <code>apprecon-ca.pem</code> file</li>
                      <li>Name the certificate and confirm installation</li>
                      <li>Some devices may require a PIN or password</li>
                    </ol>
                    <Alert className="mt-3">
                      <InfoIcon className="size-4" />
                      <AlertDescription className="text-xs">
                        Android 7.0+ blocks user-installed CAs for apps by default.
                        Some apps may need additional configuration.
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How HTTPS Interception Works</CardTitle>
              <CardDescription>
                Understanding the certificate-based proxy mechanism
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>1. Certificate Generation:</strong> When you first run the proxy,
                  Apprecon generates a unique Root CA certificate stored locally on your device.
                </p>
                <p>
                  <strong>2. CA Installation:</strong> Installing this CA in your browser/device
                  tells it to trust certificates signed by Apprecon.
                </p>
                <p>
                  <strong>3. Dynamic Certificate Signing:</strong> When you visit an HTTPS site
                  (e.g., example.com), the proxy dynamically creates a certificate for that site,
                  signed by the trusted Apprecon CA.
                </p>
                <p>
                  <strong>4. Secure Passthrough:</strong> The proxy decrypts, inspects, and re-encrypts
                  traffic. Your browser sees a valid certificate and shows the padlock.
                </p>
                <p>
                  <strong>5. Privacy Note:</strong> Only traffic passing through Apprecon proxy
                  is intercepted. Your browsing outside the proxy remains private.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
              <CardDescription>Common issues and solutions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="cert-warning">
                  <AccordionTrigger>Browser shows &quot;Certificate Not Trusted&quot; warning</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Make sure you have:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Correctly imported the CA certificate</li>
                      <li>Set the CA to &quot;Trusted&quot; or &quot;Always Trust&quot; in your browser settings</li>
                      <li>Restarted your browser after installing the certificate</li>
                      <li>On iOS, enabled full trust in Certificate Trust Settings</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="some-apps-not-working">
                  <AccordionTrigger>Some apps don&apos;t work with interception enabled</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Some apps use certificate pinning and won&apos;t accept the proxy&apos;s certificate.
                      This is a security feature. To bypass for testing, you would need to disable
                      certificate pinning in those apps, which typically requires root access or
                      modifying the app.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="remove-ca">
                  <AccordionTrigger>How to remove the CA certificate</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      To remove the installed CA certificate:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li><strong>Windows:</strong> Internet Options → Content → Certificates → Authorities → Select &quot;Apprecon Root CA&quot; → Remove</li>
                      <li><strong>macOS:</strong> Keychain Access → System → Certificates → Delete &quot;Apprecon Root CA&quot;</li>
                      <li><strong>Firefox:</strong> Options → Privacy → Certificates → View Certificates → Authorities → Delete</li>
                      <li><strong>iOS:</strong> Settings → General → Profiles → Delete Apprecon profile</li>
                      <li><strong>Android:</strong> Settings → Security → Advanced → Encryption → Trusted certificates → Remove</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}