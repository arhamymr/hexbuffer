import React from 'react';
import { Globe, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TriggerConfig } from '../../types';

export const OPERATOR_OPTIONS: { value: NonNullable<TriggerConfig['operator']>; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'regex', label: 'Regex' },
];

export const METHOD_OPTIONS = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const DIRECTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
];

export function HttpMethodFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">Method</Label>
      <Select value={value?.trim() ? value.toUpperCase() : 'ANY'} onValueChange={(v) => onChange(v === 'ANY' ? undefined : v)}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {METHOD_OPTIONS.map((method) => (
            <SelectItem key={method} value={method} className="text-xs">
              {method}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function HostWhitelistFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">
        <Globe className="size-3 inline mr-1" />
        Host whitelist
      </Label>
      <Textarea
        className="min-h-20 resize-none text-xs"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'example.com\nhttps://app.example.com\napi.example.com:443\n*.target.local'}
      />
      <p className="text-[10px] text-muted-foreground">
        Enter hostnames, full URLs, optional ports, or wildcard domains.
      </p>
    </div>
  );
}

export function UrlPatternFilter({
  operator,
  value,
  onOperatorChange,
  onValueChange,
}: {
  operator: string | undefined;
  value: string | undefined;
  onOperatorChange: (v: string) => void;
  onValueChange: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Operator</Label>
        <Select value={operator ?? 'contains'} onValueChange={onOperatorChange}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATOR_OPTIONS.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-xs">
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Value</Label>
        <Input
          className="h-7 text-xs"
          value={value ?? ''}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="e.g. /api/login (blank = match all)"
        />
      </div>
    </>
  );
}

export function TriggerInfoPanel({
  icon: Icon,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
      <Info className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
