import { useState, useCallback } from 'react';
import {
  ChevronRight,
  File,
  FileCode,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import type { FileTreeNode } from '../types';

interface FileTreeProps {
  files: FileTreeNode[];
  activePath: string | null;
  onFileClick: (path: string) => void;
  onNewFile: (parentPath: string, fileName: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
  onRenameFile: (oldPath: string, newName: string) => Promise<void>;
  onRefresh: () => void;
}

export function FileTree({
  files,
  activePath,
  onFileClick,
  onNewFile,
  onDeleteFile,
  onRenameFile,
  onRefresh,
}: FileTreeProps) {
  if (files.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <File className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Empty project</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2">
      <div className="space-y-0.5">
        {files.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            activePath={activePath}
            onFileClick={onFileClick}
            onNewFile={onNewFile}
            onDeleteFile={onDeleteFile}
            onRenameFile={onRenameFile}
          />
        ))}
      </div>
    </div>
  );
}

interface FileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  activePath: string | null;
  onFileClick: (path: string) => void;
  onNewFile: (parentPath: string, fileName: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
  onRenameFile: (oldPath: string, newName: string) => Promise<void>;
}

function FileTreeItem({
  node,
  depth,
  activePath,
  onFileClick,
  onNewFile,
  onDeleteFile,
  onRenameFile,
}: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
      await onNewFile(node.path, trimmed);
    }
    setIsCreating(false);
    setCreateValue('');
  }, [createValue, node.path, onNewFile]);

  const isActive = activePath === node.path;

  if (node.isDir) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div>
              <CollapsibleTrigger asChild>
                <button
                  className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs hover:bg-muted/50"
                  style={{ paddingLeft: `${8 + depth * 14}px` }}
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  />
                  {isOpen ? (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  )}
                  <span className="truncate font-medium">{node.name}</span>
                </button>
              </CollapsibleTrigger>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-40">
            <ContextMenuItem onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setIsRenaming(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              className="text-destructive"
              onClick={() => onDeleteFile(node.path)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <CollapsibleContent>
          {isCreating && (
            <div className="py-1" style={{ paddingLeft: `${8 + (depth + 1) * 14}px` }}>
              <Input
                className="h-6 text-xs"
                placeholder="filename"
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSubmit();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                onBlur={handleCreateSubmit}
                autoFocus
              />
            </div>
          )}
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onFileClick={onFileClick}
              onNewFile={onNewFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // File node
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          {isRenaming ? (
            <div style={{ paddingLeft: `${8 + depth * 14}px` }} className="py-0.5">
              <Input
                className="h-6 text-xs"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                onBlur={handleRenameSubmit}
                autoFocus
              />
            </div>
          ) : (
            <button
              className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs hover:bg-muted/50 ${
                isActive ? 'bg-primary/10 text-primary' : ''
              }`}
              style={{ paddingLeft: `${8 + depth * 14}px` }}
              onClick={() => onFileClick(node.path)}
            >
              <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              <span className="truncate">{node.name}</span>
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-40">
        <ContextMenuItem onClick={() => setIsRenaming(true)}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive"
          onClick={() => onDeleteFile(node.path)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
