'use client';

import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { useTheme } from '@/components/theme-provider';
import type { Extension } from '@codemirror/state';

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

const darkBaseTheme = EditorView.theme(
  {
    '&': { backgroundColor: 'oklch(23.639% 0.00479 145.683)', color: 'oklch(0.985 0 0)' },
  },
  { dark: true },
);

const darkHighlightStyle = HighlightStyle.define([
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

const darkTheme: Extension = [darkBaseTheme, syntaxHighlighting(darkHighlightStyle)];

const lightBaseTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffff', color: '#000000' },
  },
  { dark: false },
);

const lightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#a626a4' },
  { tag: t.atom, color: '#986801' },
  { tag: t.number, color: '#986801' },
  { tag: t.string, color: '#50a14f' },
  { tag: t.variableName, color: '#e45649' },
  { tag: t.propertyName, color: '#4078f2' },
  { tag: t.function(t.variableName), color: '#4078f2' },
  { tag: t.lineComment, color: '#a0a1a7' },
  { tag: t.blockComment, color: '#a0a1a7' },
  { tag: t.typeName, color: '#c18401' },
  { tag: t.bool, color: '#986801' },
  { tag: t.operator, color: '#0184bc' },
  { tag: t.punctuation, color: '#383a42' },
  { tag: t.paren, color: '#383a42' },
  { tag: t.bracket, color: '#383a42' },
  { tag: t.brace, color: '#383a42' },
  { tag: t.tagName, color: '#e45649' },
  { tag: t.attributeName, color: '#986801' },
  { tag: t.attributeValue, color: '#50a14f' },
]);

const lightTheme: Extension = [lightBaseTheme, syntaxHighlighting(lightHighlightStyle)];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLanguageExtension(language?: string): Extension {
  switch (language) {
    case 'javascript':
      return javascript();
    case 'html':
      return html();
    case 'markdown':
      return markdown();
    case 'c':
      return cpp();
    case 'cpp':
      return cpp();
    case 'rust':
      return rust();
    default:
      return [];
  }
}

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
  language?: string;
  onChange?: (value: string | undefined) => void;
  onMount?: (view: EditorView) => void;
  options?: TextEditorOptions;
  height?: string | number;
  path?: string;
  className?: string;
}

export function TextEditor({
  value,
  language,
  onChange,
  onMount,
  options,
  height = '100%',
  className,
}: TextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdate = useRef(false);
  const { theme } = useTheme();

  const optionsCompartment = useRef(new Compartment());
  const languageCompartment = useRef(new Compartment());
  const themeCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create EditorView once
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value ?? '',
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          // Layout: fill container, scroll, enable native text selection
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-content': {
              userSelect: 'text',
              fontSize: '11px',
            },
            '.cm-line': {
              userSelect: 'text',
            },
            '.cm-gutter': {
              fontSize: '11px',
            },
          }),

          // Dynamic compartments
          optionsCompartment.current.of(buildOptionsExtensions(options)),
          languageCompartment.current.of(buildLanguageExtension(language)),
          themeCompartment.current.of(theme === 'dark' ? darkTheme : lightTheme),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Sync language changes
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: languageCompartment.current.reconfigure(buildLanguageExtension(language)),
    });
  }, [language]);

  // Sync theme changes
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.current.reconfigure(theme === 'dark' ? darkTheme : lightTheme),
    });
  }, [theme]);

  return (
    <div
      ref={containerRef}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      className={className}
    />
  );
}
