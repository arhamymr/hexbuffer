import { FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DocumentHeaderProps {
  title: string;
  onTitleChange: (value: string) => void;
  onAddDocument: () => void;
}

export function DocumentHeader({ title, onTitleChange, onAddDocument }: DocumentHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b p-4">
      <div className="flex-1">
        <Input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Untitled recon document"
          className="text-base font-medium"
        />
      </div>
      <Button type="button" variant="outline" onClick={onAddDocument}>
        <FilePlus2 className="h-4 w-4" />
        New document
      </Button>
    </div>
  );
}
