import * as React from 'react';
import { cn } from '@/lib/utils';

interface SettingsGroupProps {
  label?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Renders a macOS-style settings group: a bordered container
 * with label + description header area and children below.
 */
export function SettingsGroup({ label, description, children, className }: SettingsGroupProps) {
  return (
    <section className={cn('space-y-2', className)}>
      {(label || description) && (
        <div className="px-1">
          {label && (
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border bg-card">{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * A single row within a SettingsGroup.
 * Label + optional description on the left, control on the right.
 */
export function SettingsRow({ label, description, children, className }: SettingsRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-6 px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

interface SettingsRowSeparatorProps {
  className?: string;
}

export function SettingsRowSeparator({ className }: SettingsRowSeparatorProps) {
  return <div className={cn('mx-4 border-t', className)} />;
}
