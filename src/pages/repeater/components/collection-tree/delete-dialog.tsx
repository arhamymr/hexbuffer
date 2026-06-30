import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { FlatNode } from './utils';

interface DeleteDialogProps {
  deleteTarget: FlatNode | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteDialog({ deleteTarget, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deleteTarget?.kind === 'endpoint' ? 'Delete endpoint?' : 'Delete collection?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget?.kind === 'endpoint'
              ? `"${deleteTarget.label}" will be permanently deleted.`
              : `"${deleteTarget?.label}" and all its endpoints will be permanently deleted. This action cannot be undone.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
