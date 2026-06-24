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
import { defaultDataPathForCondition } from '../../lib/condition-evaluator';
import { getNodeDataSchema } from '../../lib/node-capabilities';
import type { ConditionConfig, ConditionType } from '../../types';

export const OPERATOR_LABELS: Record<string, string> = {
  equals: 'Equals',
  not_equals: 'Not equals',
  contains: 'Contains',
  gt: 'Greater than',
  lt: 'Less than',
  regex: 'Regex',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectJsonPaths(value: unknown, prefix = '', depth = 0): string[] {
  if (!isRecord(value) || depth > 3) return [];

  return Object.keys(value).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...collectJsonPaths(value[key], path, depth + 1)];
  });
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter((path) => path.trim().length > 0)));
}

function getSuggestedDataPaths(
  type: ConditionType,
  inputData: unknown
): { value: string; label: string }[] {
  const schemaPaths = getNodeDataSchema(type)?.input.map((field) => field.key) ?? [];
  const runtimePaths = collectJsonPaths(inputData);

  return uniquePaths([
    defaultDataPathForCondition(type),
    ...schemaPaths,
    ...runtimePaths,
  ]).map((path) => ({ value: path, label: path }));
}

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
  inputData?: unknown;
}

export function ConditionConfigForm({ config, onChange, inputData }: ConditionConfigFormProps) {
  const showValue = config.conditionType !== 'condition:header-exists';
  const dataPath = config.dataPath ?? defaultDataPathForCondition(config.conditionType);
  const dataPathOptions = getSuggestedDataPaths(config.conditionType, inputData);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Condition type</Label>
        <p className="text-xs text-muted-foreground">
          {NODE_TYPE_REGISTRY[config.conditionType]?.label ?? config.conditionType}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">Data key</Label>
        <Select
          value={dataPathOptions.some((option) => option.value === dataPath) ? dataPath : undefined}
          onValueChange={(v) => onChange({ dataPath: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select JSON key" />
          </SelectTrigger>
          <SelectContent>
            {dataPathOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs font-mono">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="h-7 font-mono text-xs"
          value={dataPath}
          onChange={(e) => onChange({ dataPath: e.target.value })}
          placeholder="e.g. response.headers.content-type"
        />
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
