'use client';

import {
  useEffect,
  useRef,
} from 'react';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  drawSelection,
  highlightActiveLine,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { cpp } from '@codemirror/lang-cpp';
import { useTheme } from '@/components/theme-provider';
import type { Extension } from '@codemirror/state';

// ---------------------------------------------------------------------------
// Theme definitions (approximate Monaco vs-dark / vs)
// ---------------------------------------------------------------------------

const darkTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#1e1e1e', color: '#d4d4d4' },
    '.cm-content': { caretColor: '#aeafad' },
    '.cm-cursor': { borderLeftColor: '#aeafad' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#264f78',
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
      backgroundColor: '#add6ff',
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
    case 'plaintext':
    default:
      return [];
  }
}

interface TextEditorOptions {
  readOnly?: boolean;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  wordWrap?: 'on' | 'off';
  lineNumbers?: 'on' | 'off';
  scrollBeyondLastLine?: boolean;
  padding?: { top?: number; bottom?: number };
  minimap?: { enabled?: boolean };
  renderWhitespace?: string;
  automaticLayout?: boolean;
  renderValidationDecorations?: string;
}

function buildOptionsExtensions(opts?: TextEditorOptions): Extension {
  if (!opts) return [];

  const extensions: Extension[] = [];
  const themeStyles: Record<string, Record<string, string>> = {};

  // Font size
  const fontSize = opts.fontSize ?? 11;
  themeStyles['.cm-content, .cm-gutter'] = { fontSize: `${fontSize}px` };

  // Line height
  if (opts.lineHeight) {
    themeStyles['.cm-content'] = {
      ...themeStyles['.cm-content'],
      lineHeight: `${opts.lineHeight}px`,
    };
  }

  // Font family
  if (opts.fontFamily) {
    themeStyles['.cm-content'] = {
      ...themeStyles['.cm-content'],
      fontFamily: opts.fontFamily,
    };
  }

  // Padding
  if (opts.padding) {
    const paddingStyles: Record<string, string> = {};
    if (opts.padding.top !== undefined) paddingStyles.paddingTop = `${opts.padding.top}px`;
    if (opts.padding.bottom !== undefined) paddingStyles.paddingBottom = `${opts.padding.bottom}px`;
    themeStyles['.cm-content'] = { ...themeStyles['.cm-content'], ...paddingStyles };
  }

  // Scroll beyond last line
  if (opts.scrollBeyondLastLine) {
    themeStyles['.cm-scroller'] = { paddingBottom: '50vh' };
  }

  if (Object.keys(themeStyles).length > 0) {
    extensions.push(EditorView.theme(themeStyles));
  }

  // Read only — block editing keys while keeping contenteditable=true
  // so the browser's native character-level text selection works.
  if (opts.readOnly) {
    extensions.push(Prec.highest(keymap.of([
      { key: 'Backspace', run: () => true },
      { key: 'Delete', run: () => true },
      { key: 'Enter', run: () => true },
      { key: 'Cut', run: () => true },
      { key: 'Paste', run: () => true },
    ])));
  }

  // Word wrap
  if (opts.wordWrap !== 'off') {
    extensions.push(EditorView.lineWrapping);
  }

  // Line numbers
  if (opts.lineNumbers !== 'off') {
    extensions.push(lineNumbers());
  }

  return extensions;
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
  path,
  className,
}: TextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdate = useRef(false);
  const { theme } = useTheme();

  // Compartments for dynamic reconfiguration
  const optionsCompartment = useRef(new Compartment());
  const languageCompartment = useRef(new Compartment());
  const themeCompartment = useRef(new Compartment());

  // Keep onChange callback fresh without recreating the editor
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create EditorView once
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      // parent: containerRef.current,
      // state: EditorState.create({
      //   doc: value ?? '',
      //   extensions: [
      //     // Layout: editor fills container, scroller handles overflow
      //     EditorView.theme({
      //       '&': { height: '100%' },
      //     }),
      //     // Base extensions (always present)
      //     history(),
      //     drawSelection(),
      //     highlightActiveLine(),
      //     highlightActiveLineGutter(),
      //     bracketMatching(),
      //     syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      //     keymap.of([
      //       ...defaultKeymap,
      //       ...historyKeymap,
      //       ...searchKeymap,
      //       indentWithTab,
      //     ]),

      //     // Dynamic compartments
      //     optionsCompartment.current.of(buildOptionsExtensions(options)),
      //     languageCompartment.current.of(buildLanguageExtension(language)),
      //     themeCompartment.current.of(
      //       theme === 'dark' ? darkTheme : lightTheme,
      //     ),

      //     // Update listener for onChange
      //     EditorView.updateListener.of((update) => {
      //       if (update.docChanged && !isExternalUpdate.current) {
      //         onChangeRef.current?.(update.state.doc.toString());
      //       }
      //     }),
      //   ],
      // }),
    });

    viewRef.current = view;
    onMount?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount — updates handled by separate effects below
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
      effects: optionsCompartment.current.reconfigure(
        buildOptionsExtensions(options),
      ),
    });
  }, [options]);

  // Sync language changes
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: languageCompartment.current.reconfigure(
        buildLanguageExtension(language),
      ),
    });
  }, [language]);

  // Sync theme changes
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.current.reconfigure(
        theme === 'dark' ? darkTheme : lightTheme,
      ),
    });
  }, [theme]);

  const containerStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={className}
    />
  );
}
