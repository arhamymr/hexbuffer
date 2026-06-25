import { RotateCcwIcon, MenuIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MenuIcon className="size-5 text-primary" />
          <CardTitle>Navigation</CardTitle>
        </div>
        <CardDescription>
          Toggle visibility of top navigation menu items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {allNavItems.map((item) => {
          const Icon = item.icon;
          const isHidden = hiddenNavItems.includes(item.href);

          return (
            <div
              key={item.href}
              className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
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
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={resetHiddenNavItems}
            disabled={!hasHiddenItems}
          >
            <RotateCcwIcon className="mr-2 size-4" />
            Reset Navigation
          </Button>
          <p className="text-xs text-muted-foreground">
            Restore all hidden navigation items to their default visibility.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
