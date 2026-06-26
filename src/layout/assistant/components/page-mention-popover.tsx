import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { NavItem } from '@/layout/constants';

interface PageMentionPopoverProps {
  isOpen: boolean;
  filteredPages: NavItem[];
  highlightedIndex: number;
  onSelect: (page: NavItem) => void;
}

export function PageMentionPopover({
  isOpen,
  filteredPages,
  highlightedIndex,
  onSelect,
}: PageMentionPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-64 z-50 rounded-md border bg-popover shadow-md">
      <Command>
        <CommandList>
          {filteredPages.length > 0 ? (
            <CommandGroup heading="Pages">
              {filteredPages.map((page, index) => (
                <CommandItem
                  key={page.href}
                  value={page.label}
                  onSelect={() => onSelect(page)}
                  className={
                    index === highlightedIndex
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  }
                >
                  <div className="flex items-center gap-2">
                    {page.iconImage ? (
                      <img
                        src={page.iconImage}
                        alt=""
                        className="size-4 object-cover rounded-sm"
                      />
                    ) : (
                      <page.icon className="size-4 shrink-0" />
                    )}
                    <span>{page.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <CommandEmpty>No pages found</CommandEmpty>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
