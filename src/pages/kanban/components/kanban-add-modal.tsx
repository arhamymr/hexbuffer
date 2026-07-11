import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { KanbanCard, Priority, SubTask } from '../types';
import { STATUS_COLUMNS, PRIORITY_CONFIG } from '../constants';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultColumnId: string;
  onAdd: (card: Omit<KanbanCard, 'id'>) => void;
}

const ASSIGNEE_OPTIONS = [
  { value: 'unassigned', label: 'Unassigned', color: undefined },
  { value: 'AR', label: 'AR (Arham)', color: '#00c950' },
  { value: 'MK', label: 'MK (Max)', color: '#818cf8' },
  { value: 'JS', label: 'JS (John)', color: '#f472b6' },
];

export function KanbanAddModal({ isOpen, onClose, defaultColumnId, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState(defaultColumnId);
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignee, setAssignee] = useState('unassigned');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [validationError, setValidationError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setColumnId(defaultColumnId);
      setPriority('medium');
      setAssignee('unassigned');
      setDueDate('');
      setTagsInput('');
      setSubtasks([]);
      setNewSubtaskTitle('');
      setValidationError(false);
    }
  }, [isOpen, defaultColumnId]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle.trim(),
      done: false,
    };
    setSubtasks((prev) => [...prev, newSub]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError(true);
      return;
    }

    const assigneeOpt = ASSIGNEE_OPTIONS.find((opt) => opt.value === assignee);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const actualAssignee = assignee === 'unassigned' ? undefined : assignee;

    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      columnId,
      priority,
      assignee: actualAssignee,
      assigneeColor: actualAssignee ? assigneeOpt?.color : undefined,
      dueDate: dueDate || undefined,
      tags: tags.length > 0 ? tags : undefined,
      subtasks,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Create Kanban Card</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="card-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="card-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError && e.target.value.trim()) {
                  setValidationError(false);
                }
              }}
              placeholder="Card title"
              aria-invalid={validationError}
            />
            {validationError && (
              <span className="text-xs font-medium text-destructive">
                Card title is required.
              </span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="card-desc">Description</Label>
            <Textarea
              id="card-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status / Column */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(val) => setPriority(val as Priority)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNEE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="card-date">Due Date</Label>
              <Input
                id="card-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="card-tags">Tags</Label>
            <Input
              id="card-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. frontend, backend (comma separated)"
            />
          </div>

          {/* Subtasks Section */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Subtasks ({subtasks.length})</Label>

            {/* Subtask list */}
            {subtasks.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1 bg-muted/20"
                  >
                    <span className="text-xs truncate">{sub.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={() => handleRemoveSubtask(sub.id)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask input group */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add subtask title..."
              />
              <Button
                type="button"
                variant="outline"
                className="h-7 w-7 p-0 shrink-0"
                onClick={handleAddSubtask}
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Dialog actions */}
          <DialogFooter className="pt-2 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
