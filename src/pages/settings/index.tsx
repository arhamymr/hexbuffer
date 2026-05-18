'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { DownloadIcon, SettingsIcon, ShieldCheckIcon } from 'lucide-react';
import {
  HOW_IT_WORKS,
  INSTALLATION_GUIDES,
  SECURITY_NOTICE_ICON,
  TROUBLESHOOTING_GUIDES,
} from './constants';
import { useSettingsPage } from './hooks/use-settings-page';

export function Settings() {
  const { downloading, handleDownloadCert } = useSettingsPage();
  const SecurityNoticeIcon = SECURITY_NOTICE_ICON;

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
            <SecurityNoticeIcon className="size-4" />
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
              <CardDescription>
                Understanding the certificate-based proxy mechanism
              </CardDescription>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
