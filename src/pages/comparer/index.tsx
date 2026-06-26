import { Button } from '@/components/ui/button';
import { MonacoDiffEditor } from '@/components/ui/monaco-diff-editor';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useComparerPage } from './hooks/use-comparer-page';

export function ComparerPage() {
  const page = useComparerPage();

  const copyPanel = async (value: string, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`Copied ${label}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background p-2 gap-2">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center justify-between border rounded-md bg-muted/40 px-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Diff</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyPanel(page.valueA, 'A')}
            disabled={!page.valueA}
            className="h-6 text-[11px] gap-1 px-2"
          >
            <Copy className="h-3 w-3" />
            Copy A
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyPanel(page.valueB, 'B')}
            disabled={!page.valueB}
            className="h-6 text-[11px] gap-1 px-2"
          >
            <Copy className="h-3 w-3" />
            Copy B
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 border rounded-md overflow-hidden">
        <MonacoDiffEditor
          originalValue={page.valueA}
          modifiedValue={page.valueB}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
