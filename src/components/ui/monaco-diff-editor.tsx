import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import type * as Monaco from 'monaco-editor';

const globalScope = self as unknown as {
  MonacoEnvironment?: Monaco.Environment;
};

type MonacoApi = typeof Monaco;
type MonacoDiffEditorInstance = Monaco.editor.IDiffEditor;
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

export interface MonacoDiffEditorProps {
  originalValue?: string;
  modifiedValue?: string;
  language?: string;
  originalPath?: string | null;
  modifiedPath?: string | null;
  options?: Monaco.editor.IDiffEditorConstructionOptions;
  className?: string;
}

export function MonacoDiffEditor({
  originalValue = '',
  modifiedValue = '',
  language,
  originalPath,
  modifiedPath,
  options,
  className,
}: MonacoDiffEditorProps) {
  const { theme } = useTheme();
  const [monacoApi, setMonacoApi] = useState<MonacoApi | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<MonacoDiffEditorInstance | null>(null);
  const originalModelRef = useRef<MonacoTextModel | null>(null);
  const modifiedModelRef = useRef<MonacoTextModel | null>(null);

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
    if (!monacoApi || !containerRef.current || diffEditorRef.current) return;

    const diffEditor = monacoApi.editor.createDiffEditor(containerRef.current, {
      automaticLayout: true,
      fontFamily: 'Geist Mono Variable, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 12,
      lineHeight: 19,
      minimap: { enabled: false },
      renderSideBySide: true, // Split diff
      theme: theme === 'dark' ? 'vs-dark' : 'vs',
      ...options,
    });

    diffEditorRef.current = diffEditor;

    return () => {
      diffEditor.dispose();
      originalModelRef.current?.dispose();
      modifiedModelRef.current?.dispose();
      originalModelRef.current = null;
      modifiedModelRef.current = null;
      diffEditorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monacoApi]);

  useEffect(() => {
    monacoApi?.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
  }, [monacoApi, theme]);

  useEffect(() => {
    const diffEditor = diffEditorRef.current;
    if (!monacoApi || !diffEditor) return;

    // Helper to get Urises
    const getUri = (pathStr: string | null | undefined, isOriginal: boolean) => {
      if (!pathStr) {
        return monacoApi.Uri.parse(`apprecon://diff/${isOriginal ? 'original' : 'modified'}/${Math.random()}`);
      }
      if (pathStr.startsWith('/') || pathStr.includes(':\\')) {
        return monacoApi.Uri.file(pathStr);
      }
      return monacoApi.Uri.parse(`apprecon://diff-file/${encodeURIComponent(pathStr)}`);
    };

    const originalUri = getUri(originalPath, true);
    const modifiedUri = getUri(modifiedPath, false);

    // Clean up old models if they exist
    if (originalModelRef.current) {
      originalModelRef.current.dispose();
    }
    if (modifiedModelRef.current) {
      modifiedModelRef.current.dispose();
    }

    // Create new models with values
    const originalModel = monacoApi.editor.createModel(originalValue, language || undefined, originalUri);
    const modifiedModel = monacoApi.editor.createModel(modifiedValue, language || undefined, modifiedUri);

    originalModelRef.current = originalModel;
    modifiedModelRef.current = modifiedModel;

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });
  }, [monacoApi, originalValue, modifiedValue, language, originalPath, modifiedPath]);

  useEffect(() => {
    diffEditorRef.current?.updateOptions(options ?? {});
  }, [options]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}
