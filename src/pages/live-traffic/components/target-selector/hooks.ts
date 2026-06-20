import { useEffect, useState } from 'react';
import { useTargetStore } from '@/stores/target';
import { useShallow } from 'zustand/react/shallow';
import type { Target } from '@/types';

export function useTargetSelectorDialog(options?: {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}) {
  const isExternallyControlled = options?.externalOpen !== undefined && options?.onExternalOpenChange !== undefined;

  const [internalOpen, setInternalOpen] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { targets, updateTarget } = useTargetStore(
    useShallow((s) => ({
      targets: s.targets,
      updateTarget: s.updateTarget,
    }))
  );

  const open = isExternallyControlled ? options!.externalOpen! : internalOpen;

  const handleSelectTarget = (target: Target) => {
    if (!target.tabActive) {
      updateTarget(target.id, { tabActive: true });
    }
    if (isExternallyControlled) {
      options!.onExternalOpenChange!(false);
    } else {
      setInternalOpen(false);
    }
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
    if (isExternallyControlled) {
      options!.onExternalOpenChange!(false);
    } else {
      setInternalOpen(false);
    }
    setShowCreateNew(false);
    setEditingTarget(null);
    setSearchQuery('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isExternallyControlled) {
      options!.onExternalOpenChange!(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
    if (!nextOpen) {
      setShowCreateNew(false);
      setEditingTarget(null);
      setSearchQuery('');
    }
  };

  const showSearch = targets.length >= 10;

  useEffect(() => {
    if (!showSearch && searchQuery) {
      setSearchQuery('');
    }
  }, [searchQuery, setSearchQuery, showSearch]);

  const filteredTargets = showSearch && searchQuery
    ? targets.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : targets;

  return {
    open,
    handleOpenChange,
    showCreateNew,
    editingTarget,
    searchQuery,
    setSearchQuery,
    filteredTargets,
    targetCount: targets.length,
    filteredCount: filteredTargets.length,
    handleSelectTarget,
    handleCreateNew,
    handleEditTarget,
    handleCancelCreate,
    handleSaveTarget,
  };
}
