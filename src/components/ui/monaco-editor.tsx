'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import type * as Monaco from 'monaco-editor';

const globalScope = self as unknown as {
  MonacoEnvironment?: Monaco.Environment;
};

type MonacoApi = typeof Monaco;
type MonacoEditorInstance = Monaco.editor.IStandaloneCodeEditor;
type MonacoTextModel = Monaco.editor.ITextModel;

let monacoPromise: Promise<MonacoApi> | null = null;

function loadMonaco() {
  monacoPromise ??= Promise.all([
    import('monaco-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/css/css.worker?worker'),
    import('monaco-editor/esm/vs/language/html/html.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
  ]).then(([monaco, editorWorker, cssWorker, htmlWorker, jsonWorker, tsWorker]) => {
    globalScope.MonacoEnvironment ??= {
      getWorker(_workerId, label) {
        switch (label) {
          case 'css':
          case 'scss':
          case 'less':
            return new cssWorker.default();
          case 'html':
          case 'handlebars':
          case 'razor':
            return new htmlWorker.default();
          case 'json':
            return new jsonWorker.default();
          case 'javascript':
          case 'typescript':
            return new tsWorker.default();
          default:
            return new editorWorker.default();
        }
      },
    };

    return monaco;
  });

  return monacoPromise;
}

export interface MonacoEditorProps {
  value?: string;
  language?: string;
  path?: string | null;
  onChange?: (value: string) => void;
  onMount?: (editor: MonacoEditorInstance) => void;
  options?: Monaco.editor.IStandaloneEditorConstructionOptions;
  className?: string;
}

export function MonacoEditor({
  value = '',
  language,
  path,
  onChange,
  onMount,
  options,
  className,
}: MonacoEditorProps) {
  const { theme } = useTheme();
  const [monacoApi, setMonacoApi] = useState<MonacoApi | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const modelRef = useRef<MonacoTextModel | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdateRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    loadMonaco().then((monaco) => {
      if (isMounted) setMonacoApi(monaco);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!monacoApi || !containerRef.current || editorRef.current) return;

    const editor = monacoApi.editor.create(containerRef.current, {
      automaticLayout: true,
      cursorBlinking: 'smooth',
      fontFamily: 'Geist Mono Variable, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontLigatures: true,
      fontSize: 12,
      lineHeight: 19,
      minimap: { enabled: false },
      padding: { top: 12, bottom: 12 },
      renderLineHighlight: 'all',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      tabSize: 2,
      theme: theme === 'dark' ? 'vs-dark' : 'vs',
      wordWrap: 'on',
      ...options,
    });

    const subscription = editor.onDidChangeModelContent(() => {
      if (isExternalUpdateRef.current) return;
      const model = editor.getModel();
      if (!model) return;
      onChangeRef.current?.(model.getValue());
    });

    editorRef.current = editor;
    onMount?.(editor);

    return () => {
      subscription.dispose();
      editor.dispose();
      modelRef.current?.dispose();
      modelRef.current = null;
      editorRef.current = null;
    };
    // The editor is intentionally created once; dynamic props sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monacoApi]);

  useEffect(() => {
    monacoApi?.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
  }, [monacoApi, theme]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!monacoApi || !editor) return;

    const uri = path
      ? monacoApi.Uri.parse(`apprecon://editor/${encodeURIComponent(path)}`)
      : undefined;

    const currentModel = modelRef.current;
    const shouldReplaceModel =
      !currentModel || (uri && currentModel.uri.toString() !== uri.toString());

    if (shouldReplaceModel) {
      currentModel?.dispose();
      const model = monacoApi.editor.createModel(value, language || undefined, uri);
      modelRef.current = model;
      editor.setModel(model);
      return;
    }

    if (language && currentModel.getLanguageId() !== language) {
      monacoApi.editor.setModelLanguage(currentModel, language);
    }

    if (currentModel.getValue() !== value) {
      isExternalUpdateRef.current = true;
      currentModel.pushEditOperations(
        [],
        [{ range: currentModel.getFullModelRange(), text: value }],
        () => null,
      );
      isExternalUpdateRef.current = false;
    }
  }, [language, monacoApi, path, value]);

  useEffect(() => {
    editorRef.current?.updateOptions(options ?? {});
  }, [options]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}
