import {
  ChevronRight,
  FolderPlus,
  Plus,
  RefreshCw,
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
import type { FileTreeNode } from '../../types';
import { useFileTreeItem } from '../hooks/use-file-tree-item';
import type { CreateMode } from '../hooks/use-file-tree-item';
import { getFileIconUrl, getFolderIconUrl } from '../../lib/file-icons';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortTreeChildren(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Tiny inline SVG image used for all file / folder icons. */
function FileIcon({ src, className = '' }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      className={`h-3.5 w-3.5 shrink-0 object-contain ${className}`}
      aria-hidden="true"
      alt=""
    />
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface FileTreeProps {
  files: FileTreeNode[];
  activePath: string | null;
  onFileClick: (path: string) => void;
  onNewFile: (parentPath: string, fileName: string) => Promise<void>;
  onNewFolder: (parentPath: string, folderName: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
  onRenameFile: (oldPath: string, newName: string) => Promise<void>;
  onRefresh: () => void;
}

export function FileTree({
  files,
  activePath,
  onFileClick,
  onNewFile,
  onNewFolder,
  onDeleteFile,
  onRenameFile,
  onRefresh,
}: FileTreeProps) {
  if (files.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col border-r bg-background">
        <FileTreeHeader
          onNewFile={() => onNewFile('', 'untitled.txt')}
          onNewFolder={() => onNewFolder('', 'new-folder')}
          onRefresh={onRefresh}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
          <FileIcon src={getFolderIconUrl('', false)} className="h-8 w-8 opacity-40" />
          <p className="text-xs text-muted-foreground">Empty folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-background">
      <FileTreeHeader
        onNewFile={() => onNewFile('', 'untitled.txt')}
        onNewFolder={() => onNewFolder('', 'new-folder')}
        onRefresh={onRefresh}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-0.5">
          {sortTreeChildren(files).map((node, index) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              isLast={index === files.length - 1}
              lastAtDepths={new Set()}
              activePath={activePath}
              onFileClick={onFileClick}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function FileTreeHeader({
  onNewFile,
  onNewFolder,
  onRefresh,
}: {
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b px-3 bg-muted">
      <span className="text-xs font-medium uppercase text-muted-foreground">Explorer</span>
      <div className="flex items-center gap-1">
        <button
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
          onClick={onNewFile}
          type="button"
          aria-label="New file"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
          onClick={onNewFolder}
          type="button"
          aria-label="New folder"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
          onClick={onRefresh}
          type="button"
          aria-label="Refresh files"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tree item
// ---------------------------------------------------------------------------

interface FileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  isLast: boolean;
  lastAtDepths: Set<number>;
  activePath: string | null;
  onFileClick: (path: string) => void;
  onNewFile: (parentPath: string, fileName: string) => Promise<void>;
  onNewFolder: (parentPath: string, folderName: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
  onRenameFile: (oldPath: string, newName: string) => Promise<void>;
}

function FileTreeItem({
  node,
  depth,
  isLast,
  lastAtDepths,
  activePath,
  onFileClick,
  onNewFile,
  onNewFolder,
  onDeleteFile,
  onRenameFile,
}: FileTreeItemProps) {
  const {
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
  } = useFileTreeItem({
    node,
    depth,
    onNewFile,
    onNewFolder,
    onRenameFile,
  });

  const isActive = activePath === node.path;

  // -------------------------------------------------------------------------
  // Directory
  // -------------------------------------------------------------------------
  if (node.isDir) {
    const childLastAtDepths = new Set(lastAtDepths);
    if (isLast) childLastAtDepths.add(depth);

    const folderIcon = getFolderIconUrl(node.name, isOpen);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div>
              {isRenaming ? (
                <div className="flex items-center py-0.5" style={{ paddingLeft: `${depth * 14 + 8}px` }}>
                  <Input
                    className="h-6 flex-1 text-xs"
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
                <CollapsibleTrigger asChild>
                  <button
                    className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs hover:bg-muted/50"
                    style={{ paddingLeft: `${depth * 14 + 8}px` }}
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                    <FileIcon src={folderIcon} />
                    <span className="truncate font-medium">{node.name}</span>
                  </button>
                </CollapsibleTrigger>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-40">
            <ContextMenuItem onClick={() => setCreateMode('file')}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setCreateMode('folder')}>
              <FolderPlus className="mr-2 h-3.5 w-3.5" />
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
          <div>
            {createMode !== null && (
              <div className="py-1" style={{ paddingLeft: `${8 + (depth + 1) * 14}px` }}>
                <Input
                  className="h-6 text-xs"
                  placeholder={createMode === 'file' ? 'filename' : 'folder name'}
                  value={createValue}
                  onChange={(e) => setCreateValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSubmit();
                    if (e.key === 'Escape') setCreateMode(null);
                  }}
                  onBlur={handleCreateSubmit}
                  autoFocus
                />
              </div>
            )}
            {sortTreeChildren(node.children).map((child, index) => {
              const sortedChildren = sortTreeChildren(node.children);
              return (
                <FileTreeItem
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  isLast={index === sortedChildren.length - 1}
                  lastAtDepths={childLastAtDepths}
                  activePath={activePath}
                  onFileClick={onFileClick}
                  onNewFile={onNewFile}
                  onNewFolder={onNewFolder}
                  onDeleteFile={onDeleteFile}
                  onRenameFile={onRenameFile}
                />
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // -------------------------------------------------------------------------
  // File node
  // -------------------------------------------------------------------------
  const fileIcon = getFileIconUrl(node.name);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          {isRenaming ? (
            <div className="flex items-center py-0.5" style={{ paddingLeft: `${depth * 14 + 8}px` }}>
              <Input
                className="h-6 flex-1 text-xs"
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
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
              onClick={() => onFileClick(node.path)}
            >
              <FileIcon src={fileIcon} />
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
