import * as React from 'react';
import { useCollectionsStore } from '@/stores/collections';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorizedUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function colorizeHtml(value: string): string {
  return value.replace(
    /\{\{(\w+)\}\}/g,
    '<span class="text-sky-400 dark:text-sky-300 font-semibold">{{$1}}</span>',
  );
}

function useEnvVarKeys(): string[] {
  const contexts = useCollectionsStore((s) => s.contexts);
  return React.useMemo(() => {
    const keys = new Set<string>();
    for (const ctx of contexts) {
      try {
        const vars = JSON.parse(ctx.variables);
        if (Array.isArray(vars)) {
          for (const v of vars) {
            if (v.key?.trim()) keys.add(v.key.trim());
          }
        }
      } catch {
        // ignore malformed json
      }
    }
    return Array.from(keys).sort();
  }, [contexts]);
}

function getCaretOffset(container: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.endContainer, range.endOffset);
  return preRange.toString().length;
}

function setCaretOffset(container: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;

  let charCount = 0;
  const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node: Text | null;

  while ((node = walk.nextNode() as Text | null)) {
    const len = node.length;
    if (charCount + len >= offset) {
      const range = document.createRange();
      range.setStart(node, offset - charCount);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    charCount += len;
  }

  // fallback: end of content
  const range = document.createRange();
  range.selectNodeContents(container);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function ColorizedUrlInput({
  value,
  onChange,
  placeholder = '',
  className,
}: ColorizedUrlInputProps) {
  const editableRef = React.useRef<HTMLDivElement>(null);
  const isInternalUpdate = React.useRef(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [popoverQuery, setPopoverQuery] = React.useState('');

  const envVarKeys = useEnvVarKeys();

  // Sync innerHTML when value changes externally
  React.useEffect(() => {
    const el = editableRef.current;
    if (!el || isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const caret = getCaretOffset(el);
    el.innerHTML = value ? colorizeHtml(value) : '';

    // Restore cursor if content still exists
    if (value) {
      setCaretOffset(el, Math.min(caret, value.length));
    }

    el.dataset.placeholder = value ? '' : placeholder;
  }, [value, placeholder]);

  // Set initial placeholder on mount
  React.useEffect(() => {
    const el = editableRef.current;
    if (el) {
      el.dataset.placeholder = value ? '' : placeholder;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findTriggerForPos = React.useCallback(
    (text: string, pos: number) => {
      const beforeCursor = text.slice(0, pos);
      const lastOpen = beforeCursor.lastIndexOf('{{');
      if (lastOpen === -1) return null;

      const afterOpen = beforeCursor.slice(lastOpen);
      if (afterOpen.includes('}}')) return null;

      const queryText = afterOpen.slice(2);
      return { queryText, openIndex: lastOpen };
    },
    [],
  );

  const evaluatePopover = React.useCallback(() => {
    const el = editableRef.current;
    if (!el) return;

    const text = el.textContent ?? '';
    const caret = getCaretOffset(el);
    const trigger = findTriggerForPos(text, caret);

    if (trigger) {
      setPopoverQuery(trigger.queryText);
      setPopoverOpen(true);
    } else {
      setPopoverOpen(false);
    }
  }, [findTriggerForPos]);

  const handleInput = React.useCallback(() => {
    const el = editableRef.current;
    if (!el) return;

    const plainText = el.textContent ?? '';
    isInternalUpdate.current = true;
    onChange(plainText);
    evaluatePopover();
  }, [onChange, evaluatePopover]);

  const handleClick = React.useCallback(() => {
    evaluatePopover();
  }, [evaluatePopover]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && popoverOpen) {
        e.preventDefault();
        setPopoverOpen(false);
      }
    },
    [popoverOpen],
  );

  const handleSelectVar = React.useCallback(
    (varKey: string) => {
      const el = editableRef.current;
      if (!el) return;

      const plainText = el.textContent ?? '';
      const caret = getCaretOffset(el);

      const trigger = findTriggerForPos(plainText, caret);
      if (!trigger) return;

      const beforeOpen = plainText.slice(0, trigger.openIndex);
      const afterCursor = plainText.slice(caret);
      const newValue = beforeOpen + '{{' + varKey + '}}' + afterCursor;
      const newCaret = beforeOpen.length + varKey.length + 4;

      isInternalUpdate.current = true;
      onChange(newValue);
      setPopoverOpen(false);

      requestAnimationFrame(() => {
        if (editableRef.current) {
          editableRef.current.innerHTML = colorizeHtml(newValue);
          setCaretOffset(editableRef.current, newCaret);
        }
      });
    },
    [onChange, findTriggerForPos],
  );

  const filteredVars = React.useMemo(() => {
    if (!popoverQuery) return envVarKeys;
    const q = popoverQuery.toLowerCase();
    return envVarKeys.filter((k) => k.toLowerCase().includes(q));
  }, [envVarKeys, popoverQuery]);

  const shouldShowPopover = popoverOpen && envVarKeys.length > 0;

  return (
    <Popover open={shouldShowPopover} onOpenChange={setPopoverOpen}>
      <PopoverAnchor asChild>
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          data-placeholder={value ? '' : placeholder}
          onInput={handleInput}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'border-input min-h-7 w-full min-w-0 rounded-sm border bg-transparent px-3 py-1 text-sm transition-[color,box-shadow] outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'h-7 overflow-hidden whitespace-nowrap text-ellipsis focus:h-auto focus:overflow-y-auto focus:whitespace-pre-wrap focus:break-all',
            'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground',
            className,
          )}
        />
      </PopoverAnchor>
      <PopoverContent
        className="w-56 p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Environment Variables
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filteredVars.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              No matching variables
            </div>
          ) : (
            filteredVars.map((varKey) => (
              <button
                key={varKey}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectVar(varKey);
                }}
              >
                <span className="text-sky-400 dark:text-sky-300 font-mono text-xs font-semibold">
                  {`{{${varKey}}}`}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
