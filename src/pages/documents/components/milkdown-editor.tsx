import { useEffect, useRef } from 'react';
import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { replaceAll } from '@milkdown/kit/utils';
import { listenerCtx } from '@milkdown/kit/plugin/listener';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/nord.css';
import './milkdown-preview-theme.css';

interface MilkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function MilkdownEditorInner({ value, onChange }: MilkdownEditorProps) {
  const [loading] = useInstance();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initializedRef = useRef(false);
  const currentMarkdownRef = useRef(value);

  const { get } = useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: value,
    });
    return crepe;
  }, []);

  // Set initial content and wire up change listener once editor is ready
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor || initializedRef.current) return;

    // Set the initial markdown content
    if (value) {
      editor.action(replaceAll(value));
    }

    // Wire up markdown change listener
    try {
      const listenerValue = editor.ctx.get(listenerCtx);
      listenerValue.markdownUpdated((_ctx, markdown) => {
        currentMarkdownRef.current = markdown;
        onChangeRef.current(markdown);
      });
    } catch {
      // listener plugin may not be available in this Crepe configuration;
      // content is still captured via PDF export reading the document state
    }

    initializedRef.current = true;
  }, [loading, get, value]);

  useEffect(() => {
    if (loading || !initializedRef.current || value === currentMarkdownRef.current) {
      return;
    }

    const editor = get();
    if (!editor) {
      return;
    }

    currentMarkdownRef.current = value;
    editor.action(replaceAll(value));
  }, [loading, get, value]);

  return (
    <div className="milkdown-editor h-full overflow-auto bg-background">
      <div className="mx-auto max-w-4xl px-8 py-6">
        <Milkdown />
      </div>
    </div>
  );
}

export function MilkdownEditor({ value, onChange }: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner value={value} onChange={onChange} />
    </MilkdownProvider>
  );
}
