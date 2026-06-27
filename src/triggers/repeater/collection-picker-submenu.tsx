import { FolderHeart, Send, Loader2 } from 'lucide-react';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { useCollectionPicker } from './use-collection-picker';

type MenuVariant = 'dropdown' | 'context';

interface CollectionPickerSubmenuProps {
  variant: MenuVariant;
  onSelect: (stashId: string) => void;
  disabled?: boolean;
}

export function CollectionPickerSubmenu({
  variant,
  onSelect,
  disabled,
}: CollectionPickerSubmenuProps) {
  const { collections, isLoading, isEmpty } = useCollectionPicker();

  const Sub = variant === 'dropdown' ? DropdownMenuSub : ContextMenuSub;
  const SubTrigger = variant === 'dropdown' ? DropdownMenuSubTrigger : ContextMenuSubTrigger;
  const SubContent = variant === 'dropdown' ? DropdownMenuSubContent : ContextMenuSubContent;
  const Item = variant === 'dropdown' ? DropdownMenuItem : ContextMenuItem;
  const Separator = variant === 'dropdown' ? DropdownMenuSeparator : ContextMenuSeparator;

  return (
    <Sub>
      <SubTrigger className="text-xs py-1 px-1.5" disabled={disabled}>
        <Send className="mr-1.5 size-3" />
        Send to Repeater
      </SubTrigger>
      <SubContent>
        {isLoading ? (
          <Item className="text-xs py-1 px-1.5" disabled>
            <Loader2 className="mr-1.5 size-3 animate-spin" />
            Loading collections...
          </Item>
        ) : isEmpty ? (
          <Item className="text-xs py-1 px-1.5" disabled>
            <FolderHeart className="mr-1.5 size-3" />
            No collections
          </Item>
        ) : (
          collections.map((node) => (
            <Item
              key={node.stashId}
              className="text-xs py-1 px-1.5"
              onClick={() => onSelect(node.stashId)}
            >
              <Send className="mr-1.5 size-3" />
              {node.name}
            </Item>
          ))
        )}
      </SubContent>
    </Sub>
  );
}
