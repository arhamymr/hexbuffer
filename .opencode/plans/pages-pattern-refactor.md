# Refactor All Feature Pages — Consistent UI/Logic Separation

## Context

The 18 feature pages in `src/pages/` have drifted into inconsistent patterns. Some follow the AGENTS.md "thin page entry + page hook + presentational sections" pattern, while others have ballooned to 200–340 lines with inline components, direct store access, effects, and business logic in `index.tsx`. This refactoring makes every page consistent: `index.tsx` becomes a thin ~30–80 line composition file, all logic lives in the page hook, and all sub-UI lives in presentational components.

**Target pattern per AGENTS.md:**
```
src/pages/feature-name/
  index.tsx           ← thin layout composition ONLY
  hooks/
    use-feature-page.ts  ← ALL orchestration, derived state, handlers, side effects
  components/         ← presentational components (receive props)
  constants.ts        ← static tab definitions, option lists
  types.ts            ← TypeScript type definitions
  lib/                ← pure helpers (formatting, filtering)
```

---

## Task 0 — Cross-cutting: Remove `'use client'` from entire `src/` (~208 files)

This is a Next.js directive with no effect in a Tauri Vite app. Remove from all files under `src/` (both `'use client'` and `"use client"` variants). Use a scripted batch removal.

---

## Task 1 — Create shared `src/hooks/use-proxy-start.ts`

The exact same proxy-start pattern (`isStarting` state + `handleStartProxy` + `proxyStatus` from `useAppStore`) is duplicated in `browser/index.tsx` and `intercept/index.tsx`. Extract into a shared hook:

```ts
// src/hooks/use-proxy-start.ts
export function useProxyStart() {
  // returns { proxyStatus, isStarting, handleStartProxy }
}
```

---

## Task 2 — Refactor `debugger` (342 → ~60 lines)

**Current problems:** 2 inline components (`EventRow`, `JsonViewer`), inline constants (`EVENT_COLORS`), inline helper (`formatTimestamp`), local state (`copyPayload`, `copied`), no `components/` directory.

| Move from `index.tsx` | To |
|---|---|
| `EVENT_COLORS` map | `constants.ts` |
| `formatTimestamp()` | `lib/format-timestamp.ts` |
| `EventRow` component | `components/event-row.tsx` |
| `JsonViewer` component | `components/json-viewer.tsx` |
| `copyPayload`/`copied`/`handleCopy` state | `hooks/use-debugger-page.ts` |

**New files:** `constants.ts`, `lib/format-timestamp.ts`, `components/event-row.tsx`, `components/json-viewer.tsx`  
**Modified:** `index.tsx`, `hooks/use-debugger-page.ts`

---

## Task 3 — Refactor `regression` (220 → ~80 lines)

**Current problems:** Direct `useRegressionStore` access, 8 derived state variables computed inline, `runningStepIndex`/`singleStepResults` state + callbacks, large inline header toolbar JSX, empty-state JSX, inline tab content computation.

| Move from `index.tsx` | To |
|---|---|
| `runs`, `runSingleStep` store access | `hooks/use-regression-page.ts` |
| 8 derived state vars (`isRunning`, `activeTab`, `activeTabTestCase`, etc.) | `hooks/use-regression-page.ts` |
| `runningStepIndex`, `singleStepResults`, `handleRunStep`, `handleRunAllInActiveTest` | `hooks/use-regression-page.ts` |
| Header toolbar JSX (lines 99–147) | `components/regression-header.tsx` |
| Empty state JSX (lines 152–162) | `components/regression-empty-state.tsx` |
| Tab content computation (`tabTestCase`, `tabRuns`, `latestRun`) | `hooks/use-regression-page.ts` (return enriched tab data) |

**New files:** `components/regression-header.tsx`, `components/regression-empty-state.tsx`  
**Modified:** `index.tsx`, `hooks/use-regression-page.ts`

---

## Task 4 — Refactor `browser` (199 → ~70 lines)

**Current problems:** Direct `useAppStore` + `useBrowserAutomationStore` access, proxy-start handler, `actionLogs` transformation, safety alert state.

| Move from `index.tsx` | To |
|---|---|
| Safety alert state | `hooks/use-page.ts` |
| Proxy start handler | `src/hooks/use-proxy-start.ts` (shared, Task 1) |
| `updateSetup`, `saveConfig`, `clearLogs` store access | `hooks/use-page.ts` |
| `actionLogs` transformation | `hooks/use-page.ts` |
| `status`, `isRunning` derivation | `hooks/use-page.ts` |

**Modified:** `index.tsx`, `hooks/use-page.ts`

---

## Task 5 — Refactor `code` (151 → ~60 lines)

**Current problems:** 50-line build-output `useEffect`, direct `useGlobalTerminalStore` access, `lastBuildOutputRef`.

| Move from `index.tsx` | To |
|---|---|
| `useGlobalTerminalStore` access | `hooks/use-playground-page.ts` |
| `lastBuildOutputRef` | `hooks/use-playground-page.ts` |
| 50-line `useEffect` | `hooks/use-playground-page.ts` |

**Modified:** `index.tsx`, `hooks/use-playground-page.ts`

---

## Task 6 — Refactor `api-collection` (204 → ~70 lines)

**Current problems:** Direct `useApiCollectionStore` access, `useEffect` for `fetchFromDb()`, 4 inline tab handlers, local state (`contextsDialogOpen`, `sidebarExpanded`), `pageTabs` mapping, unused `RepeaterPage` alias export.

| Move from `index.tsx` | To |
|---|---|
| `useApiCollectionStore` access + `fetchFromDb` effect | `hooks/use-api-collection.ts` |
| `handleTabRename`, `handleTabAdd`, `handleTabClose`, `handleCreateInitialRequest` | `hooks/use-api-collection.ts` |
| `contextsDialogOpen`, `sidebarExpanded` state | `hooks/use-api-collection.ts` |
| `pageTabs` mapping | `hooks/use-api-collection.ts` |
| `export default` + `RepeaterPage` alias | Remove (unused) |

**Modified:** `index.tsx`, `hooks/use-api-collection.ts`

---

## Task 7 — Refactor `automation` (182 → ~60 lines)

**Current problems:** `bridgeRef`/`addNodeAtCenterRef`/`persistRef` refs, `selectedNode` state, 3 action callbacks, `showExecutionLog` state, inline toggle button JSX.

| Move from `index.tsx` | To |
|---|---|
| 3 refs + `selectedNode` + `onSelectedNodeChange` | `hooks/use-automation-page.ts` |
| `handleNodeUpdate`, `handleNodeDelete`, `handleRun` | `hooks/use-automation-page.ts` |
| `showExecutionLog` state | `hooks/use-automation-page.ts` |
| Toggle button JSX (lines 97–125) | `components/execution-log-toggle.tsx` |

**New files:** `components/execution-log-toggle.tsx`  
**Modified:** `index.tsx`, `hooks/use-automation-page.ts`

---

## Task 8 — Refactor `live-traffic` (89 → ~50 lines)

**Current problems:** Direct `useGroupsStore` + `useFloatingBarUiStore` access, `renderTabContextMenuItems` callback, `historyView` memoization, `closeTargetSelector` trigger call.

| Move from `index.tsx` | To |
|---|---|
| `deleteGroup` from `useGroupsStore` | `hooks/use-http-history-page.ts` |
| `isTargetSelectorOpen` + `closeTargetSelector` | `hooks/use-http-history-page.ts` |
| `renderTabContextMenuItems` callback | `hooks/use-http-history-page.ts` |
| `historyView` memoization | `hooks/use-http-history-page.ts` |

**Modified:** `index.tsx`, `hooks/use-http-history-page.ts`

---

## Task 9 — Refactor `intercept` (93 → ~45 lines)

**Current problems:** Direct `useInterceptStore` (7 selectors), proxy-start handler duplicated, hook returns void.

| Move from `index.tsx` | To |
|---|---|
| All `useInterceptStore` selectors (tabs, activeTabId, etc.) | `hooks/use-intercept-page.ts` (return from hook) |
| Proxy start handler | `src/hooks/use-proxy-start.ts` (shared, Task 1) |

**Modified:** `index.tsx`, `hooks/use-intercept-page.ts`

---

## Task 10 — Refactor `invoker` (112 → ~60 lines)

**Current problems:** Direct `useAppStore` for safety alert.

| Move from `index.tsx` | To |
|---|---|
| `invokerSafetyAlertDismissed`, `setInvokerSafetyAlertDismissed` | `hooks/use-page.ts` |

**Modified:** `index.tsx`, `hooks/use-page.ts`

---

## Task 11 — Refactor `documents` (191 → ~80 lines)

**Current problems:** `markdownMode` local state in index.

| Move from `index.tsx` | To |
|---|---|
| `markdownMode` + `setMarkdownMode` state | `hooks/use-documents-page.ts` |

**Modified:** `index.tsx`, `hooks/use-documents-page.ts`

---

## Task 12 — Clean `overview` (125 → ~80 lines)

**Current problems:** Inline `<style>` block, complex icon rendering in JSX.

| Move from `index.tsx` | To |
|---|---|
| `<style>` block (lines 27–45) | `src/styles/overview-wallpaper.css` |
| Desktop icon rendering (lines 52–89) | `components/desktop-icon-item.tsx` |

**New files:** `src/styles/overview-wallpaper.css`, `components/desktop-icon-item.tsx`  
**Modified:** `index.tsx`

---

## Task 13 — Clean `inspector` (87 → ~70 lines)

| Move from `index.tsx` | To |
|---|---|
| `TOP_LEVEL_TABS`, `BROWSER_TAB_ID` constants | `constants.ts` |
| `topTab` state | `hooks/use-inspector-page.ts` |

**Modified:** `index.tsx`, `constants.ts`, `hooks/use-inspector-page.ts`

---

## Task 14 — Clean `tools` (53 → ~35 lines)

Replace hardcoded `TabsContent` blocks with dynamic rendering from `constants.ts` tab-to-component mapping.

**Modified:** `index.tsx`, `constants.ts`

---

## Task 15 — Clean `threats` (54 → ~40 lines)

Replace 15+ individual props with spread or typed props object.

**Modified:** `index.tsx`, `components/threats-workspace.tsx`

---

## Task 16 — Clean `code-audit` (77 → ~55 lines)

Remove `'use client'`. Minor — already mostly clean.

**Modified:** `index.tsx`

---

## Task 17 — Clean `listener` (33 lines)

Fix inconsistent indentation only.

**Modified:** `index.tsx`

---

## Task 18 — Verify `repeater`, `settings`

Already clean. Only `'use client'` removal needed (covered by Task 0).

---

## Verification

1. `pnpm dev` — ensure the Vite dev server starts without TypeScript errors
2. Navigate to each page in the app to verify rendering is identical to pre-refactor
3. `pnpm build` — ensure production build succeeds with no errors
4. Verify no remaining `'use client'` directives anywhere in `src/`
