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

function colorizeHtml(value: string, envVarKeys: string[]): string {
  const keysSet = new Set(envVarKeys);
  return value.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => {
      if (keysSet.has(key)) {
        return `<span class="text-sky-400 dark:text-sky-300 font-semibold">${match}</span>`;
      }
      return match;
    }
  );
}

function useEnvVarKeys(): string[] {
  const contexts = useCollectionsStore((s) => s.contexts);
  const activeContextId = useCollectionsStore((s) => s.activeContextId);
  return React.useMemo(() => {
    const keys = new Set<string>();
    const activeCtx = contexts.find((c) => c.id === activeContextId);
    if (activeCtx) {
      try {
        const vars = JSON.parse(activeCtx.variables);
        if (Array.isArray(vars)) {
          for (const v of vars) {
            if (v.key?.trim() && v.enabled !== false) keys.add(v.key.trim());
          }
        }
      } catch {
        // ignore malformed json
      }
    }
    return Array.from(keys).sort();
  }, [contexts, activeContextId]);
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
  const listRef = React.useRef<HTMLDivElement>(null);
  const isInternalUpdate = React.useRef(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [popoverQuery, setPopoverQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  const envVarKeys = useEnvVarKeys();
  const activeContextId = useCollectionsStore((s) => s.activeContextId);

  // Sync innerHTML when value changes externally or environment keys change
  React.useEffect(() => {
    const el = editableRef.current;
    if (!el || isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    el.innerHTML = value ? colorizeHtml(value, envVarKeys) : '';

    // Only restore caret position if this element currently has focus;
    // otherwise setCaretOffset would steal focus from whatever field
    // the user is actively editing (e.g. a query param input).
    if (value && document.activeElement === el) {
      const caret = getCaretOffset(el);
      setCaretOffset(el, Math.min(caret, value.length));
    }

    el.dataset.placeholder = value ? '' : placeholder;
  }, [value, placeholder, envVarKeys]);

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
          editableRef.current.innerHTML = colorizeHtml(newValue, envVarKeys);
          setCaretOffset(editableRef.current, newCaret);
        }
      });
    },
    [onChange, findTriggerForPos, envVarKeys],
  );

  const filteredVars = React.useMemo(() => {
    if (!popoverQuery) return envVarKeys;
    const q = popoverQuery.toLowerCase();
    return envVarKeys.filter((k) => k.toLowerCase().includes(q));
  }, [envVarKeys, popoverQuery]);

  // Reset highlighted index when filtering changes
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredVars.length, popoverQuery]);

  // Scroll active item into view
  React.useEffect(() => {
    if (popoverOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, popoverOpen]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (popoverOpen && filteredVars.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % filteredVars.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + filteredVars.length) % filteredVars.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const selected = filteredVars[highlightedIndex];
          if (selected) {
            handleSelectVar(selected);
          }
          return;
        }
      }

      if (e.key === 'Enter') {
        // Prevent newline insertion since this input should be single-line
        e.preventDefault();
      }

      if (e.key === 'Escape' && popoverOpen) {
        e.preventDefault();
        setPopoverOpen(false);
      }
    },
    [popoverOpen, filteredVars, highlightedIndex, handleSelectVar],
  );

  const shouldShowPopover = popoverOpen;

  const handleBlur = React.useCallback(() => {
    // ponytail: reset scroll offsets when blurred so text-ellipsis displays from the start
    const el = editableRef.current;
    if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
  }, []);

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
          onBlur={handleBlur}
          className={cn(
            'border-input min-h-7 w-full min-w-0 rounded-sm border bg-transparent px-3 py-1 text-sm transition-[color,box-shadow] outline-none',
            'focus-visible:border-primary',
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
        <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/20">
          Environment Variables
        </div>
        <div className="max-h-48 overflow-y-auto p-1 space-y-0.5" ref={listRef}>
          {filteredVars.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground leading-relaxed">
              {!activeContextId ? (
                <span>No active environment.<br />Select one to use variables.</span>
              ) : (
                <span>No matching variables</span>
              )}
            </div>
          ) : (
            filteredVars.map((varKey, idx) => (
              <button
                key={varKey}
                data-highlighted={idx === highlightedIndex}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left transition-all duration-150 active:scale-[0.98] cursor-pointer',
                  idx === highlightedIndex
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'hover:bg-accent/50 hover:text-accent-foreground text-muted-foreground',
                )}
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
