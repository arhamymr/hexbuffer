import { useState } from 'react';
import { MonacoDiffEditor } from '@/components/ui/monaco-diff-editor';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { useComparerPage } from './hooks/use-comparer-page';
import { ComparerToolbar } from './components/comparer-toolbar';
import { ComparerInputs } from './components/comparer-inputs';

export function ComparerPage() {
  const page = useComparerPage();
  const [showInputs, setShowInputs] = useState(true);

  const copyPanel = async (value: string, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`Copied ${label}`);
  };

  const handlePasteA = async () => {
    try {
      const text = await navigator.clipboard.readText();
      page.setValueA(text);
      toast.success('Pasted into Original (A)');
    } catch (err) {
      toast.error('Could not read from clipboard. Please paste using keyboard shortcut.');
    }
  };

  const handlePasteB = async () => {
    try {
      const text = await navigator.clipboard.readText();
      page.setValueB(text);
      toast.success('Pasted into Modified (B)');
    } catch (err) {
      toast.error('Could not read from clipboard. Please paste using keyboard shortcut.');
    }
  };

  // ponytail: thin page coordinator wiring presentation sub-components together.
  return (
    <div className="flex h-full min-h-0 flex-col bg-background p-2 gap-2">
      <ComparerToolbar
        hasContent={page.hasContent}
        hasDiff={page.hasDiff}
        diffMode={page.diffMode}
        setDiffMode={page.setDiffMode}
        showInputs={showInputs}
        setShowInputs={setShowInputs}
        handleSwap={page.handleSwap}
        handleClear={page.handleClear}
        handleCopy={page.handleCopy}
        valueA={page.valueA}
        valueB={page.valueB}
        copyPanel={copyPanel}
      />

      <div className="min-h-0 flex-1 border rounded-md overflow-hidden relative">
        {showInputs ? (
          <ResizablePanelGroup orientation="vertical" className="h-full">
            <ResizablePanel defaultSize={35} minSize={15}>
              <ComparerInputs
                valueA={page.valueA}
                setValueA={page.setValueA}
                valueB={page.valueB}
                setValueB={page.setValueB}
                handlePasteA={handlePasteA}
                handlePasteB={handlePasteB}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={65} minSize={30}>
              <div className="relative h-full w-full">
                <MonacoDiffEditor
                  originalValue={page.valueA}
                  modifiedValue={page.valueB}
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="relative h-full w-full">
            <MonacoDiffEditor
              originalValue={page.valueA}
              modifiedValue={page.valueB}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}


