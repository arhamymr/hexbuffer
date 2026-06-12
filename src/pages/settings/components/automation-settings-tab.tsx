import { RotateCcwIcon, WorkflowIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAutomationStore } from '@/stores/automation';
import {
  AUTOMATION_SETTINGS_LIMITS,
  DEFAULT_AUTOMATION_SETTINGS,
} from '@/stores/automation/constants';
import type { AutomationRuntimeSettings } from '@/stores/automation';

interface AutomationNumberSettingProps {
  id: keyof AutomationRuntimeSettings;
  label: string;
  description: string;
  value: number;
  onChange: (id: keyof AutomationRuntimeSettings, value: number) => void;
}

function AutomationNumberSetting({
  id,
  label,
  description,
  value,
  onChange,
}: AutomationNumberSettingProps) {
  const limits = AUTOMATION_SETTINGS_LIMITS[id];

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px] md:items-center">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          Range: {limits.min} - {limits.max}
        </p>
      </div>
      <Input
        id={id}
        type="number"
        min={limits.min}
        max={limits.max}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(id, Number(event.target.value))}
      />
    </div>
  );
}

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
    automationSettings.recentMatchDedupeTtlMs === DEFAULT_AUTOMATION_SETTINGS.recentMatchDedupeTtlMs;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <WorkflowIcon className="size-5 text-primary" />
          <CardTitle>Automation Runtime</CardTitle>
        </div>
        <CardDescription>
          Tune live-traffic workflow scheduling, queue pressure, and duplicate suppression.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AutomationNumberSetting
          id="liveTrafficConcurrency"
          label="Live traffic concurrency"
          description="Maximum number of live-traffic workflow runs processing at the same time."
          value={automationSettings.liveTrafficConcurrency}
          onChange={updateNumberSetting}
        />
        <AutomationNumberSetting
          id="filteredTriggerQueueCap"
          label="Filtered trigger queue cap"
          description="Maximum pending matched requests per live-traffic trigger when a host, method, or URL filter is set."
          value={automationSettings.filteredTriggerQueueCap}
          onChange={updateNumberSetting}
        />
        <AutomationNumberSetting
          id="catchAllTriggerQueueCap"
          label="Catch-all trigger queue cap"
          description="Maximum pending matched requests per live-traffic trigger when all filters are blank."
          value={automationSettings.catchAllTriggerQueueCap}
          onChange={updateNumberSetting}
        />
        <AutomationNumberSetting
          id="recentMatchDedupeTtlMs"
          label="Duplicate suppression window"
          description="Milliseconds to ignore duplicate live-traffic events with the same trigger, request id, method, status, host, and path. Use 0 to disable."
          value={automationSettings.recentMatchDedupeTtlMs}
          onChange={updateNumberSetting}
        />
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            size="xs"
            variant="outline"
            onClick={resetAutomationSettings}
            disabled={isDefault}
          >
            <RotateCcwIcon className="mr-2 size-4" />
            Reset Automation Settings
          </Button>
          <p className="text-xs text-muted-foreground">
            Changes are saved automatically and apply to new live-traffic scheduling decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
