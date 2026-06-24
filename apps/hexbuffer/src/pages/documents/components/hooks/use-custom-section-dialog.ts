import * as React from 'react';

interface UseCustomSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (title: string, description: string, placeholder: string) => void;
  initialValues?: {
    title: string;
    description: string;
    placeholder: string;
  } | null;
}

export function useCustomSectionDialog({
  open,
  onOpenChange,
  onAdd,
  initialValues = null,
}: UseCustomSectionDialogProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [placeholder, setPlaceholder] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setTitle(initialValues?.title ?? '');
    setDescription(initialValues?.description ?? '');
    setPlaceholder(initialValues?.placeholder ?? '');
  }, [initialValues, open]);

  const handleAdd = React.useCallback(() => {
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim(), placeholder.trim());
    setTitle('');
    setDescription('');
    setPlaceholder('');
    onOpenChange(false);
  }, [title, description, placeholder, onAdd, onOpenChange]);

  const handleOpenChange = React.useCallback((openVal: boolean) => {
    if (!openVal) {
      setTitle('');
      setDescription('');
      setPlaceholder('');
    }
    onOpenChange(openVal);
  }, [onOpenChange]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    placeholder,
    setPlaceholder,
    handleAdd,
    handleOpenChange,
  };
}
