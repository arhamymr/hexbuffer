import { Button } from '@/components/ui/button';
import { ClipboardIcon } from '@phosphor-icons/react';

interface ComparerInputsProps {
  valueA: string;
  setValueA: (val: string) => void;
  valueB: string;
  setValueB: (val: string) => void;
  handlePasteA: () => void;
  handlePasteB: () => void;
}

export function ComparerInputs({
  valueA,
  setValueA,
  valueB,
  setValueB,
  handlePasteA,
  handlePasteB,
}: ComparerInputsProps) {
  // ponytail: extracted input card grid layout to keep index.tsx readable and clean.
  return (
    <div className="grid grid-cols-2 gap-2 h-full p-2 bg-muted/10">
      {/* Input A */}
      <div className="flex flex-col border rounded-md bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
        <div className="flex h-8 shrink-0 items-center justify-between bg-muted/40 px-2.5 border-b">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Original Text (A)</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={handlePasteA}
              className="h-5 text-[10px] gap-1 px-1.5"
            >
              <ClipboardIcon className="h-3.5 w-3.5" />
              Paste
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setValueA('')}
              disabled={!valueA}
              className="h-5 text-[10px] px-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Clear
            </Button>
          </div>
        </div>
        <textarea
          value={valueA}
          onChange={(e) => setValueA(e.target.value)}
          placeholder="Paste or type original text here..."
          className="flex-1 p-2.5 text-xs font-mono resize-none outline-none bg-transparent border-0 ring-0 focus:ring-0 min-h-0 text-foreground"
        />
      </div>

      {/* Input B */}
      <div className="flex flex-col border rounded-md bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
        <div className="flex h-8 shrink-0 items-center justify-between bg-muted/40 px-2.5 border-b">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Modified Text (B)</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={handlePasteB}
              className="h-5 text-[10px] gap-1 px-1.5"
            >
              <ClipboardIcon className="h-3.5 w-3.5" />
              Paste
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setValueB('')}
              disabled={!valueB}
              className="h-5 text-[10px] px-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Clear
            </Button>
          </div>
        </div>
        <textarea
          value={valueB}
          onChange={(e) => setValueB(e.target.value)}
          placeholder="Paste or type modified text here..."
          className="flex-1 p-2.5 text-xs font-mono resize-none outline-none bg-transparent border-0 ring-0 focus:ring-0 min-h-0 text-foreground"
        />
      </div>
    </div>
  );
}
