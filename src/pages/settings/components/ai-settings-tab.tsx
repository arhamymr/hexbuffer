import { PlayIcon, SaveIcon, SquareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AI_API_KEY_PLACEHOLDERS,
  AI_MODEL_OPTIONS_BY_PROVIDER,
  AI_PROVIDER_OPTIONS,
} from '../constants';
import type { SettingsPageState } from '../hooks/use-settings-page';

interface AiSettingsTabProps {
  settings: SettingsPageState;
}

export function AiSettingsTab({ settings }: AiSettingsTabProps) {
  const {
    aiSettings,
    aiSettingsLoading,
    aiSettingsSaving,
    handleClearAiApiKey,
    handleSaveAiSettings,
    handleStartMastra,
    handleStopMastra,
    handleToggleMastra,
    mastraBusy,
    mastraStatus,
    updateAiProvider,
    updateAiSettings,
  } = settings;

  const selectedProvider = AI_PROVIDER_OPTIONS.find((provider) => provider.id === aiSettings.provider);
  const selectedProviderLabel = selectedProvider?.label ?? 'AI';
  const modelOptions = AI_MODEL_OPTIONS_BY_PROVIDER[aiSettings.provider] ?? [];

  return (
    <>
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
                onValueChange={updateAiProvider}
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
                  {modelOptions.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-api-key">{selectedProviderLabel} API Key</Label>
            <Input
              id="ai-api-key"
              type="password"
              value={aiSettings.apiKey}
              onChange={(event) => updateAiSettings({ apiKey: event.target.value })}
              placeholder={AI_API_KEY_PLACEHOLDERS[aiSettings.provider] ?? 'API key'}
              disabled={aiSettingsLoading}
            />
            <p className="text-xs text-muted-foreground">
              {aiSettings.hasApiKey
                ? 'A key is stored in your OS keychain. Enter a new value only if you want to replace it.'
                : 'No key is stored yet. Provider and model are saved locally; API keys are kept in your OS keychain.'}
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
    </>
  );
}
