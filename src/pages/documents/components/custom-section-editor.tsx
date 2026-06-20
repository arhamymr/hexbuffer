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
  codeMirrorPlugin,
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
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { type CustomSection } from '../types';
import { useCustomSectionEditor } from './hooks/use-custom-section-editor';

const darkTheme = [
  EditorView.theme(
    {
      '&': { backgroundColor: '#1e1e2e', color: '#cdd6f4' },
      '.cm-content': { caretColor: '#f5e0dc' },
      '.cm-cursor': { borderLeftColor: '#f5e0dc' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: '#45475a55',
      },
      '.cm-gutters': {
        backgroundColor: '#1e1e2e',
        color: '#6c7086',
        border: 'none',
      },
      '.cm-activeLineGutter': { backgroundColor: '#313244' },
      '.cm-activeLine': { backgroundColor: '#31324440' },
      '.cm-matchingBracket': {
        backgroundColor: '#45475a',
        outline: '1px solid #585b70',
      },
    },
    { dark: true },
  ),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: '#cba6f7' },
      { tag: t.atom, color: '#fab387' },
      { tag: t.number, color: '#fab387' },
      { tag: t.string, color: '#a6e3a1' },
      { tag: t.variableName, color: '#cdd6f4' },
      { tag: t.propertyName, color: '#89b4fa' },
      { tag: t.function(t.variableName), color: '#89b4fa' },
      { tag: t.lineComment, color: '#6c7086' },
      { tag: t.blockComment, color: '#6c7086' },
      { tag: t.typeName, color: '#f9e2af' },
      { tag: t.bool, color: '#fab387' },
      { tag: t.operator, color: '#89dceb' },
      { tag: t.punctuation, color: '#bac2de' },
      { tag: t.paren, color: '#bac2de' },
      { tag: t.bracket, color: '#bac2de' },
      { tag: t.brace, color: '#bac2de' },
      { tag: t.tagName, color: '#cba6f7' },
      { tag: t.attributeName, color: '#f9e2af' },
      { tag: t.attributeValue, color: '#a6e3a1' },
      { tag: t.regexp, color: '#f38ba8' },
      { tag: t.special(t.string), color: '#f38ba8' },
      { tag: t.meta, color: '#6c7086' },
    ]),
  ),
];

interface CustomSectionEditorProps {
  section: CustomSection;
  onChange: (content: string) => void;
}

export function CustomSectionEditor({ section, onChange }: CustomSectionEditorProps) {
  const { ref, handleChange } = useCustomSectionEditor({ section, onChange });

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
        codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            js: 'JavaScript',
            ts: 'TypeScript',
            tsx: 'TypeScript (React)',
            jsx: 'JavaScript (React)',
            css: 'CSS',
            html: 'HTML',
            json: 'JSON',
            bash: 'Bash',
            rust: 'Rust',
            python: 'Python',
            sql: 'SQL',
            yaml: 'YAML',
            xml: 'XML',
            markdown: 'Markdown',
          },
          codeMirrorExtensions: darkTheme,
        }),
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
