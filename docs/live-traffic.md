# Live Traffic

## Overview

The Live Traffic page is AppRecon's real-time HTTP and WebSocket traffic viewer. It captures every request and response flowing through the MITM proxy and presents them in a searchable, filterable, paginated table with full request/response inspection.

This is the primary interface for understanding what traffic is passing through the proxy. It supports both live streaming of new events and historical querying of previously captured traffic stored in SQLite.

---

## Architecture

### Page Entry

The page entry at [index.tsx](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/index.tsx) composes the page from two top-level regions:

- **LogFilters** — search bar, HTTP/WebSocket toggle, method/status filter groups, target scope selector, pause/resume live stream, and clear-all dialog.
- **History View** — switches between [HttpHistoryView](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/components/http-history-view) and [WebSocketHistoryView](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/components/websocket-history-view) based on the selected mode.

The page is wrapped in [TabbedPageLayout](file:///Users/arham/Desktop/project/apprecon/src/components/tabs-layout/tabbed-page-layout.tsx) to support per-target scope tabs. Each active target becomes a tab, plus an "All History" tab that shows traffic across all targets.

### Page Hook

[useHttpHistoryPage](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/hooks/use-http-history-page.ts) orchestrates:

- **Tabs** — derived from active targets, with deduplication and "All History" as the first tab.
- **History mode** — persisted to `localStorage` as `history-mode` (http or websocket).
- **Scope forwarding** — the "Send scope to Documents" context menu action writes a target's scope patterns into the active documents editor.

### Data Flow

```
Proxy captures request/response
        ↓
Tauri backend emits proxy-record event
        ↓
useHistoryTable listens via Tauri event system
        ↓
Debounced 500ms → fetchHistorySummaries (lightweight SQL)
        ↓
adaptProxySummaryToApiCall → ApiCall[] in Zustand state
        ↓
TrafficTable renders via @tanstack/react-table + @tanstack/react-virtual
```

---

## HTTP Traffic Table

### Columns

| Column | Description |
|---|---|
| Time | Request timestamp, clickable to toggle ascending/descending sort |
| Method | HTTP method badge + status code badge + content-decoded warning icon |
| Host | Hostname with browser icon derived from User-Agent |
| Path | URL path |
| Size | Response body size (formatted as B/KB/MB) |
| Length | Request body size (formatted as B/KB/MB) |
| MIME Type | Response content-type header |

### Row Interaction

- **Click** a row to select it and load its full detail in the inspector panel below.
- **Right-click** a row opens the [LogEntryContextMenu](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/components/log-table/log-context-menu.tsx) with actions for copying, sending to repeater, deleting, and more.

### Virtualization

The table uses [@tanstack/react-virtual](https://tanstack.com/virtual) for row virtualization with 10-row overscan. Each row is estimated at 32px and positioned absolutely within the scroll container. This keeps the DOM lightweight even with hundreds of loaded rows.

### Pagination

Rows are loaded in pages of 100 from the backend. A "Load More" button at the footer appends the next page. The footer also shows the current page, total count, and page number.

### Skeleton States

- **Initial load** — [HistoryLoadingState](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/components/history-loading-state.tsx) renders a full skeleton table.
- **Loading more** — two additional skeleton rows are appended below the live table.

---

## HTTP Inspector

The [inspector](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/components/log-table/inspector.tsx) appears below the table when a row is selected. It loads the full [ProxyRecord](file:///Users/arham/Desktop/project/apprecon/src-tauri/src/history/mod.rs) from the backend (including request/response bodies, headers, cookies) and displays them in a tabbed interface:

- **Request** — raw HTTP request with headers and body.
- **Response** — raw HTTP response with headers and body.
- **Cookies** — parsed cookie display.

The detail can be opened in a separate [ResponseDetailWindow](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/components/log-table/response-detail-window.tsx) via Tauri's multi-window API.

---

## WebSocket Traffic

The WebSocket history view at [websocket-history-view](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/components/websocket-history-view) provides a separate table for WebSocket frames captured by the proxy. It includes:

- **Frame table** — columns for time, direction (client→server or server→client), opcode, payload length, and payload preview.
- **Frame detail** — full payload inspection when a frame is selected.
- **Context menu** — for copying frame data and other actions.

WebSocket data is queried separately from HTTP data and uses its own hooks: [useWebsocketTable](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/hooks/use-websocket-table.ts) and [useWebsocketDetail](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/hooks/use-websocket-detail.ts).

---

## Filters

The [LogFilters](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/components/log-table/log-filters.tsx) component provides:

| Filter | Control | Behavior |
|---|---|---|
| Search | Text input with magnifying glass icon | Filters across URL, host, method, body |
| Method | ToggleGroup multi-select (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) | Filters to selected HTTP methods |
| Status | ToggleGroup multi-select (2xx, 3xx, 4xx, 5xx) | Filters to selected status code ranges |
| HTTP/WebSocket | ToggleGroup single-select | Switches between HTTP and WebSocket tables |
| Pause/Resume | Toggle button | Stops live event streaming to inspect current data without new rows appearing |
| Clear All | Button with confirmation dialog | Permanently deletes all logged HTTP requests/responses |
| Target Selector | Dialog | Opens the target scope configuration dialog |

Filters are managed through [history-query-store](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/state/history-query-store.ts), a Zustand store that holds filter state, pagination, sort order, and stream pause state.

---

## Key Hooks

| Hook | Responsibility |
|---|---|
| [useHistoryTable](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/hooks/use-history-table.ts) | Fetches paginated summaries, listens for live `proxy-record` events, manages load-more, sort toggle, and local row removal. |
| [useHistoryQuery](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/hooks/use-history-query.ts) | Derives the current query object from filter state and manages the `baseQueryKey` for change detection. |
| [useHistoryDetail](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/hooks/use-history-detail.ts) | Fetches the full ProxyRecord for the selected row when opened in the inspector. |
| [useHttpHistoryPage](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/hooks/use-http-history-page.ts) | Page-level orchestration: tabs, history mode, and scope-forwarding action. |

---

## Services

[history-service.ts](file:///Users/arham/Desktop/project/apprecon/src/pages/live-traffic/services/history-service.ts) wraps Tauri `invoke` calls for:

- `fetchHistorySummaries` — paginated, filtered query returning lightweight [ProxyLogSummary](file:///Users/arham/Desktop/project/apprecon/src-tauri/src/history/mod.rs) records (no bodies).
- `fetchHistoryDetail` — fetches the full [ProxyRecord](file:///Users/arham/Desktop/project/apprecon/src-tauri/src/history/mod.rs) for a single row by ID.
- `clearHistoryLogs` — deletes all HTTP log rows from the database.

---

## Backend

The backend is implemented in Rust under `src-tauri/src/history/` and `src-tauri/src/db/repository.rs`. Key points:

- **Summary queries** — the table uses `ProxyLogSummary` records that select only the columns needed for display (id, timestamp, method, url, status, sizes, content-type, user-agent), avoiding loading full request/response body BLOBs.
- **Filtered pagination** — `get_filtered_summary_paginated` builds parameterized SQL `WHERE` clauses from the frontend's `ProxyFilter`.
- **Live events** — the proxy emits `proxy-record` Tauri events after each captured request is saved to SQLite.
- **Indexes** — the schema includes indexes on `timestamp`, `method`, `url`, and `response_status` for filter performance.

---

## Target Scope Integration

The Live Traffic page integrates with the target system:

- Each active target (from [targetStore](file:///Users/arham/Desktop/project/apprecon/src/stores/target.ts)) becomes a filter tab.
- Selecting a scope tab sets `query.filter.scope` to the target's scope patterns.
- Right-clicking a scope tab offers "Send scope to Documents" which writes the target's scope patterns into the active document in the Documents feature.

---

## Related Documentation

- [Live Traffic Performance Optimization Plan](file:///Users/arham/Desktop/project/apprecon/docs/live-traffic-performance.md) — detailed performance analysis and optimization strategy for large datasets.
