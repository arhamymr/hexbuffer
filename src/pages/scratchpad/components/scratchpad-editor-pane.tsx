import * as React from 'react';
import { PencilSimpleIcon, CheckIcon, XIcon, FileTextIcon, SidebarSimpleIcon } from '@phosphor-icons/react';
import { TextEditor } from '@/components/ui/text-editor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { ScratchpadPageHookType } from '../hooks/use-scratchpad-page';

interface ScratchpadEditorPaneProps {
  hook: ScratchpadPageHookType;
}

export function ScratchpadEditorPane({ hook }: ScratchpadEditorPaneProps) {
  const {
    activePad,
    note,
    setNote,
    editingId,
    renameValue,
    setRenameValue,
    handleStartRename,
    handleRenameSubmit,
    handleRenameCancel,
    isSidebarOpen,
    toggleSidebar,
  } = hook;

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  const isRenamingActive = activePad && editingId === activePad.id;

  const wordCount = React.useMemo(() => {
    if (!note) return 0;
    return note.trim().split(/\s+/).filter(Boolean).length;
  }, [note]);

  const charCount = note?.length || 0;

  if (!activePad) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground p-8">
        <FileTextIcon className="size-12 mb-4 opacity-20" />
        <p className="text-xs">No scratchpad selected</p>
      </div>
    );
  }

  // ponytail: editor container uses full flex layout to avoid hidden overflows
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      {/* Editor Header / Toolbar */}
      <div className="h-12 border-b px-4 flex items-center justify-between shrink-0 bg-muted/5 select-none">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="xs"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="size-7 p-0 shrink-0 hover:bg-muted active:scale-95 transition-all text-muted-foreground hover:text-foreground mr-1"
            >
              <SidebarSimpleIcon className="size-4" />
            </Button>
          )}
          {isRenamingActive ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameSubmit();
              }}
              className="flex items-center gap-1.5 max-w-sm w-full"
            >
              <Input
                className="h-7 text-xs px-2 py-0 bg-background border-primary/40 focus-visible:ring-primary/20"
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
                className="h-7 w-7 p-0 text-primary active:scale-95 transition-all"
              >
                <CheckIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleRenameCancel}
                title="Cancel rename"
                className="h-7 w-7 p-0 text-muted-foreground active:scale-95 transition-all"
              >
                <XIcon className="size-3.5" />
              </Button>
            </form>
          ) : (
            <div
              className="flex items-center gap-2 cursor-pointer group max-w-full"
              onDoubleClick={() => handleStartRename(activePad.id, activePad.name)}
              title="Double click to rename"
            >
              <span className="font-semibold text-xs md:text-sm text-foreground truncate max-w-[200px] sm:max-w-[300px] md:max-w-[450px]">
                {activePad.name}
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleStartRename(activePad.id, activePad.name)}
                className="size-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Rename scratchpad"
              >
                <PencilSimpleIcon className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Editor Metadata */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground shrink-0 select-none">
          <span className="font-mono">{wordCount} words</span>
          <span className="font-mono">{charCount} chars</span>
          <div className="hidden sm:flex items-center gap-1.5 border-l pl-4">
            <span className="text-muted-foreground text-[10px]">Save</span>
            <KbdGroup>
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>S</Kbd>
            </KbdGroup>
          </div>
        </div>
      </div>

      {/* Editor Component */}
      <div className="flex-1 min-h-0">
        <TextEditor
          value={note}
          onChange={(value) => setNote(value ?? '')}
          language="markdown"
          height="100%"
          detectLinks={true}
        />
      </div>
    </div>
  );
}
