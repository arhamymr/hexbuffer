import { useState, useCallback } from 'react';
import type { FileTreeNode } from '../../types';

export type CreateMode = 'file' | 'folder' | null;

interface UseFileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  onNewFile: (parentPath: string, fileName: string) => Promise<void>;
  onNewFolder: (parentPath: string, folderName: string) => Promise<void>;
  onRenameFile: (oldPath: string, newName: string) => Promise<void>;
}

export function useFileTreeItem({
  node,
  depth,
  onNewFile,
  onNewFolder,
  onRenameFile,
}: UseFileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [renameValue, setRenameValue] = useState(node.name);
  const [createValue, setCreateValue] = useState('');

  const handleRenameSubmit = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== node.name) {
      await onRenameFile(node.path, trimmed);
    }
    setIsRenaming(false);
  }, [renameValue, node.name, node.path, onRenameFile]);

  const handleCreateSubmit = useCallback(async () => {
    const trimmed = createValue.trim();
    if (trimmed) {
      if (createMode === 'file') {
        await onNewFile(node.path, trimmed);
      } else if (createMode === 'folder') {
        await onNewFolder(node.path, trimmed);
      }
    }
    setCreateMode(null);
    setCreateValue('');
  }, [createValue, createMode, node.path, onNewFile, onNewFolder]);

  return {
    isOpen,
    setIsOpen,
    isRenaming,
    setIsRenaming,
    createMode,
    setCreateMode,
    renameValue,
    setRenameValue,
    createValue,
    setCreateValue,
    handleRenameSubmit,
    handleCreateSubmit,
  };
}
