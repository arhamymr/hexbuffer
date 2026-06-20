# Move Live Traffic Buttons to Floating Dock Bar

## Context

The `log-filters.tsx` toolbar currently hosts three page-specific controls:
- **Manage Target** (`TargetSelectorDialog`) — opens a dialog to select/create targets
- **Pause/Resume** — pauses or resumes live HTTP traffic streaming
- **HTTP/WebSocket toggle** — switches between HTTP and WebSocket history views

The user wants to move the "Manage Target", "Pause/Resume", and "HTTP/WebSocket" buttons into the existing floating dock bar (the macOS-style draggable dock at the bottom). This is step 1 of a feature-by-feature migration — only live traffic buttons for now.

The architecture follows: **floating bar click → trigger function → store → page reacts**

---

## Files Summary

| Action | File |
|--------|------|
| CREATE | `src/stores/floating-bar-ui.ts` |
| CREATE | `src/triggers/live-traffic/ui.ts` |
| CREATE | `src/components/layout/floating-bar/use-floating-page-buttons.ts` |
| MODIFY | `src/components/layout/floating-bar/index.tsx` |
| MODIFY | `src/pages/live-traffic/components/target-selector/index.tsx` |
| MODIFY | `src/pages/live-traffic/components/target-selector/hooks.ts` |
| MODIFY | `src/pages/live-traffic/index.tsx` |
| MODIFY | `src/pages/live-traffic/components/log-table/log-filters.tsx` |
| MODIFY | `src/triggers/live-traffic/index.ts` |
| MODIFY | `src/triggers/index.ts` |

---

## Task 1: Create the floating-bar UI store

**File:** `src/stores/floating-bar-ui.ts` (NEW)

Minimal Zustand store to bridge the floating bar and page components for UI state (e.g., "is target selector dialog open"). Not persisted — ephemeral UI state.

```ts
import { create } from 'zustand';

interface FloatingBarUiState {
  isTargetSelectorOpen: boolean;
  setTargetSelectorOpen: (open: boolean) => void;
}

export const useFloatingBarUiStore = create<FloatingBarUiState>()((set) => ({
  isTargetSelectorOpen: false,
  setTargetSelectorOpen: (open) => set({ isTargetSelectorOpen: open }),
}));
```

---

## Task 2: Create trigger functions for live traffic UI actions

**File:** `src/triggers/live-traffic/ui.ts` (NEW)

Stateless trigger functions (no React hooks) following the existing trigger pattern (`useStore.getState().action()`).

```ts
import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { useFloatingBarUiStore } from '@/stores/floating-bar-ui';

export function openTargetSelector(): void {
  useFloatingBarUiStore.getState().setTargetSelectorOpen(true);
}

export function closeTargetSelector(): void {
  useFloatingBarUiStore.getState().setTargetSelectorOpen(false);
}

export function toggleStreamPause(): void {
  const store = useHistoryQueryStore.getState();
  store.setStreamManuallyPaused(!store.isStreamManuallyPaused);
}

export function toggleHistoryMode(): void {
  const current = localStorage.getItem('history-mode') === 'websocket' ? 'websocket' : 'http';
  const next = current === 'http' ? 'websocket' : 'http';
  localStorage.setItem('history-mode', next);
  window.dispatchEvent(new CustomEvent('history-mode-change', { detail: next }));
}
```

**Modify:** `src/triggers/live-traffic/index.ts` — add `export { openTargetSelector, closeTargetSelector, toggleStreamPause, toggleHistoryMode } from './ui';`

**Modify:** `src/triggers/index.ts` — add `toggleStreamPause, openTargetSelector, closeTargetSelector` to the live-traffic re-exports block.

---

## Task 3: Create the page-buttons hook

**File:** `src/components/layout/floating-bar/use-floating-page-buttons.ts` (NEW)

Route-aware hook that returns page-specific action buttons based on `pathname`. Only live traffic (`/`) for now.

```ts
'use client';
import * as React from 'react';
import { Target, Play, Pause, ArrowLeftRight } from 'lucide-react';
import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { openTargetSelector, toggleStreamPause, toggleHistoryMode } from '@/triggers';

export interface PageButton {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  visible: boolean;
}

export function useFloatingPageButtons(pathname: string): PageButton[] {
  const isPaused = useHistoryQueryStore((s) => s.isStreamManuallyPaused);
  const [historyMode, setHistoryMode] = React.useState<'http' | 'websocket'>(() =>
    localStorage.getItem('history-mode') === 'websocket' ? 'websocket' : 'http'
  );

  // Listen for external history mode changes
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as 'http' | 'websocket';
      setHistoryMode(detail);
    };
    window.addEventListener('history-mode-change', handler);
    return () => window.removeEventListener('history-mode-change', handler);
  }, []);

  return React.useMemo<PageButton[]>(() => {
    if (pathname !== '/') return [];
    return [
      {
        key: 'target-selector',
        icon: Target,
        label: 'Manage Target',
        isActive: false,
        onClick: openTargetSelector,
        visible: true,
      },
      {
        key: 'pause-resume',
        icon: isPaused ? Play : Pause,
        label: isPaused ? 'Resume' : 'Pause',
        isActive: isPaused,
        onClick: toggleStreamPause,
        visible: true,
      },
      {
        key: 'history-mode',
        icon: ArrowLeftRight,
        label: historyMode === 'http' ? 'WebSocket' : 'HTTP',
        isActive: false,
        onClick: toggleHistoryMode,
        visible: true,
      },
    ];
  }, [pathname, isPaused, historyMode]);
}
```

---

## Task 4: Render page buttons in the floating dock

**File:** `src/components/layout/floating-bar/index.tsx`

- Destructure `pathname` from `useSidebarNav()` (already returned, line 81)
- Call `const pageButtons = useFloatingPageButtons(pathname);`
- Insert page buttons between the nav categories map and the first divider (line 65):

```tsx
{/* Page-specific action buttons */}
{pageButtons.map((btn) =>
  btn.visible && (
    <Tooltip key={btn.key}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground hover:scale-110',
            btn.isActive && 'text-primary scale-110',
          )}
          onClick={btn.onClick}
        >
          <btn.icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={12}>{btn.label}</TooltipContent>
    </Tooltip>
  ),
)}
```

Resulting dock ordering: `[nav cats] [page buttons] | [terminal] [chat] [update?] [more] | [drag]`

---

## Task 5: Make TargetSelectorDialog externally controllable

**File:** `src/pages/live-traffic/components/target-selector/hooks.ts`

Add optional `externalOpen` / `onExternalOpenChange` params. When provided, the dialog becomes controlled from outside; when omitted, it uses internal `useState` (backward compatible).

**File:** `src/pages/live-traffic/components/target-selector/index.tsx`

Accept optional props:
```ts
interface TargetSelectorDialogProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}
```

When externally controlled:
- Pass `open` and `onOpenChange` to `<Dialog>` directly (not via `DialogTrigger`)
- Do NOT render `<DialogTrigger>` (the button is now in the floating bar)
- When not externally controlled: behavior is identical to today

All existing close paths (`handleSelectTarget`, `handleSaveTarget`) already route through `handleOpenChange`, so they automatically call `onExternalOpenChange` when controlled.

---

## Task 6: Wire the store to the dialog in LiveTrafficPage

**File:** `src/pages/live-traffic/index.tsx`

- Import `useFloatingBarUiStore` and `closeTargetSelector`
- Subscribe to `isTargetSelectorOpen` from the store
- Render `TargetSelectorDialog` directly in the page (outside LogFilters), controlled by store:

```tsx
<TargetSelectorDialog
  externalOpen={isTargetSelectorOpen}
  onExternalOpenChange={(open) => { if (!open) closeTargetSelector(); }}
/>
```

---

## Task 7: Remove buttons from log-filters.tsx

**File:** `src/pages/live-traffic/components/log-table/log-filters.tsx`

Remove:
- `Pause`, `Play` from lucide-react import
- `TargetSelectorDialog` import
- `Tooltip`, `TooltipContent`, `TooltipTrigger` imports (no longer needed for the removed toggle)
- `isStreamManuallyPaused`, `setStreamManuallyPaused` from store subscription
- `historyMode`, `setHistoryMode` from props interface and destructuring
- `HistoryMode` type import
- The entire first row JSX containing: `TargetSelectorDialog`, Pause/Resume button, and HTTP/WebSocket ToggleGroup

Keep: Method/status filter toggles, "Clear All History" button, and alert dialog.

**File:** `src/pages/live-traffic/index.tsx` — remove `historyMode`/`setHistoryMode` props passed to `<LogFilters>`.

**Also:** Update `useHttpHistoryPage` hook (`src/pages/live-traffic/hooks/use-http-history-page.ts`) to listen for the `history-mode-change` custom event so the page view reacts when the floating bar toggles modes:

```ts
React.useEffect(() => {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as HistoryMode;
    setHistoryMode(detail);
  };
  window.addEventListener('history-mode-change', handler);
  return () => window.removeEventListener('history-mode-change', handler);
}, [setHistoryMode]);
```

---

## Task 8: Update trigger barrel exports

- `src/triggers/live-traffic/index.ts` — add exports from `./ui`
- `src/triggers/index.ts` — add new exports to the live-traffic block

---

## Data Flow

### Manage Target click:
```
Floating bar [Target icon] → openTargetSelector() → store.setTargetSelectorOpen(true)
→ LiveTrafficPage re-renders → TargetSelectorDialog opens
→ Dialog close → onExternalOpenChange(false) → closeTargetSelector()
→ store.setTargetSelectorOpen(false) → dialog closes
```

### Pause/Resume click:
```
Floating bar [Pause/Play icon] → toggleStreamPause() → store.setStreamManuallyPaused(!)
→ Floating bar re-renders (icon toggles, label toggles)
→ LogFilters and other subscribers react (stream pauses/resumes)
```

### HTTP/WebSocket toggle click:
```
Floating bar [HTTP/WS icon] → toggleHistoryMode() → localStorage updated + custom event dispatched
→ useHttpHistoryPage hook listens for event → setHistoryMode(next) → page re-renders with correct view
→ Floating bar re-renders (label toggles between "HTTP" and "WebSocket")
```

---

## Verification

1. **Visual**: The floating dock at the bottom shows [Recon] [Automation] [Analyze] [Target] [Pause/Play] | [Terminal] [Chat] | [Drag]
2. **Target button**: Clicking the Target icon opens the TargetSelectorDialog. Selecting a target closes the dialog and activates the tab.
3. **Pause button**: Clicking toggles between Pause/Play icon and pause/resume label. Verify live traffic actually pauses/resumes.
4. **Drag still works**: The dock can still be dragged and snaps to edges with the new buttons included.
5. **No regressions**: Method/status filters and "Clear All History" in log-filters still work. HTTP/WebSocket views still render correctly.
6. **Run**: `pnpm dev` and verify the live traffic page with the dock at the bottom.
