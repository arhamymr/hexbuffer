import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, PencilSimpleIcon, DownloadIcon, UploadIcon } from '@phosphor-icons/react';

interface TreeHeaderProps {
  renameTarget: { id: string; name: string } | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameBlur: () => void;
  onExport: () => void;
  onImportClick: () => void;
  onCreateCollection: () => void;
}

export function TreeHeader({
  renameTarget,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameBlur,
  onExport,
  onImportClick,
  onCreateCollection,
}: TreeHeaderProps) {
  return (
    <div className="shrink-0 p-2 border-b space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Collections
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Export Collections"
            onClick={() => { void onExport(); }}
          >
            <DownloadIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Import Collections"
            onClick={onImportClick}
          >
            <UploadIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="New Collection"
            onClick={onCreateCollection}
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {renameTarget && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRenameSubmit();
          }}
          className="flex gap-1"
        >
          <Input
            className="h-7 text-xs"
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onBlur={onRenameBlur}
            placeholder="Rename..."
          />
          <Button type="submit" size="icon" className="h-7 w-7 shrink-0">
            <PencilSimpleIcon className="h-3 w-3" />
          </Button>
        </form>
      )}
    </div>
  );
}
