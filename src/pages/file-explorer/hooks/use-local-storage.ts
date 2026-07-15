import * as React from 'react';
import { readDir, mkdir, exists, remove, rename, stat } from '@tauri-apps/plugin-fs';
import { documentDir, join } from '@tauri-apps/api/path';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { toast } from 'sonner';

export const LOCAL_STORAGE_DIR_NAME = 'Hexbuffer Files';

export interface LocalItem {
  type: 'folder' | 'file';
  name: string;
  /** Absolute path */
  path: string;
  size?: number;
  lastModified?: Date;
}

export function useLocalStorage() {
  const [rootDir, setRootDir] = React.useState<string>('');
  const [currentPath, setCurrentPath] = React.useState<string>('');
  const [items, setItems] = React.useState<LocalItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<LocalItem | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [deletingPath, setDeletingPath] = React.useState<string | null>(null);

  // Resolve and ensure the dedicated workspace folder on mount
  React.useEffect(() => {
    async function init() {
      const docDir = await documentDir();
      const root = await join(docDir, LOCAL_STORAGE_DIR_NAME);
      const alreadyExists = await exists(root);
      if (!alreadyExists) {
        await mkdir(root, { recursive: true });
      }
      setRootDir(root);
      setCurrentPath(root);
    }
    init().catch(console.error);
  }, []);

  const listDir = React.useCallback(async (path: string) => {
    if (!path) return;
    setLoading(true);
    setSelectedItem(null);
    try {
      const entries = await readDir(path);
      const resolved: LocalItem[] = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = await join(path, entry.name);
          let size: number | undefined;
          let lastModified: Date | undefined;
          try {
            const info = await stat(fullPath);
            size = info.size;
            lastModified = info.mtime ?? undefined;
          } catch {
            // ponytail: stat may fail on restricted symlinks — skip silently
          }
          return {
            type: entry.isDirectory ? 'folder' : 'file',
            name: entry.name,
            path: fullPath,
            size,
            lastModified,
          } satisfies LocalItem;
        })
      );
      // Folders first, then files, both alphabetically
      resolved.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setItems(resolved);
    } catch (err) {
      toast.error(`Failed to read directory: ${err}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (currentPath) {
      listDir(currentPath).catch(console.error);
    }
  }, [currentPath, listDir]);

  const navigateInto = React.useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const navigateUp = React.useCallback(() => {
    setCurrentPath((prev) => {
      if (prev === rootDir) return prev;
      const idx = Math.max(prev.lastIndexOf('/'), prev.lastIndexOf('\\'));
      return idx > 0 ? prev.slice(0, idx) : prev;
    });
  }, [rootDir]);

  const handleOpenFile = React.useCallback(async (item: LocalItem) => {
    if (item.type === 'folder') {
      navigateInto(item.path);
      return;
    }
    try {
      await openPath(item.path);
    } catch (err) {
      toast.error(`Failed to open file: ${err}`);
    }
  }, [navigateInto]);

  const handleDeleteItem = React.useCallback(async (item: LocalItem) => {
    setDeletingPath(item.path);
    // ponytail: use toast.promise for clean loading, success, and error feedback without boilerplate
    const deletePromise = remove(item.path, { recursive: item.type === 'folder' });

    toast.promise(deletePromise, {
      loading: `Deleting ${item.type === 'folder' ? 'folder' : 'file'} '${item.name}'...`,
      success: `Deleted ${item.type === 'folder' ? 'folder' : 'file'} '${item.name}'`,
      error: (err) => `Failed to delete: ${err}`,
    });

    try {
      await deletePromise;
      setItems((prev) => prev.filter((i) => i.path !== item.path));
      setSelectedItem((prev) => (prev?.path === item.path ? null : prev));
    } catch (err) {
      console.error('Failed to delete file:', err);
    } finally {
      setDeletingPath(null);
    }
  }, []);

  const handleCreateFolder = React.useCallback(async (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    try {
      const newPath = await join(currentPath, clean);
      await mkdir(newPath);
      await listDir(currentPath);
      toast.success(`Folder '${clean}' created`);
    } catch (err) {
      toast.error(`Failed to create folder: ${err}`);
    }
  }, [currentPath, listDir]);

  const handleRenameItem = React.useCallback(async (item: LocalItem, newName: string) => {
    const clean = newName.trim();
    if (!clean || clean === item.name) return;
    try {
      const parentIdx = Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\'));
      const parent = item.path.slice(0, parentIdx);
      const newPath = await join(parent, clean);
      await rename(item.path, newPath);
      await listDir(currentPath);
      toast.success(`Renamed to '${clean}'`);
    } catch (err) {
      toast.error(`Failed to rename: ${err}`);
    }
  }, [currentPath, listDir]);

  const handleImportFile = React.useCallback(async () => {
    try {
      const selected = await openDialog({ multiple: true });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const { copyFile } = await import('@tauri-apps/plugin-fs');
      for (const srcPath of paths) {
        const sep = srcPath.includes('/') ? '/' : '\\';
        const fileName = srcPath.split(sep).pop() ?? 'file';
        const destPath = await join(currentPath, fileName);
        await copyFile(srcPath, destPath);
      }
      await listDir(currentPath);
      toast.success(`Imported ${paths.length} file(s)`);
    } catch (err) {
      toast.error(`Import failed: ${err}`);
    }
  }, [currentPath, listDir]);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  // Breadcrumb segments relative to rootDir
  const breadcrumbs = React.useMemo(() => {
    if (!rootDir || !currentPath) return [LOCAL_STORAGE_DIR_NAME];
    const relative = currentPath.slice(rootDir.length).replace(/^[/\\]/, '');
    const parts = relative ? relative.split(/[/\\]/) : [];
    return [LOCAL_STORAGE_DIR_NAME, ...parts];
  }, [rootDir, currentPath]);

  const isAtRoot = currentPath === rootDir;

  return {
    rootDir,
    currentPath,
    items: filteredItems,
    loading,
    selectedItem,
    setSelectedItem,
    searchQuery,
    setSearchQuery,
    breadcrumbs,
    isAtRoot,
    navigateInto,
    navigateUp,
    handleOpenFile,
    handleDeleteItem,
    deletingPath,
    handleCreateFolder,
    handleRenameItem,
    handleImportFile,
    refresh: () => listDir(currentPath),
  };
}
