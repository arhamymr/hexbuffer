import * as React from 'react';
import { AlertTriangleIcon, CheckIcon, EyeIcon, EyeOffIcon, SaveIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    providerKeyStatus,
    updateAiProvider,
    updateAiSettings,
  } = settings;

  const selectedProvider = AI_PROVIDER_OPTIONS.find((provider) => provider.id === aiSettings.provider);
  const selectedProviderLabel = selectedProvider?.label ?? 'AI';
  const modelOptions = AI_MODEL_OPTIONS_BY_PROVIDER[aiSettings.provider] ?? [];
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [apiKeyInput, setApiKeyInput] = React.useState(aiSettings.apiKey);
  const isSavingNewApiKey = apiKeyInput.trim().length > 0;
  const canSaveAiSettings = !isSavingNewApiKey || aiSettings.allowThirdPartyAiSharing;

  React.useEffect(() => {
    setApiKeyInput(aiSettings.apiKey);
    setShowApiKey(false);
  }, [aiSettings.apiKey, aiSettings.provider]);

  const handleApiKeyChange = (value: string) => {
    setApiKeyInput(value);
    updateAiSettings({ apiKey: value });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>
            Configure BYOK and the model used by the hexbuffer AI workflow.
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
            <div className="relative">
              <Input
                id="ai-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(event) => handleApiKeyChange(event.target.value)}
                placeholder={
                  aiSettings.hasApiKey && !aiSettings.apiKey
                    ? '••••••••••••••••••••••••'
                    : (AI_API_KEY_PLACEHOLDERS[aiSettings.provider] ?? 'API key')
                }
                disabled={aiSettingsLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showApiKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {aiSettings.hasApiKey
                ? 'A key is saved in your OS credential store. Enter a new value only if you want to replace it.'
                : 'No readable key is saved yet. Provider and model are saved locally; API keys are kept in the OS credential store.'}
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
            <Checkbox
              checked={aiSettings.allowThirdPartyAiSharing}
              onCheckedChange={(checked) => updateAiSettings({ allowThirdPartyAiSharing: checked === true })}
              disabled={aiSettingsLoading}
            />
            <span className="min-w-0 space-y-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangleIcon className="size-4 text-amber-600" />
                Allow third-party AI data sharing
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Optional AI features may send selected prompts, chat messages, crawl context, page summaries,
                logs, insights, URLs, and analysis context to {selectedProviderLabel}. Do not enable this for
                sensitive data unless you are authorized to share it.
              </span>
            </span>
          </label>

          {!canSaveAiSettings && (
            <p className="text-xs text-amber-700">
              Enable third-party AI data sharing before saving or using an API key.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              size="xs"
              onClick={handleSaveAiSettings}
              disabled={aiSettingsLoading || aiSettingsSaving || !canSaveAiSettings}
            >
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

          <div className="space-y-2">
            <Label>Saved Keys</Label>
            <div className="grid gap-2">
              {AI_PROVIDER_OPTIONS.map((provider) => {
                const saved = !!providerKeyStatus[provider.id];
                return (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{provider.label}</span>
                    <span className={`flex items-center gap-1.5 text-xs ${saved ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {saved ? (
                        <>
                          <CheckIcon className="size-3.5" />
                          Key saved
                        </>
                      ) : (
                        <>
                          <XIcon className="size-3.5" />
                          No key
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
