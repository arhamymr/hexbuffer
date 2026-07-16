import * as React from 'react';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { mainNavItems } from '@/layout/constants';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowCounterClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// ponytail: static config for desktop widgets to keep it simple and light
const WIDGETS = [
  { id: 'collections', label: 'Collections Widget', description: 'Access request collections quickly.' },
  { id: 'proxy', label: 'Proxy Widget', description: 'Monitor and control the local proxy listener.' },
  { id: 'vpn', label: 'VPN Widget', description: 'Manage OpenVPN configuration files and connect.' },
  { id: 'scratchpad', label: 'Scratchpad Widget', description: 'Write down quick notes or scripts.' },
  { id: 'clipboard', label: 'Clipboard Widget', description: 'Capture system clipboard history.' },
];

export function ShortcutManager() {
  const hiddenNavItems = useAppSettingsStore((s) => s.hiddenNavItems);
  const toggleNavItem = useAppSettingsStore((s) => s.toggleNavItem);
  const resetHiddenNavItems = useAppSettingsStore((s) => s.resetHiddenNavItems);

  const hiddenWidgets = useAppSettingsStore((s) => s.hiddenWidgets || []);
  const toggleWidget = useAppSettingsStore((s) => s.toggleWidget);
  const resetHiddenWidgets = useAppSettingsStore((s) => s.resetHiddenWidgets);

  const [searchQuery, setSearchQuery] = React.useState('');

  const itemsToManage = React.useMemo(() => {
    return mainNavItems.filter((item) => item.label !== 'Desktop');
  }, []);

  const filteredItems = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    return itemsToManage.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query)
    );
  }, [searchQuery, itemsToManage]);

  const hasHiddenItems = hiddenNavItems.length > 0 || hiddenWidgets.length > 0;

  const handleResetAll = React.useCallback(() => {
    resetHiddenNavItems();
    resetHiddenWidgets();
  }, [resetHiddenNavItems, resetHiddenWidgets]);

  return (
    <div className="flex flex-col gap-4 select-none text-left">
      <Accordion type="multiple" defaultValue={['shortcuts', 'widgets']} className="w-full">
        <AccordionItem value="shortcuts" className="border-b border-border/40">
          <AccordionTrigger className="hover:no-underline py-2.5">
            <div className="flex items-center justify-between flex-1 mr-2">
              <span className="text-xs font-mono font-bold tracking-wider text-muted-foreground uppercase">
                Shortcuts
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-normal normal-case">
                {filteredItems.length} available
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3.5 space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/40"
              />
            </div>

            <div className="border border-border/60 rounded-md divide-y divide-border/40 max-h-[220px] overflow-y-auto scrollbar-thin bg-background">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isHidden = hiddenNavItems.includes(item.href);
                  return (
                    <div
                      key={item.href}
                      className="flex items-center justify-between gap-4 p-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1 rounded-sm border ${item.colors?.bg ?? 'bg-muted'} text-white shrink-0`}>
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <Label
                            htmlFor={`shortcut-toggle-${item.href}`}
                            className="cursor-pointer text-xs font-medium truncate block"
                          >
                            {item.label}
                          </Label>
                          {item.description && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Switch
                        id={`shortcut-toggle-${item.href}`}
                        checked={!isHidden}
                        onCheckedChange={() => toggleNavItem(item.href)}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching shortcuts
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="widgets" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-2.5">
            <span className="text-xs font-mono font-bold tracking-wider text-muted-foreground uppercase">
              Desktop Widgets
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3.5">
            <div className="border border-border/60 rounded-md divide-y divide-border/40 bg-background">
              {WIDGETS.map((widget) => {
                const isHidden = hiddenWidgets.includes(widget.id);
                return (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between gap-4 p-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <Label
                        htmlFor={`widget-toggle-${widget.id}`}
                        className="cursor-pointer text-xs font-medium block"
                      >
                        {widget.label}
                      </Label>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">
                        {widget.description}
                      </span>
                    </div>
                    <Switch
                      id={`widget-toggle-${widget.id}`}
                      checked={!isHidden}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex items-center justify-between gap-4 border-t pt-3.5 mt-1 border-border/60">
        <div className="space-y-0.5">
          <p className="text-xs font-medium">Reset customized state</p>
          <p className="text-[10px] text-muted-foreground">
            Restore default visibility of all items.
          </p>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={handleResetAll}
          disabled={!hasHiddenItems}
          className="h-7 text-[10px] hover:bg-muted font-medium"
        >
          <ArrowCounterClockwiseIcon className="mr-1.5 size-3" />
          Reset
        </Button>
      </div>
    </div>
  );
}
