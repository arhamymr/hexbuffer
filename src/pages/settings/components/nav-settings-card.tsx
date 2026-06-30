import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { allNavItems } from '@/layout/constants';
import { useAppSettingsStore } from '@/stores/app-settings-store';

export function NavSettingsCard() {
  const hiddenNavItems = useAppSettingsStore((s) => s.hiddenNavItems);
  const toggleNavItem = useAppSettingsStore((s) => s.toggleNavItem);
  const resetHiddenNavItems = useAppSettingsStore((s) => s.resetHiddenNavItems);

  const hasHiddenItems = hiddenNavItems.length > 0;

  return (
    <div className="divide-y">
      {allNavItems.map((item) => {
        const Icon = item.icon;
        const isHidden = hiddenNavItems.includes(item.href);

        return (
          <div
            key={item.href}
            className="flex items-center justify-between gap-4 px-4 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <Label
                htmlFor={`nav-toggle-${item.href}`}
                className="cursor-pointer text-sm font-normal truncate"
              >
                {item.label}
              </Label>
            </div>
            <Switch
              id={`nav-toggle-${item.href}`}
              checked={!isHidden}
              onCheckedChange={() => toggleNavItem(item.href)}
            />
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Reset visibility</p>
          <p className="text-xs text-muted-foreground">
            Restore all hidden navigation items to their defaults.
          </p>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={resetHiddenNavItems}
          disabled={!hasHiddenItems}
        >
          <ArrowCounterClockwiseIcon className="mr-1.5 size-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}
