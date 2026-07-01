import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon, DownloadIcon, UploadIcon } from '@phosphor-icons/react';

interface TreeHeaderProps {
  onExport: () => void;
  onImportClick: () => void;
  onCreateCollection: () => void;
}

export function TreeHeader({
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
    </div>
  );
}
