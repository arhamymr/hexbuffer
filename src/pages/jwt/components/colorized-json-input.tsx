import * as React from 'react';

// ── JSON Tokenizer ──────────────────────────────────────────

type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'whitespace';

interface Token {
  text: string;
  type: TokenType;
}

const TYPE_CLASSES: Record<TokenType, string> = {
  key: 'text-blue-400 dark:text-blue-300',
  string: 'text-green-400 dark:text-green-300',
  number: 'text-amber-400 dark:text-amber-300',
  boolean: 'text-purple-400 dark:text-purple-300',
  null: 'text-gray-400 dark:text-gray-500',
  punctuation: 'text-muted-foreground',
  whitespace: '',
};

function tokenizeJson(str: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    // Whitespace
    if (/\s/.test(ch)) {
      let start = i;
      while (i < str.length && /\s/.test(str[i])) i++;
      tokens.push({ text: str.slice(start, i), type: 'whitespace' });
      continue;
    }

    // String (potential key or value)
    if (ch === '"') {
      const start = i;
      i++; // opening quote
      while (i < str.length) {
        if (str[i] === '\\') { i += 2; continue; }
        if (str[i] === '"') { i++; break; }
        i++;
      }
      const text = str.slice(start, i);

      // Peek ahead: if next non-whitespace is ':', it's a key
      let peek = i;
      while (peek < str.length && /\s/.test(str[peek])) peek++;
      const isKey = peek < str.length && str[peek] === ':';

      tokens.push({ text, type: isKey ? 'key' : 'string' });
      continue;
    }

    // Number (negative, integer, decimal, scientific)
    if (/[-\d]/.test(ch)) {
      // Only treat as number if preceded by non-identifier char (not part of a keyword)
      const prev = tokens.length > 0 ? tokens[tokens.length - 1].text.slice(-1) : '';
      if (!/[a-zA-Z0-9_]/.test(prev) || prev === '') {
        // But ensure it actually looks like a number
        let start = i;
        if (str[i] === '-') i++;
        let hasDigit = false;
        while (i < str.length && /\d/.test(str[i])) { hasDigit = true; i++; }
        if (hasDigit) {
          if (i < str.length && str[i] === '.') {
            i++;
            while (i < str.length && /\d/.test(str[i])) i++;
          }
          if (i < str.length && (str[i] === 'e' || str[i] === 'E')) {
            i++;
            if (i < str.length && (str[i] === '+' || str[i] === '-')) i++;
            while (i < str.length && /\d/.test(str[i])) i++;
          }
          tokens.push({ text: str.slice(start, i), type: 'number' });
          continue;
        }
        i = start; // reset, not a number after all
      }
    }

    // Keywords: true, false, null
    let keywordMatched = false;
    for (const kw of ['true', 'false', 'null']) {
      if (str.slice(i, i + kw.length) === kw) {
        const after = str[i + kw.length];
        if (after === undefined || /[\s,}\]\]]/.test(after)) {
          tokens.push({ text: kw, type: kw === 'null' ? 'null' : 'boolean' });
          i += kw.length;
          keywordMatched = true;
          break;
        }
      }
    }
    if (keywordMatched) continue;

    // Punctuation: { } [ ] : ,
    if ('{}[]:,'.includes(ch)) {
      tokens.push({ text: ch, type: 'punctuation' });
      i++;
      continue;
    }

    // Fallback: treat as punctuation / unknown
    tokens.push({ text: ch, type: 'punctuation' });
    i++;
  }

  return tokens;
}

// ── Component ───────────────────────────────────────────────

interface ColorizedJsonInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function ColorizedJsonInput({
  value,
  onChange,
  placeholder = '',
  minHeight = '80px',
}: ColorizedJsonInputProps) {
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
    if (!trimmed) {
      return placeholder ? (
        <span className="text-muted-foreground">{placeholder}</span>
      ) : null;
    }

    const tokens = tokenizeJson(value);
    return tokens.map((token, idx) => (
      <span key={idx} className={TYPE_CLASSES[token.type] || undefined}>
        {token.text}
      </span>
    ));
  }, [value, placeholder]);

  return (
    <div className="relative" style={{ minHeight }}>
      <div
        ref={highlightRef}
        aria-hidden
        className="absolute inset-0 p-2.5 font-mono text-xs whitespace-pre-wrap break-all overflow-auto pointer-events-none"
      >
        {colorized}
      </div>
      <textarea
        ref={textareaRef}
        className="relative w-full resize-none rounded-md border border-input bg-muted/5 font-mono text-xs shadow-none focus-visible:ring-1 p-2.5"
        style={{
          minHeight,
          color: 'transparent',
          caretColor: 'hsl(var(--foreground))',
        }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
      />
    </div>
  );
}
