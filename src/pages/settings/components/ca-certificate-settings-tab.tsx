import { DownloadSimpleIcon, KeyIcon, ArrowClockwiseIcon } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  HOW_IT_WORKS,
  INSTALLATION_GUIDES,
  SECURITY_NOTICE_ICON,
  TROUBLESHOOTING_GUIDES,
} from '../constants';
import type { SettingsPageState } from '../hooks/use-settings-page';
import { SettingsGroup } from './settings-group';

interface CaCertificateSettingsTabProps {
  settings: SettingsPageState;
}

export function CaCertificateSettingsTab({ settings }: CaCertificateSettingsTabProps) {
  const {
    downloading,
    handleDownloadCert,
    handleInstallMacCert,
    installingCa,
    handleRegenerateCert,
    regeneratingCa,
  } = settings;
  const SecurityNoticeIcon = SECURITY_NOTICE_ICON;

  return (
    <>
      <Alert>
        <SecurityNoticeIcon className="size-4" />
        <AlertTitle>Important Security Notice</AlertTitle>
        <AlertDescription>
          Open Browser uses an isolated Chrome profile. Install the CA only when you want to intercept
          HTTPS traffic from external browsers or apps.
        </AlertDescription>
      </Alert>

      <SettingsGroup label="Certificate Actions" description="Manage the CA certificate for external browsers and apps.">
        <div className="flex flex-wrap gap-2 px-4 py-3">
          <Button onClick={handleInstallMacCert} disabled={installingCa}>
            <KeyIcon className="mr-1.5 size-4" />
            {installingCa ? 'Installing…' : 'Install to macOS Keychain'}
          </Button>
          <Button variant="outline" onClick={handleDownloadCert} disabled={downloading}>
            <DownloadSimpleIcon className="mr-1.5 size-4" />
            {downloading ? 'Saving…' : 'Download CA Certificate'}
          </Button>
          <Button variant="outline" onClick={handleRegenerateCert} disabled={regeneratingCa}>
            <ArrowClockwiseIcon className="mr-1.5 size-4" />
            {regeneratingCa ? 'Regenerating…' : 'Regenerate CA'}
          </Button>
        </div>
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground">
            Use Open Browser for the managed Chrome profile. Install or save the CA only for external
            browsers and apps.
          </p>
        </div>
      </SettingsGroup>

      <SettingsGroup label="Installation Guides" description="Follow the steps for your browser or device.">
        <div className="px-4 py-2">
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
        </div>
      </SettingsGroup>

      <SettingsGroup label="How It Works" description="Understanding the certificate-based proxy mechanism.">
        <div className="px-4 py-3">
          <div className="space-y-3 text-sm text-muted-foreground">
            {HOW_IT_WORKS.map((item) => (
              <p key={item.title}>
                <strong>{item.title}:</strong> {item.body}
              </p>
            ))}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup label="Troubleshooting" description="Common issues and solutions.">
        <div className="px-4 py-2">
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
        </div>
      </SettingsGroup>
    </>
  );
}
