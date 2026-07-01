import React from 'react';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

const OPEN_NODE_CONTEXT_MENU_EVENT = 'automation-open-node-context-menu';

interface NodeContextMenuEventDetail {
  nodeId: string;
  nodeLabel: string;
  clientX: number;
  clientY: number;
}

function emitOpenNodeContextMenu(detail: NodeContextMenuEventDetail) {
  window.dispatchEvent(
    new CustomEvent<NodeContextMenuEventDetail>(OPEN_NODE_CONTEXT_MENU_EVENT, {
      detail,
    })
  );
}

export function addOpenNodeContextMenuListener(
  handler: (detail: NodeContextMenuEventDetail) => void
) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<NodeContextMenuEventDetail>).detail;
    if (detail?.nodeId) handler(detail);
  };

  window.addEventListener(OPEN_NODE_CONTEXT_MENU_EVENT, listener);
  return () => window.removeEventListener(OPEN_NODE_CONTEXT_MENU_EVENT, listener);
}

export function NodeCardMenu({ nodeId, nodeLabel }: { nodeId: string; nodeLabel: string }) {
  const handleOpenMenu = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    emitOpenNodeContextMenu({
      nodeId,
      nodeLabel,
      clientX: rect.right,
      clientY: rect.bottom,
    });
  }, [nodeId, nodeLabel]);

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="nodrag nopan size-6 shrink-0 text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
      title="Node menu"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={handleOpenMenu}
    >
      <DotsThreeVerticalIcon className="size-3.5" />
    </Button>
  );
}
