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
};

type TextEditorProps = Omit<MonacoEditorProps, 'theme'>;

export function TextEditor({
  height = '100%',
  options,
  ...props
}: TextEditorProps) {
  const { theme } = useTheme();
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <Editor
      height={height}
      theme={editorTheme}
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
