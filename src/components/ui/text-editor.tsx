import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { useTheme } from '@/components/theme-provider';
import type { Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

const darkBase = EditorView.theme(
  {
    '&': { backgroundColor: 'oklch(23.639% 0.00479 145.683)', color: 'oklch(0.985 0 0)' },
    '.cm-gutters': { backgroundColor: 'oklch(23.639% 0.00479 145.683)', color: '#7f848e', border: 'none' },
  },
  { dark: true },
);

const darkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#c678dd' },
  { tag: t.atom, color: '#d19a66' },
  { tag: t.number, color: '#d19a66' },
  { tag: t.string, color: '#98c379' },
  { tag: t.variableName, color: '#e06c75' },
  { tag: t.propertyName, color: '#61afef' },
  { tag: t.function(t.variableName), color: '#61afef' },
  { tag: t.lineComment, color: '#7f848e' },
  { tag: t.blockComment, color: '#7f848e' },
  { tag: t.typeName, color: '#e5c07b' },
  { tag: t.bool, color: '#d19a66' },
  { tag: t.operator, color: '#56b6c2' },
  { tag: t.punctuation, color: '#abb2bf' },
  { tag: t.paren, color: '#abb2bf' },
  { tag: t.bracket, color: '#abb2bf' },
  { tag: t.brace, color: '#abb2bf' },
  { tag: t.tagName, color: '#e06c75' },
  { tag: t.attributeName, color: '#d19a66' },
  { tag: t.attributeValue, color: '#98c379' },
]);

const themeDark: Extension = [darkBase, Prec.highest(syntaxHighlighting(darkHighlight))];

// ---------------------------------------------------------------------------

const lightBase = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffffff', color: '#000000ff' },
    '.cm-gutters': { backgroundColor: '#f0efefff', color: '#6c6c6cff', border: 'none' },

    '.cm-cursor': { borderLeftColor: '#528bff' },
    // '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: '#3e4451' },
  },
  { dark: false },
);

const lightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#bf00f9ff' },
  { tag: t.atom, color: '#d19a66' },
  { tag: t.number, color: '#d19a66' },
  { tag: t.string, color: '#4fbd00ff' },
  { tag: t.variableName, color: '#95000cff' },
  { tag: t.propertyName, color: '#0382e9ff' },
  { tag: t.function(t.variableName), color: '#00a100ff' },
  { tag: t.lineComment, color: '#5c6370' },
  { tag: t.blockComment, color: '#3f4653ff' },
  { tag: t.typeName, color: '#f7a000ff' },
  { tag: t.bool, color: '#c08751ff' },
  { tag: t.operator, color: '#2e6f78ff' },
  { tag: t.punctuation, color: '#abb2bf' },
  { tag: t.paren, color: '#abb2bf' },
  { tag: t.bracket, color: '#abb2bf' },
  { tag: t.brace, color: '#abb2bf' },
  { tag: t.tagName, color: '#e06c75' },
  { tag: t.attributeName, color: '#d19a66' },
  { tag: t.attributeValue, color: '#53ae12ff' },
]);

const themeLight: Extension = [lightBase, Prec.highest(syntaxHighlighting(lightHighlight))];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TextEditorOptions {
  readOnly?: boolean;
}

function buildOptionsExtensions(opts?: TextEditorOptions): Extension {
  if (!opts?.readOnly) return [];

  // Block editing keys while keeping contenteditable=true for native selection
  return Prec.highest(keymap.of([
    { key: 'Backspace', run: () => true },
    { key: 'Delete', run: () => true },
    { key: 'Enter', run: () => true },
    { key: 'Cut', run: () => true },
    { key: 'Paste', run: () => true },
  ]));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface TextEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onMount?: (view: EditorView) => void;
  options?: TextEditorOptions;
  height?: string | number;
  path?: string;
  className?: string;
  language?: 'javascript' | 'json' | 'markdown';
}

export function TextEditor({
  value,
  onChange,
  onMount,
  options,
  height = '100%',
  className,
  language = 'javascript',
}: TextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdate = useRef(false);
  const { theme } = useTheme();

  const optionsCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create / recreate EditorView (theme change triggers full rebuild)
  useEffect(() => {
    if (!containerRef.current) return;

    const langMap: Record<string, () => Extension> = {
      javascript,
      json,
      markdown: () => markdown(),
    };
    const langExt = (langMap[language] ?? langMap.javascript)();

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value ?? '',
        extensions: [
          basicSetup,
          langExt,
          EditorView.lineWrapping,
          // Layout: fill container, scroll, enable native text selection
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-content': {
              userSelect: 'text',
              fontSize: '12px',
            },
            '.cm-line': {
              userSelect: 'text',
            },
            '.cm-gutter': {
              fontSize: '12px',
            },
          }),

          // Dynamic compartments
          optionsCompartment.current.of(buildOptionsExtensions(options)),
          theme === 'dark' ? themeDark : themeLight,
          // Update listener
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isExternalUpdate.current) {
              onChangeRef.current?.(update.state.doc.toString());
            }
          }),
        ],
      }),
    });

    viewRef.current = view;
    onMount?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme, language]);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === undefined) return;

    const currentValue = view.state.doc.toString();
    if (value !== currentValue) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  // Sync options changes
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: optionsCompartment.current.reconfigure(buildOptionsExtensions(options)),
    });
  }, [options]);

  return (
    <div
      ref={containerRef}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      className={className}
    />
  );
}
