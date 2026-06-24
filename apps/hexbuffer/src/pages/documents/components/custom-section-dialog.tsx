import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { useCustomSectionDialog } from './hooks/use-custom-section-dialog';

interface CustomSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (title: string, description: string, placeholder: string) => void;
  initialValues?: {
    title: string;
    description: string;
    placeholder: string;
  } | null;
  mode?: 'add' | 'edit';
}

export function CustomSectionDialog({
  open,
  onOpenChange,
  onAdd,
  initialValues = null,
  mode = 'add',
}: CustomSectionDialogProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    placeholder,
    setPlaceholder,
    handleAdd,
    handleOpenChange,
  } = useCustomSectionDialog({ open, onOpenChange, onAdd, initialValues });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Rename File' : 'Add File'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the name and helper text for this markdown file.'
              : 'Create a new markdown file for this document.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-title">Title</Label>
            <Input
              id="section-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Custom Notes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-description">Description</Label>
            <Textarea
              id="section-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this section is for..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-placeholder">Placeholder</Label>
            <Textarea
              id="section-placeholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Example content..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!title.trim()}>
            {mode === 'edit' ? 'Save File' : 'Add File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
