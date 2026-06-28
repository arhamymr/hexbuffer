import { CrosshairIcon, FilePlusIcon, FloppyDiskIcon, ShieldCheckIcon, TrashIcon } from '@phosphor-icons/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SettingsPageState } from '../hooks/use-settings-page';

interface ThreatsSettingsTabProps {
  settings: SettingsPageState;
}

export function ThreatsSettingsTab({ settings }: ThreatsSettingsTabProps) {
  const {
    ghidraValidation,
    handleDeleteYaraRulePack,
    handleImportYaraRulePack,
    handleSaveThreatSettings,
    handleToggleYaraRulePack,
    handleValidateGhidra,
    threatSettings,
    threatSettingsSaving,
    updateThreatSettings,
  } = settings;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-5 text-primary" />
          <CardTitle>Threats</CardTitle>
        </div>
        <CardDescription>Configure reverse-engineering engines used by the Threats workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid max-w-2xl gap-2">
          <Label htmlFor="ghidra-headless-path">Ghidra analyzeHeadless path</Label>
          <Input
            id="ghidra-headless-path"
            value={threatSettings.ghidraHeadlessPath ?? ''}
            placeholder="/path/to/ghidra/support/analyzeHeadless"
            onChange={(event) => updateThreatSettings({ ghidraHeadlessPath: event.target.value })}
          />
        </div>

        {ghidraValidation && (
          <Alert variant={ghidraValidation.valid ? 'default' : 'destructive'}>
            <CrosshairIcon className="size-4" />
            <AlertTitle>{ghidraValidation.valid ? 'Ghidra Ready' : 'Ghidra Unavailable'}</AlertTitle>
            <AlertDescription>{ghidraValidation.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleValidateGhidra} variant="outline">
            <CrosshairIcon className="mr-2 size-4" />
            Validate
          </Button>
          <Button onClick={handleSaveThreatSettings} disabled={threatSettingsSaving}>
            <FloppyDiskIcon className="mr-2 size-4" />
            {threatSettingsSaving ? 'Saving...' : 'FloppyDiskIcon'}
          </Button>
        </div>

        <div className="max-w-3xl space-y-2 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">YARA rule packs</h3>
              <p className="text-xs text-muted-foreground">
                Imported rules are copied into app-managed storage and used during Threats analysis.
              </p>
            </div>
            <Button variant="outline" onClick={handleImportYaraRulePack}>
              <FilePlusIcon className="mr-2 size-4" />
              Import Rules
            </Button>
          </div>

          <div className="overflow-hidden rounded-md border">
            {threatSettings.yaraRulePacks.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No YARA rule packs imported.
              </div>
            ) : (
              <div className="divide-y">
                {threatSettings.yaraRulePacks.map((pack) => (
                  <div key={pack.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`yara-pack-${pack.id}`}
                          checked={pack.enabled}
                          onCheckedChange={(checked) => handleToggleYaraRulePack(pack.id, checked === true)}
                        />
                        <Label htmlFor={`yara-pack-${pack.id}`} className="truncate text-xs font-medium">
                          {pack.name}
                        </Label>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{pack.path}</div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteYaraRulePack(pack.id)}
                      aria-label={`Delete ${pack.name}`}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
