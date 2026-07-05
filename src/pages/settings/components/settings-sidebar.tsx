import type { Icon } from '@phosphor-icons/react';
import {
  GearIcon,
  ShieldCheckIcon,
  SparkleIcon,
  FlowArrowIcon,
  PaletteIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export type SettingsCategory = 'general' | 'ca-cert' | 'ai' | 'automation' | 'appearance' | 'about';

interface SettingsNavItem {
  id: SettingsCategory;
  label: string;
  Icon: Icon;
}

const NAV_ITEMS: SettingsNavItem[] = [
  { id: 'general', label: 'General', Icon: GearIcon },
  { id: 'ca-cert', label: 'CA Certificate', Icon: ShieldCheckIcon },
  { id: 'ai', label: 'AI', Icon: SparkleIcon },
  { id: 'automation', label: 'Automation', Icon: FlowArrowIcon },
  { id: 'appearance', label: 'Appearance', Icon: PaletteIcon },
  { id: 'about', label: 'About', Icon: InfoIcon },
];

interface SettingsSidebarProps {
  active: SettingsCategory;
  onSelect: (category: SettingsCategory) => void;
}

export function SettingsSidebar({ active, onSelect }: SettingsSidebarProps) {
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-0.5 border-r bg-muted/30 p-3">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'group relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <item.Icon
              className={cn(
                'size-4 shrink-0 transition-colors duration-150',
                isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
              )}
              weight={isActive ? 'fill' : 'regular'}
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
