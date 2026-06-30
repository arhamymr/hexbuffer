import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAutomationStore } from '@/stores/automation';
import {
  AUTOMATION_SETTINGS_LIMITS,
  DEFAULT_AUTOMATION_SETTINGS,
} from '@/stores/automation/constants';
import type { AutomationRuntimeSettings } from '@/stores/automation';
import { SettingsGroup, SettingsRow } from './settings-group';

export function AutomationSettingsTab() {
  const automationSettings = useAutomationStore((state) => state.automationSettings);
  const updateAutomationSettings = useAutomationStore((state) => state.updateAutomationSettings);
  const resetAutomationSettings = useAutomationStore((state) => state.resetAutomationSettings);

  const updateNumberSetting = (
    id: keyof AutomationRuntimeSettings,
    value: number
  ) => {
    updateAutomationSettings({ [id]: value });
  };

  const isDefault =
    automationSettings.liveTrafficConcurrency === DEFAULT_AUTOMATION_SETTINGS.liveTrafficConcurrency &&
    automationSettings.filteredTriggerQueueCap === DEFAULT_AUTOMATION_SETTINGS.filteredTriggerQueueCap &&
    automationSettings.catchAllTriggerQueueCap === DEFAULT_AUTOMATION_SETTINGS.catchAllTriggerQueueCap &&
    automationSettings.recentMatchDedupeTtlMs === DEFAULT_AUTOMATION_SETTINGS.recentMatchDedupeTtlMs &&
    automationSettings.allowRunScriptActions === DEFAULT_AUTOMATION_SETTINGS.allowRunScriptActions;

  return (
    <SettingsGroup
      label="Runtime"
      description="Tune live-traffic workflow scheduling, queue pressure, and duplicate suppression."
    >
      <AutomationNumberRow
        id="liveTrafficConcurrency"
        label="Live traffic concurrency"
        description="Maximum number of live-traffic workflow runs processing at once."
        value={automationSettings.liveTrafficConcurrency}
        onChange={updateNumberSetting}
      />
      <AutomationNumberRow
        id="filteredTriggerQueueCap"
        label="Filtered trigger queue cap"
        description="Max pending matched requests per trigger when a host, method, or URL filter is set."
        value={automationSettings.filteredTriggerQueueCap}
        onChange={updateNumberSetting}
      />
      <AutomationNumberRow
        id="catchAllTriggerQueueCap"
        label="Catch-all trigger queue cap"
        description="Max pending matched requests when all filters are blank."
        value={automationSettings.catchAllTriggerQueueCap}
        onChange={updateNumberSetting}
      />
      <AutomationNumberRow
        id="recentMatchDedupeTtlMs"
        label="Duplicate suppression window"
        description="Milliseconds to ignore duplicate live-traffic events. 0 to disable."
        value={automationSettings.recentMatchDedupeTtlMs}
        onChange={updateNumberSetting}
      />

      <div className="px-4 py-3">
        <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <Checkbox
            id="allowRunScriptActions"
            checked={automationSettings.allowRunScriptActions}
            onCheckedChange={(checked) => {
              updateAutomationSettings({ allowRunScriptActions: checked === true });
            }}
          />
          <div className="space-y-1">
            <Label htmlFor="allowRunScriptActions">Allow local run-script actions</Label>
            <p className="text-sm text-muted-foreground">
              Enables automation workflows to execute local commands from action nodes. Keep this
              disabled unless you trust the workflow.
            </p>
          </div>
        </label>
      </div>

      <SettingsRow
        label="Reset to defaults"
        description="Changes are saved automatically and apply to new scheduling decisions."
      >
        <Button
          size="xs"
          variant="outline"
          onClick={resetAutomationSettings}
          disabled={isDefault}
        >
          <ArrowCounterClockwiseIcon className="mr-1.5 size-3.5" />
          Reset
        </Button>
      </SettingsRow>
    </SettingsGroup>
  );
}

interface AutomationNumberRowProps {
  id: keyof AutomationRuntimeSettings;
  label: string;
  description: string;
  value: number;
  onChange: (id: keyof AutomationRuntimeSettings, value: number) => void;
}

function AutomationNumberRow({
  id,
  label,
  description,
  value,
  onChange,
}: AutomationNumberRowProps) {
  const limits = AUTOMATION_SETTINGS_LIMITS[id];

  return (
    <SettingsRow
      label={label}
      description={`${description} Range: ${limits.min}–${limits.max}`}
    >
      <Input
        id={id}
        type="number"
        min={limits.min}
        max={limits.max}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(id, Number(event.target.value))}
        className="w-28"
      />
    </SettingsRow>
  );
}
