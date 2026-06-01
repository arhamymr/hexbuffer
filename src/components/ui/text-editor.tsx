'use client';

import Editor from '@monaco-editor/react';
import type { ComponentProps } from 'react';
import { useTheme } from '@/components/theme-provider';

type MonacoEditorProps = ComponentProps<typeof Editor>;

const defaultOptions: MonacoEditorProps['options'] = {
  minimap: { enabled: false },
  fontSize: 12,
  lineNumbers: 'on',
  wordWrap: 'on',
  automaticLayout: true,
  renderValidationDecorations: 'off',
};

type TextEditorProps = Omit<MonacoEditorProps, 'theme'>;
type MonacoBeforeMount = NonNullable<MonacoEditorProps['beforeMount']>;
type MonacoInstance = Parameters<MonacoBeforeMount>[0];

function disableMonacoDiagnostics(monaco: MonacoInstance) {
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  });
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  });
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: false,
  });
  monaco.languages.css.cssDefaults.setOptions({
    validate: false,
  });
  monaco.languages.css.scssDefaults.setOptions({
    validate: false,
  });
  monaco.languages.css.lessDefaults.setOptions({
    validate: false,
  });
  monaco.languages.html.htmlDefaults.setOptions({
    validate: false,
  });
}

export function TextEditor({
  height = '100%',
  beforeMount,
  options,
  ...props
}: TextEditorProps) {
  const { theme } = useTheme();
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <Editor
      height={height}
      theme={editorTheme}
      beforeMount={(monaco) => {
        disableMonacoDiagnostics(monaco);
        beforeMount?.(monaco);
      }}
      options={{
        ...defaultOptions,
        ...options,
        minimap: {
          ...defaultOptions?.minimap,
          ...options?.minimap,
        },
      }}
      {...props}
    />
  );
}
