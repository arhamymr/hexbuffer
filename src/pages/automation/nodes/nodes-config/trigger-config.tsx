'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NODE_TYPE_REGISTRY } from '../../constants';
import type { TriggerConfig } from '../../types';

interface TriggerConfigFormProps {
  config: TriggerConfig;
  onChange: (patch: Partial<TriggerConfig>) => void;
}

export function TriggerConfigForm({ config, onChange }: TriggerConfigFormProps) {
  const isScheduled = config.triggerType === 'trigger:scheduled';
  const isManual = config.triggerType === 'trigger:manual';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Trigger type</Label>
        <p className="text-xs text-muted-foreground">
          {NODE_TYPE_REGISTRY[config.triggerType]?.label ?? config.triggerType}
        </p>
      </div>

      {isScheduled && (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Cron schedule</Label>
          <div className="relative">
            <Clock className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-7 pl-7 text-xs"
              value={config.schedule ?? ''}
              onChange={(e) => onChange({ schedule: e.target.value })}
              placeholder="0 */6 * * *"
            />
          </div>
        </div>
      )}

      {isManual && (
        <p className="text-xs text-muted-foreground">
          This trigger fires when you manually execute the workflow.
        </p>
      )}
    </div>
  );
}
