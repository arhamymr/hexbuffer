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

interface CustomSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (title: string, description: string, placeholder: string) => void;
}

export function CustomSectionDialog({ open, onOpenChange, onAdd }: CustomSectionDialogProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [placeholder, setPlaceholder] = React.useState('');

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim(), placeholder.trim());
    setTitle('');
    setDescription('');
    setPlaceholder('');
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTitle('');
      setDescription('');
      setPlaceholder('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Section</DialogTitle>
          <DialogDescription>
            Create a new markdown section for this document.
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
            Add Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}