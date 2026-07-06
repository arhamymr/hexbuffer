import { XIcon } from '@phosphor-icons/react';
import type { NavItem } from '@/layout/constants';

interface PageMentionChipProps {
  item: NavItem;
  onRemove: () => void;
}

export function PageMentionChip({ item, onRemove }: PageMentionChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <item.icon className="size-3.5" />
      <span>{item.label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="ml-0.5 rounded-sm p-0.5 hover:bg-muted-foreground/20 transition-colors"
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}
