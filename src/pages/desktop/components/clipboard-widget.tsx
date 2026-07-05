import * as React from 'react';
import { TrashIcon, CopyIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useClipboardStore } from '@/stores/clipboard';
import { motion, AnimatePresence } from 'motion/react';

export function ClipboardWidget() {
  const { history, clearHistory } = useClipboardStore();

  const handleCopyItem = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard', {
        duration: 1500,
      });
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="p-2 rounded-md border bg-muted backdrop-blur-md flex flex-col gap-2 select-none group/widget">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
          Clipboard History
        </span>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="p-0.5 rounded opacity-0 group-hover/widget:opacity-100 hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all duration-150 active:scale-95 cursor-pointer"
            title="Clear clipboard history"
          >
            <TrashIcon className="size-3" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto scrollbar-thin pr-0.5">
        <AnimatePresence initial={false}>
          {history.map((item) => {
            // Replace newlines with return arrow to fit neatly in one line preview
            const displayLine = item.replace(/\r?\n/g, ' ↵ ');
            return (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                onClick={() => handleCopyItem(item)}
                className="flex items-center justify-between gap-2 p-1.5 rounded-sm hover:bg-muted-foreground/5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer active:scale-[0.99] group/item"
                title={item}
              >
                <span className="truncate flex-1">
                  {displayLine}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyItem(item);
                  }}
                  className="p-1 rounded opacity-0 group-hover/item:opacity-100 hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-90 cursor-pointer"
                  title="Copy text"
                >
                  <CopyIcon className="size-3" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {history.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-6 px-2 text-center border border-dashed rounded-sm border-border/80 bg-muted/10"
          >
            <CopyIcon className="size-4 text-muted-foreground/60 mb-1" />
            <span className="text-[9px] text-muted-foreground font-mono">No items in clipboard</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
