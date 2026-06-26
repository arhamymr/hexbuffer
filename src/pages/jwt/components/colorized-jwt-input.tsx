import * as React from 'react';

interface ColorizedJwtInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

export function ColorizedJwtInput({
  value,
  onChange,
  placeholder,
}: ColorizedJwtInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const highlightRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const colorized = React.useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parts = trimmed.split('.');
    if (parts.length !== 3) {
      return <span>{trimmed}</span>;
    }
    return (
      <>
        <span style={{ color: '#ef4444' }}>{parts[0]}</span>
        <span style={{ color: '#d4d4d8' }}>.</span>
        <span style={{ color: '#a855f7' }}>{parts[1]}</span>
        <span style={{ color: '#d4d4d8' }}>.</span>
        <span style={{ color: '#06b6d4' }}>{parts[2]}</span>
      </>
    );
  }, [value]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={highlightRef}
        aria-hidden
        className="absolute inset-0 p-3 font-mono text-xs whitespace-pre-wrap break-all overflow-auto pointer-events-none"
      >
        {colorized ?? (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </div>
      <textarea
        ref={textareaRef}
        className="relative min-h-0 h-full w-full resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
        style={{ color: 'transparent', caretColor: 'hsl(var(--foreground))' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
      />
    </div>
  );
}
