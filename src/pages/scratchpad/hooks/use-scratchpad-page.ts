import * as React from 'react';
import { toast } from 'sonner';
import { useScratchpadStore } from '@/stores/scratchpad';

export function useScratchpadPage() {
  const {
    scratchpads,
    activeId,
    note,
    setNote,
    addScratchpad,
    deleteScratchpad,
    setActiveId,
    renameScratchpad,
  } = useScratchpadStore();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('scratchpad-sidebar-open') !== 'false';
    }
    return true;
  });

  const toggleSidebar = React.useCallback(() => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('scratchpad-sidebar-open', String(next));
      return next;
    });
  }, []);

  const activePad = scratchpads.find((s) => s.id === activeId) || scratchpads[0];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activePad) {
          toast.success('Scratchpad saved', { description: activePad.name });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePad?.name]);

  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = React.useState<string>('');

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && editingId) {
      renameScratchpad(editingId, trimmed);
    }
    setEditingId(null);
  };

  const handleRenameCancel = () => {
    setEditingId(null);
  };

  const handleAdd = () => {
    if (scratchpads.length >= 20) {
      toast.error('Limit reached', { description: 'Maximum 20 scratchpads allowed' });
      return;
    }
    addScratchpad();
    toast.success('New scratchpad created');
  };

  const handleDelete = (id: string, name: string) => {
    if (scratchpads.length <= 1) {
      toast.error('Cannot delete', { description: 'You must keep at least one scratchpad' });
      return;
    }
    setDeleteConfirmId(id);
    setDeleteConfirmName(name);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteScratchpad(deleteConfirmId);
      toast.success('Scratchpad deleted', { description: deleteConfirmName });
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmName('');
  };

  const filteredScratchpads = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return scratchpads;
    return scratchpads.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.note.toLowerCase().includes(query)
    );
  }, [scratchpads, searchQuery]);

  return {
    scratchpads,
    filteredScratchpads,
    activeId,
    activePad,
    note,
    setNote,
    searchQuery,
    setSearchQuery,
    editingId,
    renameValue,
    setRenameValue,
    handleStartRename,
    handleRenameSubmit,
    handleRenameCancel,
    handleAdd,
    handleDelete,
    deleteConfirmId,
    deleteConfirmName,
    handleConfirmDelete,
    handleCancelDelete,
    handleSelect: setActiveId,
    isSidebarOpen,
    toggleSidebar,
  };
}

export type ScratchpadPageHookType = ReturnType<typeof useScratchpadPage>;
