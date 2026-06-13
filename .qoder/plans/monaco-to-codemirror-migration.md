# Monaco → CodeMirror 6 Migration

## Context

The `TextEditor` component currently wraps `@monaco-editor/react` (Monaco Editor), which is one of the heaviest dependencies (~2.5-3MB gzipped, spawns web workers). Replacing it with CodeMirror 6 (~150-200KB, no workers) will dramatically reduce bundle size while providing equivalent editing capabilities. The migration must preserve the existing `TextEditor` API to avoid breaking 10+ consumer sites across the app.

## Files to Modify (5 total)

| File | Change |
|------|--------|
| `package.json` | Remove `@monaco-editor/react`; add `@codemirror/*` packages |
| `src/components/ui/text-editor.tsx` | Full rewrite as custom CM6 React wrapper |
| `src/pages/invoker/components/invoker-config/config/request-tab.tsx` | Rewrite `markRawRequestTarget` for CM6 API |
| `src/pages/threats/components/threats-workspace.tsx` | Replace direct Monaco import with `TextEditor` |
| `vite.config.ts` | Replace `vendor-monaco` chunk with `vendor-codemirror` |

**8 other consumer files are unaffected** — the wrapper API stays backward-compatible for all props they use.

---

## Task 1: Install CodeMirror packages and remove Monaco

```bash
pnpm remove @monaco-editor/react
pnpm add @codemirror/state @codemirror/view @codemirror/commands @codemirror/language \
       @codemirror/lang-javascript @codemirror/lang-html @codemirror/lang-markdown \
       @codemirror/lang-cpp @codemirror/search
```

## Task 2: Rewrite `src/components/ui/text-editor.tsx`

Build a custom vanilla CM6 React wrapper (no `@uiw/react-codemirror`). Key design:

**New props interface (backward-compatible):**
- `value`, `language`, `onChange`, `onMount`, `options`, `height`, `path`, `className`
- `beforeMount` — **dropped** (was Monaco-specific diagnostics disabling)
- `onMount` — now passes `EditorView` instead of Monaco editor (only affects `request-tab.tsx`)
- `path` — accepted but ignored (Monaco model concept)
- `options.minimap`, `options.renderWhitespace` — accepted but ignored

**Options mapping (Monaco → CM6):**

| Monaco Option | CM6 Mapping |
|---------------|-------------|
| `readOnly` | `EditorView.editable(false)` + `EditorState.readOnly(true)` |
| `fontSize` | `EditorView.theme({ '.cm-content, .cm-gutter': { fontSize } })` |
| `lineHeight` | `EditorView.theme({ '.cm-content': { lineHeight } })` |
| `fontFamily` | `EditorView.theme({ '.cm-content': { fontFamily } })` |
| `wordWrap: 'on'` | `EditorView.lineWrapping` |
| `lineNumbers: 'on'` | `lineNumbers()` |
| `scrollBeyondLastLine: true` | `EditorView.theme({ '.cm-scroller': { paddingBottom: '50vh' } })` |
| `padding: { top, bottom }` | Theme padding on `.cm-content` |

**Architecture:**
- Use `Compartment` for dynamic reconfiguration (options, language, theme)
- Guard flag to prevent `onChange` feedback loops on external value updates
- `EditorView` lifecycle: create in `useEffect`, destroy on cleanup
- Dark/light themes via `EditorView.theme()` matching Monaco's `vs-dark`/`vs` colors
- Languages: `javascript` → `@codemirror/lang-javascript`, `html` → `@codemirror/lang-html`, `markdown` → `@codemirror/lang-markdown`, `c` → `@codemirror/lang-cpp`, `plaintext` → no highlighting
- Base extensions: `history()`, `drawSelection()`, `keymap`, `highlightActiveLine()`, `syntaxHighlighting(defaultHighlightStyle, { fallback: true })`

## Task 3: Migrate `request-tab.tsx` Mark Target feature

The only consumer using Monaco-specific editor APIs. Rewrite `markRawRequestTarget`:

```typescript
// Before (Monaco):
const model = editor.getModel();
const selection = editor.getSelection();
const selectedText = model.getValueInRange(selection);
editor.executeEdits('mark-invoker-target', [{ range: selection, text: `§${selectedText}§` }]);

// After (CM6):
const { from, to } = view.state.selection.main;
if (from === to) return; // no selection
const selectedText = view.state.sliceDoc(from, to);
view.dispatch({ changes: { from, to, insert: `§${selectedText}§` } });
view.focus();
updateRawRequest(view.state.doc.toString());
```

Also change ref type from `React.useRef<any>` to `React.useRef<EditorView | null>`.

## Task 4: Migrate `threats-workspace.tsx` DecompilerView

- Remove `import Editor from '@monaco-editor/react'`
- Add `import { TextEditor } from '@/components/ui/text-editor'`
- Replace `<Editor>` with `<TextEditor>` (remove `theme="vs-dark"` — wrapper handles it)

## Task 5: Update `vite.config.ts`

Replace line 32:
```javascript
// Before:
if (id.includes("monaco-editor") || id.includes("@monaco-editor")) return "vendor-monaco";
// After:
if (id.includes("@codemirror") || id.includes("codemirror")) return "vendor-codemirror";
```

## Task 6: Verify

1. Syntax highlighting works for all 5 languages (javascript, html, markdown, plaintext, c)
2. Dark/light theme toggle updates editor appearance
3. Read-only editors reject keyboard input
4. Editable editors accept input and fire `onChange`
5. Mark Target button wraps selected text with § signs
6. Undo/Redo works
7. External value updates replace content without cursor jump
8. `pnpm build` succeeds with no errors
