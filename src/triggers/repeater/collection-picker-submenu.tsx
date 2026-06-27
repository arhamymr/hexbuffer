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
import { useCollectionPicker, type CollectionNode } from './use-collection-picker';

type MenuVariant = 'dropdown' | 'context';

interface CollectionPickerSubmenuProps {
  variant: MenuVariant;
  onSelect: (stashId: string) => void;
  disabled?: boolean;
}

function CollectionFolderItem({
  node,
  depth,
  variant,
  onSelect,
}: {
  node: CollectionNode;
  depth: number;
  variant: MenuVariant;
  onSelect: (stashId: string) => void;
}) {
  const Sub = variant === 'dropdown' ? DropdownMenuSub : ContextMenuSub;
  const SubTrigger = variant === 'dropdown' ? DropdownMenuSubTrigger : ContextMenuSubTrigger;
  const SubContent = variant === 'dropdown' ? DropdownMenuSubContent : ContextMenuSubContent;
  const Item = variant === 'dropdown' ? DropdownMenuItem : ContextMenuItem;

  const hasChildren = node.children.length > 0;

  if (hasChildren) {
    return (
      <Sub>
        <SubTrigger className="text-xs py-1 px-1.5">
          <FolderHeart className="mr-1.5 size-3" />
          {node.name}
        </SubTrigger>
        <SubContent>
          <Item
            className="text-xs py-1 px-1.5"
            onClick={() => onSelect(node.stashId)}
          >
            <Send className="mr-1.5 size-3" />
            Save to "{node.name}"
          </Item>
          {node.children.map((child) => (
            <CollectionFolderItem
              key={child.stashId}
              node={child}
              depth={depth + 1}
              variant={variant}
              onSelect={onSelect}
            />
          ))}
        </SubContent>
      </Sub>
    );
  }

  return (
    <Item
      className="text-xs py-1 px-1.5"
      onClick={() => onSelect(node.stashId)}
    >
      <Send className="mr-1.5 size-3" />
      Save to "{node.name}"
    </Item>
  );
}

export function CollectionPickerSubmenu({
  variant,
  onSelect,
  disabled,
}: CollectionPickerSubmenuProps) {
  const { rootCollections, isLoading, isEmpty } = useCollectionPicker();

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
          rootCollections.map((node, i) => (
            <CollectionFolderItem
              key={node.stashId}
              node={node}
              depth={0}
              variant={variant}
              onSelect={onSelect}
            />
          ))
        )}
      </SubContent>
    </Sub>
  );
}
