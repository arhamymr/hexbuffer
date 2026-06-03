import { DownloadIcon, KeyRoundIcon, ShieldCheckIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HOW_IT_WORKS,
  INSTALLATION_GUIDES,
  SECURITY_NOTICE_ICON,
  TROUBLESHOOTING_GUIDES,
} from '../constants';
import type { SettingsPageState } from '../hooks/use-settings-page';

interface CaCertificateSettingsTabProps {
  settings: SettingsPageState;
}

export function CaCertificateSettingsTab({ settings }: CaCertificateSettingsTabProps) {
  const {
    downloading,
    handleDownloadCert,
    handleInstallMacCert,
    installingCa,
  } = settings;
  const SecurityNoticeIcon = SECURITY_NOTICE_ICON;

  return (
    <>
      <Alert>
        <SecurityNoticeIcon className="size-4" />
        <AlertTitle>Important Security Notice</AlertTitle>
        <AlertDescription>
          Open Browser uses an isolated Chrome profile managed by 0xbuffer. Install the 0xbuffer CA only
          when you want to intercept HTTPS traffic from external browsers or apps.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            <CardTitle>CA Certificate</CardTitle>
          </div>
          <CardDescription>
            Download or install the CA certificate for external browsers and apps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button size="xs" onClick={handleInstallMacCert} disabled={installingCa} className="w-fit">
                <KeyRoundIcon className="mr-2 size-4" />
                {installingCa ? 'Installing...' : 'Install to macOS Keychain'}
              </Button>
              <Button size="xs" variant="outline" onClick={handleDownloadCert} disabled={downloading} className="w-fit">
                <DownloadIcon className="mr-2 size-4" />
                {downloading ? 'Saving...' : 'Save CA Certificate'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use Open Browser for the managed Chrome profile. Install or save the CA only for external browsers and apps.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installation Guides</CardTitle>
          <CardDescription>Follow the steps for your browser or device</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {INSTALLATION_GUIDES.map((guide) => (
              <AccordionItem key={guide.id} value={guide.id}>
                <AccordionTrigger>{guide.title}</AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    {guide.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {guide.note && (
                    <Alert className="mt-3">
                      <guide.note.Icon className="size-4" />
                      <AlertDescription className="text-xs">{guide.note.message}</AlertDescription>
                    </Alert>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How HTTPS Interception Works</CardTitle>
          <CardDescription>Understanding the certificate-based proxy mechanism</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            {HOW_IT_WORKS.map((item) => (
              <p key={item.title}>
                <strong>{item.title}:</strong> {item.body}
              </p>
            ))}
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
            {TROUBLESHOOTING_GUIDES.map((guide) => (
              <AccordionItem key={guide.id} value={guide.id}>
                <AccordionTrigger>{guide.title}</AccordionTrigger>
                <AccordionContent>
                  {guide.body && (
                    <p className="text-sm text-muted-foreground">{guide.body}</p>
                  )}
                  {guide.bullets && (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">
                        {guide.id === 'remove-ca' ? 'To remove the installed CA certificate:' : 'Make sure you have:'}
                      </p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {guide.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
}
