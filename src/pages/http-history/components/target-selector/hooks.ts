import { useState } from 'react';
import { useTargetStore } from '@/stores/target';
import type { Target } from '@/types';

export function useTargetSelectorDialog() {
  const [open, setOpen] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
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
    setShowCreateNew(true);
  };

  const handleCancelCreate = () => {
    setShowCreateNew(false);
  };

  const filteredTargets = targets.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    open,
    setOpen,
    showCreateNew,
    searchQuery,
    setSearchQuery,
    filteredTargets,
    filteredCount: filteredTargets.length,
    handleSelectTarget,
    handleCreateNew,
    handleCancelCreate,
  };
}