import * as React from 'react';
import { useScratchpadStore } from '@/stores/scratchpad';
import { TextEditor } from '@/components/ui/text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon, TrashIcon, PencilSimpleIcon, FileTextIcon, CheckIcon, XIcon } from '@phosphor-icons/react';

export function ScratchpadPage() {
  const {
    scratchpads,
    activeId,
    note,
    setNote,
    addScratchpad,
    deleteScratchpad,
    setActiveId,
    renameScratchpad,
  } = useScratchpadStore();

  const activePad = scratchpads.find((s) => s.id === activeId) || scratchpads[0];

  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState('');

  const handleRenameStart = () => {
    if (!activePad) return;
    setRenameValue(activePad.name);
    setIsRenaming(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && activePad) {
      renameScratchpad(activePad.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
  };

  // ponytail: kept simple with inline event handlers to minimize abstraction overhead
  return (
    <div className="h-full w-full overflow-hidden bg-background p-3 flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border rounded-md bg-muted/40 px-3">
        <div className="flex items-center gap-2">
          <FileTextIcon className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Scratchpad</span>
        </div>

        <div className="flex items-center gap-2">
          {isRenaming ? (
            /* Inline Rename Input */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameSubmit();
              }}
              className="flex items-center gap-1.5"
            >
              <Input
                className="h-6 w-36 text-xs px-2 py-0 bg-background border-primary/40 focus-visible:ring-primary/20"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleRenameCancel();
                }}
              />
              <Button
                type="submit"
                variant="outline"
                size="xs"
                title="Save name"
                className="h-6 w-6 p-0 text-primary active:scale-95 transition-all"
              >
                <CheckIcon className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleRenameCancel}
                title="Cancel rename"
                className="h-6 w-6 p-0 text-muted-foreground active:scale-95 transition-all"
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </form>
          ) : (
            /* Dropdown Select to switch scratchpads */
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Active:</span>
              <Select
                value={activeId}
                onValueChange={setActiveId}
              >
                <SelectTrigger className="h-6 min-w-[130px] text-[11px] px-2 py-0 [&_svg]:size-3 bg-background active:scale-97 transition-all">
                  <SelectValue placeholder="Select scratchpad" />
                </SelectTrigger>
                <SelectContent>
                  {scratchpads.map((pad) => (
                    <SelectItem key={pad.id} value={pad.id} className="text-[11px]">
                      {pad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isRenaming && (
            <>
              <div className="h-4 w-[1px] bg-border mx-1" />

              {/* Rename */}
              <Button
                variant="outline"
                size="xs"
                onClick={handleRenameStart}
                title="Rename active scratchpad"
                className="h-6 w-6 p-0 active:scale-95 transition-all"
              >
                <PencilSimpleIcon className="h-3.5 w-3.5" />
              </Button>

              {/* Delete */}
              <Button
                variant="outline"
                size="xs"
                onClick={() => deleteScratchpad(activeId)}
                disabled={scratchpads.length <= 1}
                title="Delete active scratchpad"
                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:active:scale-100 transition-all"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>

              {/* Add Scratchpad (Max 6) */}
              <Button
                variant="outline"
                size="xs"
                onClick={addScratchpad}
                disabled={scratchpads.length >= 6}
                title={scratchpads.length >= 6 ? "Max 6 scratchpads reached" : "Add new scratchpad"}
                className="h-6 px-2 text-[11px] gap-1 active:scale-95 disabled:active:scale-100 transition-all"
              >
                <PlusIcon className="h-3 w-3" />
                <span>Add ({scratchpads.length}/6)</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
        <TextEditor
          value={note}
          onChange={(value) => setNote(value ?? '')}
          language="markdown"
          height="100%"
        />
      </div>
    </div>
  );
}

