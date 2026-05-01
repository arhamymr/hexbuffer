'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Download, Shield, CheckCircle2, Copy, ChevronRight } from 'lucide-react';

function StepCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-card">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold mb-2">{title}</h3>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function BrowserSection({
  name,
  icon,
  steps,
}: {
  name: string;
  icon: React.ReactNode;
  steps: React.ReactNode;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <CardTitle>{name}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Show'} steps
            <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      {expanded && <CardContent className="space-y-3">{steps}</CardContent>}
    </Card>
  );
}

export function Settings() {
  const [caCert, setCaCert] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [certInstalled, setCertInstalled] = React.useState(false);

  const downloadCACert = async () => {
    setDownloading(true);
    try {
      const cert = await invoke<string>('get_ca_cert');
      setCaCert(cert);

      const blob = new Blob([cert], { type: 'application/x-pem-file' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'apsara-digital-ca.pem';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download CA cert:', e);
    } finally {
      setDownloading(false);
    }
  };

  const copyCertToClipboard = async () => {
    if (!caCert) return;
    try {
      await navigator.clipboard.writeText(caCert);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your proxy and CA certificates for HTTPS inspection
        </p>
      </div>

      <Card className="border-primary/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>HTTPS Inspection Setup</CardTitle>
              <CardDescription>
                Install the CA certificate to intercept and inspect HTTPS traffic
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
            <div className="flex-1">
              <p className="font-medium">CA Certificate</p>
              <p className="text-sm text-muted-foreground">
                Required for decrypting HTTPS traffic. This certificate is unique to your installation.
              </p>
            </div>
            {caCert && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Generated
              </Badge>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={downloadCACert} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? 'Generating...' : 'Download CA Certificate'}
            </Button>

            {caCert && (
              <Button variant="outline" onClick={copyCertToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? 'Copied!' : 'Copy PEM Content'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Installation Guides</h2>

        <BrowserSection
          name="Firefox"
          icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.12 0 2.18.23 3.14.64l-1.64 4.36c-.44.44-.64 1.02-.64 1.64 0 .62.2 1.2.54 1.66l-1.95 1.95c-.44-.44-.7-1.02-.7-1.66 0-1.12.66-2.09 1.65-2.5l1.7-1.7c-.44-.44-.7-1.02-.7-1.66 0-1.12.66-2.09 1.65-2.5l1.7-1.7C15.6 5.6 17.4 6.5 19 8.5l-1.3 3.5c-.2.2-.3.45-.3.7 0 .55.45 1 1 1h3l-1.5 3c-.2.2-.3.45-.3.7 0 .55.45 1 1 1 .2 0 .35-.05.5-.15l1.5-2.5 2 2H20l-4 4h3l2.5-2.5 1.5 2.5c.15.1.35.15.5.15.55 0 1-.45 1-1 0-.25-.1-.5-.3-.7l-1.5-3h3l1 4h-3l-1-4h-2l2.5-5 1.5 3c.1.2.25.35.45.45.2.1.45.15.7.15.55 0 1-.45 1-1 0-.25-.1-.5-.3-.7l-1.5-3c1.6-2 2.5-4.4 2.5-7.1 0-4.41-3.59-8-8-8z"/></svg>}
          steps={
            <>
              <StepCard number={1} title="Open Firefox Settings">
                Click the menu icon (three lines) in the top-right corner and select <strong>Settings</strong>.
              </StepCard>
              <StepCard number={2} title="Navigate to Privacy & Security">
                Scroll down to the <strong>Privacy & Security</strong> section.
              </StepCard>
              <StepCard number={3} title="Import Certificate">
                Scroll to the <strong>Certificates</strong> section and click <strong>View Certificates</strong>.
                In the Certificate Manager, go to the <strong>Authorities</strong> tab, click <strong>Import</strong>,
                and select the downloaded <code>apsara-digital-ca.pem</code> file.
              </StepCard>
              <StepCard number={4} title="Trust the Certificate">
                When prompted, check the box <strong>Trust this CA to identify websites</strong> and click OK.
              </StepCard>
              <StepCard number={5} title="Restart Firefox">
                Close and reopen Firefox for the certificate to take effect.
              </StepCard>
            </>
          }
        />

        <BrowserSection
          name="Chrome / Edge (macOS)"
          icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.12 0 2.18.23 3.14.64l-1.64 4.36c-.44.44-.64 1.02-.64 1.64 0 .62.2 1.2.54 1.66l-1.95 1.95c-.44-.44-.7-1.02-.7-1.66 0-1.12.66-2.09 1.65-2.5l1.7-1.7c-.44-.44-.7-1.02-.7-1.66 0-1.12.66-2.09 1.65-2.5l1.7-1.7C15.6 5.6 17.4 6.5 19 8.5l-1.3 3.5c-.2.2-.3.45-.3.7 0 .55.45 1 1 1h3l-1.5 3c-.2.2-.3.45-.3.7 0 .55.45 1 1 1 .2 0 .35-.05.5-.15l1.5-2.5 2 2H20l-4 4h3l2.5-2.5 1.5 2.5c.15.1.35.15.5.15.55 0 1-.45 1-1 0-.25-.1-.5-.3-.7l-1.5-3h3l1 4h-3l-1-4h-2l2.5-5 1.5 3c.1.2.25.35.45.45.2.1.45.15.7.15.55 0 1-.45 1-1 0-.25-.1-.5-.3-.7l-1.5-3c1.6-2 2.5-4.4 2.5-7.1 0-4.41-3.59-8-8-8z"/></svg>}
          steps={
            <>
              <StepCard number={1} title="Open Keychain Access">
                Press <strong>Cmd + Space</strong>, search for <strong>Keychain Access</strong>, and open it.
              </StepCard>
              <StepCard number={2} title="Add Certificate">
                In Keychain Access, go to <strong>File &gt; Import Items</strong> or drag the{' '}
                <code>apsara-digital-ca.pem</code> file into the Keychain Access window.
              </StepCard>
              <StepCard number={3} title="Trust the Certificate">
                Find the certificate in your keychain (search for "Apsara Digital").
                Right-click and select <strong>Get Info</strong>, then expand the Trust section.
                Set <strong>When using this certificate</strong> to <strong>Always Trust</strong>.
              </StepCard>
              <StepCard number={4} title="Verify Installation">
                Open Chrome/Edge and visit any HTTPS site. You should not see any certificate warnings.
              </StepCard>
            </>
          }
        />

        <BrowserSection
          name="Safari (macOS)"
          icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.12 0 2.18.23 3.14.64l-1.64 4.36c-.44.44-.64 1.02-.64 1.64 0 .62.2 1.2.54 1.66l-1.95 1.95c-.44-.44-.7-1.02-.7-1.66 0-1.12.66-2.09 1.65-2.5l1.7-1.7c-.44-.44-.7-1.02-.7-1.66 0-1.12.66-2.09 1.65-2.5l1.7-1.7C15.6 5.6 17.4 6.5 19 8.5l-1.3 3.5c-.2.2-.3.45-.3.7 0 .55.45 1 1 1h3l-1.5 3c-.2.2-.3.45-.3.7 0 .55.45 1 1 1 .2 0 .35-.05.5-.15l1.5-2.5 2 2H20l-4 4h3l2.5-2.5 1.5 2.5c.15.1.35.15.5.15.55 0 1-.45 1-1 0-.25-.1-.5-.3-.7l-1.5-3h3l1 4h-3l-1-4h-2l2.5-5 1.5 3c.1.2.25.35.45.45.2.1.45.15.7.15.55 0 1-.45 1-1 0-.25-.1-.5-.3-.7l-1.5-3c1.6-2 2.5-4.4 2.5-7.1 0-4.41-3.59-8-8-8z"/></svg>}
          steps={
            <>
              <StepCard number={1} title="Open Keychain Access">
                Press <strong>Cmd + Space</strong>, search for <strong>Keychain Access</strong>, and open it.
              </StepCard>
              <StepCard number={2} title="Import Certificate">
                Drag the <code>apsara-digital-ca.pem</code> file into the Keychain Access window.
              </StepCard>
              <StepCard number={3} title="Trust for SSL">
                Find "Apsara Digital" in the keychain. Right-click &gt; <strong>Get Info</strong>.
                Under <strong>Trust</strong>, set <strong>When using this certificate</strong> to <strong>Always Trust</strong>.
              </StepCard>
              <StepCard number={4} title="Test in Safari">
                Open Safari and visit an HTTPS site. Safari should load it without errors.
              </StepCard>
            </>
          }
        />
      </div>

      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Certificate Installed?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">
            Once you have installed and trusted the CA certificate, your browser will trust
            certificates generated by this proxy, allowing you to inspect HTTPS traffic.
          </p>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setCertInstalled(!certInstalled)}
            >
              {certInstalled ? '✓ Certificate Trusted' : 'Mark as Installed'}
            </Button>
            <span className="text-sm text-muted-foreground">
              After installation, start the proxy and configure your browser to use{' '}
              <code className="bg-muted px-2 py-1 rounded">http://localhost:8888</code>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}