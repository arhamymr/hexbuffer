import { useRef, useEffect, useCallback } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertCodeBlock,
  InsertThematicBreak,
  ListsToggle,
  CodeToggle,
  Separator,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { type CustomSection } from '../types';

interface CustomSectionEditorProps {
  section: CustomSection;
  onChange: (content: string) => void;
}

export function CustomSectionEditor({ section, onChange }: CustomSectionEditorProps) {
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

  return (
    <MDXEditor
      key={section.key}
      ref={ref}
      markdown={section.content}
      onChange={handleChange}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin(),
        tablePlugin(),
        codeBlockPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertCodeBlock />
              <InsertThematicBreak />
              <Separator />
              <ListsToggle />
            </>
          ),
        }),
      ]}
      contentEditableClassName="prose prose-sm max-w-none mx-auto px-8 py-6"
    />
  );
}
