import { useState } from 'react';
import { useTargetStore } from '@/stores/target';
import type { Target } from '@/types';

export function useTargetSelectorDialog() {
  const [open, setOpen] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { targets, updateTarget } = useTargetStore();

  const handleSelectTarget = (target: Target) => {
    targets.forEach(t => {
      updateTarget(t.id, { tabActive: t.id === target.id });
    });
    setOpen(false);
    setShowCreateNew(false);
  };

  const handleCreateNew = () => {
    setEditingTarget(null);
    setShowCreateNew(true);
  };

  const handleEditTarget = (target: Target) => {
    setEditingTarget(target);
    setShowCreateNew(true);
  };

  const handleCancelCreate = () => {
    setShowCreateNew(false);
    setEditingTarget(null);
  };

  const handleSaveTarget = () => {
    setOpen(false);
    setShowCreateNew(false);
    setEditingTarget(null);
    setSearchQuery('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setShowCreateNew(false);
      setEditingTarget(null);
      setSearchQuery('');
    }
  };

  const filteredTargets = targets.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    open,
    handleOpenChange,
    showCreateNew,
    editingTarget,
    searchQuery,
    setSearchQuery,
    filteredTargets,
    filteredCount: filteredTargets.length,
    handleSelectTarget,
    handleCreateNew,
    handleEditTarget,
    handleCancelCreate,
    handleSaveTarget,
  };
}
