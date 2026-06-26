import * as React from 'react';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global "/" keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative flex items-center mx-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-7 w-44 rounded-md border border-input bg-background pl-7 pr-2',
          'text-xs text-foreground placeholder:text-muted-foreground',
          'outline-none transition-all duration-200',
          'focus:w-64 focus:border-primary/50 focus:ring-1 focus:ring-primary/30',
        )}
      />
    </div>
  );
}
