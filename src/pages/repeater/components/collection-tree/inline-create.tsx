import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

export interface InlineCreateProps {
  depth: number;
  type: 'endpoint';
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function InlineCreate({ depth, type, onSubmit, onCancel }: InlineCreateProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  const placeholder = 'Endpoint name...';

  const handleSubmit = () => {
    const name = inputRef.current?.value.trim();
    if (name) {
      onSubmit(name);
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-1 py-0.5"
      style={{ paddingLeft: `${depth * 16 + 4}px` }}
    >
      <span className="w-4 flex-shrink-0" />
      <span className="w-3.5 flex-shrink-0" />

      <form
        className="flex-1 flex items-center gap-1 min-w-0"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Input
          ref={inputRef}
          className="h-6 text-xs"
          placeholder={placeholder}
          onBlur={() => {
            // Delay to allow submit button click to register
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                onCancel();
              }
            }, 200);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <button
          type="submit"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Create endpoint"
        >
          <Plus className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}
