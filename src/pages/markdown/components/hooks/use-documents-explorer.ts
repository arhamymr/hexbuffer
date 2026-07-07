import * as React from 'react';
import { type DragEndEvent } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';

interface UseDocumentsExplorerProps {
  onReorderCustomSections: (fromIndex: number, toIndex: number) => void;
}

export function useDocumentsExplorer({ onReorderCustomSections }: UseDocumentsExplorerProps) {
  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { source, target } = event.operation;
      if (!isSortable(source) || !isSortable(target)) return;
      const fromIndex = source.index;
      const toIndex = target.index;
      if (fromIndex !== toIndex) {
        onReorderCustomSections(fromIndex, toIndex);
      }
    },
    [onReorderCustomSections]
  );

  return {
    handleDragEnd,
  };
}
