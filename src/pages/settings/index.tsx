'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { BotIcon, DownloadIcon, PlayIcon, SaveIcon, SettingsIcon, ShieldCheckIcon, SquareIcon } from 'lucide-react';
import {
  AI_MODEL_OPTIONS,
  AI_PROVIDER_OPTIONS,
  HOW_IT_WORKS,
  INSTALLATION_GUIDES,
  SECURITY_NOTICE_ICON,
  TROUBLESHOOTING_GUIDES,
} from './constants';
import { useSettingsPage } from './hooks/use-settings-page';

export function Settings() {
  const {
    aiSettings,
    aiSettingsLoading,
    aiSettingsSaving,
    downloading,
    handleClearAiApiKey,
    handleDownloadCert,
    handleSaveAiSettings,
    handleStartMastra,
    handleStopMastra,
    handleToggleMastra,
    mastraBusy,
    mastraStatus,
    updateAiSettings,
  } = useSettingsPage();
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
            <TabsTrigger value="ai">
              <BotIcon className="mr-2 size-4" />
              AI
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

        <TabsContent value="ai" className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Provider</CardTitle>
              <CardDescription>
                Configure BYOK and the model used by the AppRecon AI workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">Provider</Label>
                  <Select
                    value={aiSettings.provider}
                    onValueChange={(provider) => updateAiSettings({ provider })}
                    disabled={aiSettingsLoading}
                  >
                    <SelectTrigger id="ai-provider" className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDER_OPTIONS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-model">Model</Label>
                  <Select
                    value={aiSettings.model}
                    onValueChange={(model) => updateAiSettings({ model })}
                    disabled={aiSettingsLoading}
                  >
                    <SelectTrigger id="ai-model" className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODEL_OPTIONS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-api-key">OpenAI API Key</Label>
                <Input
                  id="ai-api-key"
                  type="password"
                  value={aiSettings.apiKey}
                  onChange={(event) => updateAiSettings({ apiKey: event.target.value })}
                  placeholder="sk-..."
                  disabled={aiSettingsLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {aiSettings.hasApiKey
                    ? 'A key is stored in your OS keychain. Enter a new value only if you want to replace it.'
                    : 'No key is stored yet.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="xs" onClick={handleSaveAiSettings} disabled={aiSettingsLoading || aiSettingsSaving}>
                  <SaveIcon className="mr-2 size-4" />
                  {aiSettingsSaving ? 'Saving...' : 'Save AI Settings'}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleClearAiApiKey}
                  disabled={aiSettingsLoading || aiSettingsSaving || !aiSettings.hasApiKey}
                >
                  Clear API Key
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mastra Runtime</CardTitle>
              <CardDescription>
                Start the local Mastra workflow server automatically when AppRecon starts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mastra-url">Mastra URL</Label>
                <Input
                  id="mastra-url"
                  value={aiSettings.mastraUrl}
                  onChange={(event) => updateAiSettings({ mastraUrl: event.target.value })}
                  placeholder="http://localhost:4111"
                  disabled={aiSettingsLoading}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <Label htmlFor="mastra-enabled">Mastra runtime</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enable the local Mastra workflow server for AppRecon.
                  </p>
                </div>
                <Switch
                  id="mastra-enabled"
                  checked={aiSettings.mastraAutoStart && mastraStatus.running}
                  onCheckedChange={handleToggleMastra}
                  disabled={aiSettingsLoading || mastraBusy}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs" onClick={handleStartMastra} disabled={mastraBusy || mastraStatus.running}>
                  <PlayIcon className="mr-2 size-4" />
                  Start Mastra
                </Button>
                <Button size="xs" variant="outline" onClick={handleStopMastra} disabled={mastraBusy || !mastraStatus.running}>
                  <SquareIcon className="mr-2 size-4" />
                  Stop Mastra
                </Button>
                <span className="text-sm text-muted-foreground">
                  {mastraStatus.running
                    ? `Running${mastraStatus.pid ? `, PID ${mastraStatus.pid}` : ''}`
                    : 'Stopped'}
                </span>
              </div>
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
                <Button size="xs" onClick={handleDownloadCert} disabled={downloading} className="w-fit">
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
