import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

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

    // Number
    if (/[-\d]/.test(ch)) {
      const prev = tokens.length > 0 ? tokens[tokens.length - 1].text.slice(-1) : '';
      if (!/[a-zA-Z0-9_]/.test(prev) || prev === '') {
        let start = i;
        if (str[i] === '-') i++;
        let hasDigit = false;
        while (i < str.length && /\d/.test(str[i])) { hasDigit = true; i++; }
        if (hasDigit) {
          if (i < str.length && str[i] === '.') {
            i++;
            while (i < str.length && /\d/.test(str[i])) i++;
          }
          tokens.push({ text: str.slice(start, i), type: 'number' });
          continue;
        }
        i = start;
      }
    }

    // Keywords
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

    // Punctuation
    if ('{}[]:,'.includes(ch)) {
      tokens.push({ text: ch, type: 'punctuation' });
      i++;
      continue;
    }

    tokens.push({ text: ch, type: 'punctuation' });
    i++;
  }

  return tokens;
}

interface ColorizedJsonViewProps {
  value: string;
}

export function ColorizedJsonView({ value }: ColorizedJsonViewProps) {
  const colorized = React.useMemo(() => {
    if (!value.trim()) {
      return <span className="text-muted-foreground">Empty matrix output</span>;
    }
    const tokens = tokenizeJson(value);
    return tokens.map((token, idx) => (
      <span key={idx} className={TYPE_CLASSES[token.type] || undefined}>
        {token.text}
      </span>
    ));
  }, [value]);

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-3 font-mono text-xs whitespace-pre select-text">
        <code>{colorized}</code>
      </div>
    </ScrollArea>
  );
}
