'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { BrowserSnapshot } from '@/stores/browser-automation';

interface AccessibilityTreePanelProps {
  snapshot: BrowserSnapshot | null;
  onElementClick: (refId: string) => void;
}

export function AccessibilityTreePanel({ snapshot, onElementClick }: AccessibilityTreePanelProps) {
  if (!snapshot) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground text-sm">
        No snapshot available. Open the browser and take a snapshot.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b text-xs text-muted-foreground">
        {snapshot.url && (
          <span className="truncate block" title={snapshot.url}>
            {snapshot.title || snapshot.url}
          </span>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {snapshot.elements.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2">No interactive elements found.</div>
          ) : (
            snapshot.elements.map((element) => (
              <Button
                key={element.refId}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-1 px-2 text-xs"
                onClick={() => onElementClick(element.refId)}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-muted mr-2 text-muted-foreground font-mono">
                  {element.refId}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-muted-foreground">[{element.role}]</span>
                  <span className="font-medium truncate max-w-[150px]">{element.name || '(no name)'}</span>
                  {element.value && (
                    <span className="text-muted-foreground truncate max-w-[100px]">
                      = "{element.value}"
                    </span>
                  )}
                </span>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}