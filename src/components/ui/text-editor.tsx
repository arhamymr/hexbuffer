'use client';

import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
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

const darkTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#1e1e1e', color: '#d4d4d4' },
    '.cm-content': { caretColor: '#aeafad' },
    '.cm-cursor': { borderLeftColor: '#aeafad' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#0d7a3e',
    },
    '.cm-activeLine': { backgroundColor: '#2a2d2e' },
    '.cm-gutters': {
      backgroundColor: '#1e1e1e',
      color: '#858585',
      borderRight: '1px solid #333',
    },
    '.cm-activeLineGutter': { backgroundColor: '#2a2d2e', color: '#c6c6c6' },
    '.cm-foldPlaceholder': { backgroundColor: '#404040', color: '#d4d4d4' },
  },
  { dark: true },
);

const lightTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffff', color: '#000000' },
    '.cm-content': { caretColor: '#000000' },
    '.cm-cursor': { borderLeftColor: '#000000' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#8ce0a8',
    },
    '.cm-activeLine': { backgroundColor: '#f0f0f0' },
    '.cm-gutters': {
      backgroundColor: '#f5f5f5',
      color: '#999',
      borderRight: '1px solid #e0e0e0',
    },
    '.cm-activeLineGutter': { backgroundColor: '#e8e8e8', color: '#333' },
  },
  { dark: false },
);

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
          // Layout: fill container, scroll, enable native text selection
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-content': { userSelect: 'text' },
            '.cm-content, .cm-gutter': { fontSize: '11px' },
          }),
          // Dynamic compartments
          // optionsCompartment.current.of(buildOptionsExtensions(options)),
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
