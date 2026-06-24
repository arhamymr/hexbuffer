import { useRef, useEffect, useCallback } from 'react';
import { type MDXEditorMethods } from '@mdxeditor/editor';
import { type CustomSection } from '../../types';

interface UseCustomSectionEditorProps {
  section: CustomSection;
  onChange: (content: string) => void;
}

export function useCustomSectionEditor({ section, onChange }: UseCustomSectionEditorProps) {
  const ref = useRef<MDXEditorMethods>(null);
  const isInternalChangeRef = useRef(false);

  const handleChange = useCallback(
    (markdown: string) => {
      isInternalChangeRef.current = true;
      onChange(markdown);
    },
    [onChange],
  );

  // Sync external content changes (e.g. undo/redo) into the editor
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    if (!ref.current) return;
    const currentMarkdown = ref.current.getMarkdown();
    if (currentMarkdown !== section.content) {
      ref.current.setMarkdown(section.content);
    }
  }, [section.content]);

  return {
    ref,
    handleChange,
  };
}
