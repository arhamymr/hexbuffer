import * as React from 'react';
import { useScratchpadPage } from './hooks/use-scratchpad-page';
import { ScratchpadSidebar } from './components/scratchpad-sidebar';
import { ScratchpadEditorPane } from './components/scratchpad-editor-pane';

export function ScratchpadPage() {
  const hook = useScratchpadPage();

  // ponytail: sidebar + editor page layout using consistent container aesthetics
  return (
    <div className="h-full w-full overflow-hidden bg-background p-2 flex">
      <div className="flex-1 flex border rounded-md overflow-hidden bg-background min-h-0">
        {hook.isSidebarOpen && <ScratchpadSidebar hook={hook} />}
        <ScratchpadEditorPane hook={hook} />
      </div>
    </div>
  );
}
