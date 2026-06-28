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

function colorizeUrl(url: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\{\{(\w+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(url)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{url.slice(lastIndex, match.index)}</span>,
      );
    }
    parts.push(
      <span
        key={key++}
        className="text-sky-400 dark:text-sky-300 font-semibold"
      >
        {match[0]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < url.length) {
    parts.push(<span key={key++}>{url.slice(lastIndex)}</span>);
  }

  if (parts.length === 0) {
    return <span>{url}</span>;
  }

  return <>{parts}</>;
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

export function ColorizedUrlInput({
  value,
  onChange,
  placeholder = '',
  className,
}: ColorizedUrlInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const highlightRef = React.useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [popoverQuery, setPopoverQuery] = React.useState('');

  const envVarKeys = useEnvVarKeys();

  const handleScroll = () => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const findTrigger = React.useCallback(
    (val: string, cursorPos: number) => {
      const beforeCursor = val.slice(0, cursorPos);
      const lastOpen = beforeCursor.lastIndexOf('{{');
      if (lastOpen === -1) return null;

      const afterOpen = beforeCursor.slice(lastOpen);
      if (afterOpen.includes('}}')) return null;

      const queryText = afterOpen.slice(2);
      return { queryText };
    },
    [],
  );

  const evaluatePopover = React.useCallback(
    (val: string) => {
      const input = inputRef.current;
      const cursorPos = input?.selectionStart ?? 0;
      const trigger = findTrigger(val, cursorPos);

      if (trigger) {
        setPopoverQuery(trigger.queryText);
        setPopoverOpen(true);
      } else {
        setPopoverOpen(false);
      }
    },
    [findTrigger],
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      evaluatePopover(newValue);
    },
    [onChange, evaluatePopover],
  );

  const handleClick = React.useCallback(() => {
    evaluatePopover(value);
  }, [value, evaluatePopover]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && popoverOpen) {
        e.preventDefault();
        setPopoverOpen(false);
      }
    },
    [popoverOpen],
  );

  const handleSelectVar = React.useCallback(
    (varKey: string) => {
      const input = inputRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart ?? 0;
      const beforeCursor = value.slice(0, cursorPos);
      const afterCursor = value.slice(cursorPos);

      const lastOpen = beforeCursor.lastIndexOf('{{');
      if (lastOpen === -1) return;

      const newValue =
        beforeCursor.slice(0, lastOpen) + '{{' + varKey + '}}' + afterCursor;
      const newCursorPos = lastOpen + varKey.length + 4;

      onChange(newValue);
      setPopoverOpen(false);

      requestAnimationFrame(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    [value, onChange],
  );

  const filteredVars = React.useMemo(() => {
    if (!popoverQuery) return envVarKeys;
    const q = popoverQuery.toLowerCase();
    return envVarKeys.filter((k) => k.toLowerCase().includes(q));
  }, [envVarKeys, popoverQuery]);

  const colorized = React.useMemo(() => {
    if (!value) {
      return placeholder ? (
        <span className="text-muted-foreground">{placeholder}</span>
      ) : null;
    }
    return colorizeUrl(value);
  }, [value, placeholder]);

  const shouldShowPopover = popoverOpen && envVarKeys.length > 0;

  return (
    <Popover open={shouldShowPopover} onOpenChange={setPopoverOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <div
            ref={highlightRef}
            aria-hidden
            className={cn(
              'absolute inset-0 flex items-center px-3 text-sm whitespace-nowrap overflow-hidden pointer-events-none select-none',
              className,
            )}
          >
            {colorized}
          </div>
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            className={cn(
              'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-7 w-full min-w-0 rounded-sm border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              className,
            )}
            style={{
              color: 'transparent',
              caretColor: 'var(--foreground)',
            }}
          />
        </div>
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
