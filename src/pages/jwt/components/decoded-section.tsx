import * as React from 'react';
import { Label } from '@/components/ui/label';
import { formatTimestamp } from '../lib/jwt-helpers';

const TIMESTAMP_KEYS = new Set(['iat', 'exp', 'nbf']);

function valueType(value: unknown): 'string' | 'number' | 'boolean' | 'null' | 'object' {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'object';
}

const TYPE_COLORS: Record<string, string> = {
  string: 'text-green-400 dark:text-green-300',
  number: 'text-amber-400 dark:text-amber-300',
  boolean: 'text-purple-400 dark:text-purple-300',
  null: 'text-gray-400 dark:text-gray-500',
  object: 'text-cyan-400 dark:text-cyan-300',
};

function ColorizedValue({ value }: { value: unknown }) {
  const type = valueType(value);

  if (type === 'object') {
    return (
      <span className="font-mono break-all text-[11px] opacity-85">
        {JSON.stringify(value)}
      </span>
    );
  }

  if (type === 'null') {
    return <span className={TYPE_COLORS.null}>null</span>;
  }

  if (type === 'boolean') {
    return <span className={TYPE_COLORS.boolean}>{String(value)}</span>;
  }

  return (
    <span className={`font-mono break-all ${TYPE_COLORS[type] ?? ''}`}>
      {String(value)}
    </span>
  );
}

interface DecodedSectionProps {
  title: string;
  data: Record<string, unknown>;
}

export function DecodedSection({ title, data }: DecodedSectionProps) {
  return (
    <div>
      <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
        {title}
      </Label>
      <div className="mt-1 space-y-0.5">
        {Object.entries(data).map(([key, value]) => {
          const isTimestamp =
            TIMESTAMP_KEYS.has(key) && typeof value === 'number';
          const timestampStr = isTimestamp ? formatTimestamp(value) : null;

          return (
            <div key={key} className="flex items-baseline gap-2 text-xs">
              <span className="font-mono text-blue-400 dark:text-blue-300 shrink-0">
                {key}
              </span>
              <span className="font-mono text-muted-foreground shrink-0">:</span>
              {isTimestamp && timestampStr ? (
                <span className="text-xs text-muted-foreground italic">
                  {timestampStr}
                </span>
              ) : (
                <ColorizedValue value={value} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
