'use client';

import React from 'react';
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
import type { ActionConfig } from '../../types';

export interface ActionParams {
  params: Record<string, string>;
  updateParam: (key: string, value: string) => void;
}

export function useActionParams(
  config: ActionConfig,
  onChange: (patch: Partial<ActionConfig>) => void
): ActionParams {
  const params = config.params ?? {};
  const updateParam = (key: string, value: string) => {
    onChange({ params: { ...params, [key]: value } });
  };
  return { params, updateParam };
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">{label}</Label>
      <Input
        className="h-7 text-xs"
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">{label}</Label>
      <Textarea
        className="min-h-20 resize-none text-xs"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  fallback,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">{label}</Label>
      <Select value={value || fallback} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BooleanField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectField
      label={label}
      value={value}
      fallback={fallback}
      onChange={onChange}
      options={[
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ]}
    />
  );
}

export const REQUEST_SOURCE_OPTIONS = [
  { value: 'request', label: 'Request' },
  { value: 'response', label: 'Response' },
  { value: 'payload', label: 'Full payload' },
  { value: 'body', label: 'Body' },
];
