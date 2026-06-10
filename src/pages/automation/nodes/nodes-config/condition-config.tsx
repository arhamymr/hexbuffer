'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NODE_TYPE_REGISTRY } from '../../constants';
import type { ConditionConfig } from '../../types';

export const OPERATOR_LABELS: Record<string, string> = {
  equals: 'Equals',
  not_equals: 'Not equals',
  contains: 'Contains',
  gt: 'Greater than',
  lt: 'Less than',
  regex: 'Regex',
};

export function placeholderForCondition(type: ConditionConfig['conditionType']): string {
  switch (type) {
    case 'condition:status-code': return 'e.g. 500';
    case 'condition:url-contains': return 'e.g. /api';
    case 'condition:body-contains': return 'e.g. password';
    case 'condition:header-exists': return 'e.g. X-API-Key';
    case 'condition:severity': return 'e.g. high';
    case 'condition:ai-confidence': return 'e.g. 80';
    case 'condition:method': return 'e.g. GET';
    case 'condition:content-type': return 'e.g. application/json';
    case 'condition:response-size': return 'e.g. 1024';
    case 'condition:crawl-status': return 'e.g. error';
    case 'condition:grep-match': return 'e.g. password:\\s*(.+)';
    case 'condition:port-open': return 'e.g. 443';
    default: return '';
  }
}

interface ConditionConfigFormProps {
  config: ConditionConfig;
  onChange: (patch: Partial<ConditionConfig>) => void;
}

export function ConditionConfigForm({ config, onChange }: ConditionConfigFormProps) {
  const showValue = config.conditionType !== 'condition:header-exists';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Condition type</Label>
        <p className="text-xs text-muted-foreground">
          {NODE_TYPE_REGISTRY[config.conditionType]?.label ?? config.conditionType}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">Operator</Label>
        <Select
          value={config.operator}
          onValueChange={(v) => onChange({ operator: v as ConditionConfig['operator'] })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showValue && (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Value</Label>
          <Input
            className="h-7 text-xs"
            value={config.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder={placeholderForCondition(config.conditionType)}
          />
        </div>
      )}
    </div>
  );
}
