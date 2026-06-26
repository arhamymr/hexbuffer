import { useEffect, useMemo, useRef, useState } from 'react';
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

/** Heuristic content-type detection for syntax highlighting. */
function detectLanguage(content: string): string | null {
  const t = content.trim();
  if (!t) return null;

  // --- JSON ---
  if (/^\s*[\[{]/.test(t) && !/^\s*<\?(xml|php)/i.test(t)) {
    // Quick structural check: must contain "key": or be array of objects
    if (
      /"\w+"\s*:/.test(t) ||
      /^\s*\[\s*[\[{]/.test(t) ||
      /^\s*\{\s*"\w+"\s*:/.test(t)
    ) {
      return 'json';
    }
  }

  // --- XML ---
  if (/^\s*<\?xml/i.test(t)) return 'xml';

  // --- HTML ---
  if (
    /^\s*<!DOCTYPE\s+html/i.test(t) ||
    /^\s*<(html|head|body|div|span|p|a|img|table|ul|ol|li|form|input|button|script|link|meta|style)\b/i.test(t)
  ) {
    return 'html';
  }

  // --- Markdown ---
  if (
    /^#{1,6}\s/m.test(t) ||
    /\*\*[^*]+\*\*/.test(t) ||
    /^\[.+\]\(.+\)/m.test(t) ||
    /^>\s/m.test(t) ||
    /^\s*[-*]\s/m.test(t)
  ) {
    return 'markdown';
  }

  // --- CSS ---
  if (/[.#@]\w[\w-]*\s*\{/.test(t) && /[\w-]+\s*:\s*[^;]+;/.test(t)) {
    return 'css';
  }

  // --- SQL ---
  if (/^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+(TABLE|INDEX|VIEW)|ALTER\s+TABLE|DROP\s+(TABLE|VIEW))\b/i.test(t)) {
    return 'sql';
  }

  // --- Python ---
  if (
    /^\s*(def\s+\w+\s*\(|class\s+\w+[:(]|import\s+\w+|from\s+\w+\s+import|if\s+__name__\s*==\s*['"]__main__['"])\b/m.test(t) ||
    /^\s*print\(/.test(t)
  ) {
    return 'python';
  }

  // --- YAML ---
  if (/^\s*[\w-]+\s*:\s*(\[|\||$)/m.test(t) && !/["{};]/.test(t)) {
    return 'yaml';
  }

  // --- TypeScript (before JS — more specific) ---
  if (
    /:\s*(string|number|boolean|void|any|never|unknown|Readonly|Promise|Array|Record|Map|Set)\b/.test(t) ||
    /\binterface\s+\w+\s*[\{<]/.test(t) ||
    /\btype\s+\w+\s*=/.test(t) ||
    /\benum\s+\w+\s*\{/.test(t)
  ) {
    return 'typescript';
  }

  // --- JavaScript ---
  if (
    /\b(const|let|var)\s+\w+/.test(t) ||
    /\bfunction\s+\w+\s*\(/.test(t) ||
    /=>\s*[\{[]/.test(t) ||
    /\b(import|export|require)\s*[\{('"]/.test(t) ||
    /\bclass\s+\w+/.test(t)
  ) {
    return 'javascript';
  }

  // --- GraphQL ---
  if (/^\s*(query|mutation|subscription)\s+\w*[\s{(]/i.test(t)) {
    return 'graphql';
  }

  // --- Shell ---
  if (/^\s*#!/.test(t) || /^\s*(curl|npm|pnpm|yarn|git|docker|cargo|echo|export)\s/i.test(t)) {
    return 'shell';
  }

  return null;
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

  // Auto-detect language when not explicitly provided
  const effectiveLanguage = useMemo(() => {
    if (language) return language;
    return detectLanguage(originalValue || modifiedValue || '') ?? undefined;
  }, [language, originalValue, modifiedValue]);

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
    const originalModel = monacoApi.editor.createModel(originalValue, effectiveLanguage, originalUri);
    const modifiedModel = monacoApi.editor.createModel(modifiedValue, effectiveLanguage, modifiedUri);

    originalModelRef.current = originalModel;
    modifiedModelRef.current = modifiedModel;

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });
  }, [monacoApi, originalValue, modifiedValue, effectiveLanguage, originalPath, modifiedPath]);

  useEffect(() => {
    diffEditorRef.current?.updateOptions(options ?? {});
  }, [options]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} style={{ width: '100%', height: '100%' }} />;
}
