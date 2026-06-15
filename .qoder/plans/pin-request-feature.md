# Pin Request Feature — Live Traffic

## Context

The user wants to add a "Pin Request" feature to the live traffic page so they can bookmark important HTTP requests (max 10) for quick access. Pinned requests get a visual indicator on their row, and a "Pinned (N)" tab filters the table to show only pinned items.

## Overview

Add a Zustand-backed pin system with `localStorage` persistence, pin/unpin actions in both the dropdown menu and right-click context menu, a pin icon indicator on rows, and a "Pinned (N)" tab in the tab bar.

No backend changes. All work is confined to `src/pages/live-traffic/`.

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/live-traffic/stores/pinned-requests-store.ts` | **CREATE** |
| `src/pages/live-traffic/hooks/use-http-history-page.ts` | Modify |
| `src/pages/live-traffic/index.tsx` | Modify |
| `src/pages/live-traffic/components/http-history-view/index.tsx` | Modify |
| `src/pages/live-traffic/components/log-table/calls-columns.tsx` | Modify |
| `src/pages/live-traffic/components/log-table/log-context-menu.tsx` | Modify |

## Implementation Steps

### Task 1: Create Pin Store

**File**: `src/pages/live-traffic/stores/pinned-requests-store.ts` (NEW)

Zustand store with `persist` middleware:
- `pinnedIds: string[]` — array of pinned request IDs (max 10)
- `togglePin(id)` — toggles pin state; shows `toast.warning("Maximum 10 pins reached...")` when limit hit
- `isPinned(id)` — selector to check if an ID is pinned
- `unpinId(id)` — silently remove a pin (used on delete)
- `unpinAll()` — clear all pins
- `pinnedCount()` — returns count
- Persist key: `'0xbuffer-pinned-requests'` (follows existing convention)

### Task 2: Add "Pinned (N)" Tab

**File**: `src/pages/live-traffic/hooks/use-http-history-page.ts`

- Import `usePinnedRequestsStore`
- Subscribe to `pinnedIds` to get `pinnedCount`
- Add `const PINNED_TAB_ID = 'pinned'`
- Insert `{ id: PINNED_TAB_ID, name: `Pinned (${pinnedCount})`, closable: false }` between "All History" and target tabs
- When `activeTabId === PINNED_TAB_ID`, set `activeScope` to `null` (fetch all, filter client-side)
- Export `isPinnedTabActive: boolean`

### Task 3: Thread `isPinnedTabActive` Prop Down

**Files**: `index.tsx` → `http-history-view/index.tsx` → `calls-columns.tsx`

- `index.tsx`: destructure `isPinnedTabActive`, pass to `<HttpHistoryView isPinnedTabActive={isPinnedTabActive} />`
- `http-history-view/index.tsx`: accept `isPinnedTabActive` prop, forward to `<TrafficTable isPinnedTabActive={isPinnedTabActive} />`

### Task 4: Add Client-Side Pin Filtering to TrafficTable

**File**: `src/pages/live-traffic/components/log-table/calls-columns.tsx`

In `TrafficTable`:
- Accept `isPinnedTabActive?: boolean` prop
- Subscribe to `pinnedIds` and `unpinId` from pin store
- When `isPinnedTabActive` is true, filter `calls` to only pinned IDs via `useMemo`
- Auto-unpin when a request is deleted (wrap `removeCallLocally`)
- Adjust empty state for pinned tab: `"No pinned requests"` / `"Right-click a request and select Pin to add it here (max 10)."`
- Use filtered calls for table data, row count, and pagination display

### Task 5: Add Pin/Unpin to Both Menus + Pin Row Indicator

**File**: `src/pages/live-traffic/components/log-table/calls-columns.tsx`

1. **CallActionCell dropdown**: Add `Pin`/`PinOff` menu item between "Copy URL" and "Add to Target"
2. **Row pin indicator**: In the method column cell, show a `<Pin className="size-3 text-amber-500" />` icon before `MethodBadge` when the row is pinned
3. Move `callsColumns` from module-level export into a `useMemo` inside `TrafficTable` so it can react to `pinnedIds` changes

**File**: `src/pages/live-traffic/components/log-table/log-context-menu.tsx`

3. **Right-click context menu**: Add same `Pin`/`PinOff` menu item between "Copy URL" and "Add to Target"
4. **Auto-unpin on delete**: In `handleDelete`, call `unpinId(call.id)` before deleting

## Edge Cases

- **Max pins (10)**: `togglePin` prevents adding beyond 10 and shows a warning toast. Menu items remain enabled so the user gets the feedback.
- **Delete pinned request**: Both delete handlers call `unpinId()` to prevent stale pin references.
- **Pinned tab with zero pins**: Shows an empty state directing the user to pin requests.
- **localStorage persistence**: Survives page reload. Stale IDs (requests no longer in DB) are harmless — they simply won't appear in the filtered table.
- **Load More on pinned tab**: Since max pins is 10 and perPage is 100, all pinned items load on page 1. The Load More button can stay but is effectively a no-op for pinned content.

## Verification

1. **Pin a request**: Right-click or use the 3-dot menu → "Pin". Verify the pin icon appears on the row.
2. **Max pins**: Pin 10 requests, try pinning an 11th → toast warning appears.
3. **Unpin**: Click "Unpin" on a pinned request → pin icon disappears.
4. **Pinned tab**: Switch to "Pinned (N)" tab → only pinned requests visible. Count matches.
5. **Delete pinned request**: Delete a pinned request → pin is auto-removed, tab count updates.
6. **Persistence**: Refresh the page → pins survive (check localStorage `'0xbuffer-pinned-requests'`).
