# Live Traffic Performance Optimization Plan

## 1. Problem Statement

The Live Traffic page becomes slow when handling large proxy datasets (16,000+ requests). Search and filter operations feel sluggish because the backend loads and deserializes full proxy records—including multi-megabyte request and response bodies—just to display a lightweight summary table.

Current observable behavior:

```
Showing 100 of 16007 requests
1/161 page
Search: noticeable delay on every keystroke
Filter toggle: 1–3 second round-trip per toggle
Page load: slow initial fetch
```

---

## 2. Root Cause Analysis

### 2.1 Backend Query Pipeline

Current flow for every page/filter change:

```
User types in search or toggles filter
        ↓
Frontend builds HistoryQuery with ProxyFilter
        ↓
Tauri invoke: get_proxy_paginated
        ↓
HistoryBridge::get_paginated()
        ↓
Database::get_filtered_paginated()
        ↓
SELECT * FROM http_logs WHERE ... LIMIT 100 OFFSET 0
        ↓
row_to_proxy_record() for each row
  → Deserializes request_headers JSON
  → Deserializes response_headers JSON
  → Allocates request_body Vec<u8>
  → Allocates response_body Vec<u8>
        ↓
HistoryBridge maps ProxyRecord → ProxyLogSummary
  → Discards 90% of loaded data
  → Only keeps: id, timestamp, method, url, status, sizes, content_type, user_agent
        ↓
Send ProxyLogSummary[] to frontend
```

### 2.2 The Core Problem

The summary table only displays these fields per row:

| Field | Source Column | Data Size |
|---|---|---|
| Timestamp | `timestamp` | ~30 bytes |
| Method | `method` | ~6 bytes |
| Host + Path | `url` | ~100 bytes |
| Status | `response_status` | 2 bytes |
| Response Size | `response_body` | **FULL BLOB loaded** |
| Request Length | `request_body` | **FULL BLOB loaded** |
| MIME Type | `response_headers` | **FULL JSON parsed** |
| Browser Icon | `request_headers` | **FULL JSON parsed** |

For each of the 100 rows per page, the database reads:

```
request_headers   → TEXT column (1–10 KB JSON)
request_body      → BLOB column (0–10 MB)
response_headers  → TEXT column (1–10 KB JSON)
response_body     → BLOB column (0–50 MB)
```

Estimated per-page I/O for 100 rows with average 50 KB bodies:

```
Current:   100 rows × ~100 KB = ~10 MB per page load
Optimized: 100 rows × ~200 bytes = ~20 KB per page load
```

That is approximately a **500× reduction** in data read from SQLite.

### 2.3 Secondary Issues

| Issue | Impact |
|---|---|
| No index on `response_status` | Status code filters (`2xx`, `4xx`, `5xx`) require full table scan |
| Count query uses string-interpolated SQL | SQLite cannot cache prepared statement plans; SQL injection risk |
| `row_to_proxy_record` deserializes all JSON headers | Unnecessary CPU work for summary display |
| Search input replaces entire filter object on every keystroke | Unnecessary Zustand store re-renders |

---

## 3. Optimization Strategy

### Phase Overview

```
Phase 1: Summary SQL queries (biggest impact)
        ↓
Phase 2: Database index additions
        ↓
Phase 3: Frontend search input optimization
        ↓
Phase 4: Frontend table virtualization (optional)
```

---

## 4. Phase 1 — Summary SQL Queries

### 4.1 Goal

Create lightweight query methods that `SELECT` only the columns needed for the summary table, completely skipping `request_body`, `response_body`, `request_headers`, and `response_headers` BLOBs.

### 4.2 New SQL Query

Replace:

```sql
SELECT * FROM http_logs WHERE ... ORDER BY timestamp DESC LIMIT 100 OFFSET 0
```

With:

```sql
SELECT
    id,
    timestamp,
    method,
    url,
    response_status,
    response_status_text,
    COALESCE(LENGTH(request_body), 0),
    COALESCE(LENGTH(response_body), 0),
    COALESCE(server_addr, ''),
    json_extract(
        CASE WHEN request_headers IS NOT NULL AND request_headers != ''
             THEN request_headers ELSE '{}' END,
        '$.user-agent'
    ),
    json_extract(
        CASE WHEN response_headers IS NOT NULL AND response_headers != ''
             THEN response_headers ELSE '{}' END,
        '$.content-type'
    )
FROM http_logs
WHERE ...
ORDER BY timestamp DESC
LIMIT 100 OFFSET 0
```

### 4.3 Key Techniques

| Technique | Purpose |
|---|---|
| `LENGTH(request_body)` | Get body size without loading the BLOB |
| `LENGTH(response_body)` | Get body size without loading the BLOB |
| `json_extract()` | Extract `user-agent` and `content-type` directly in SQL without deserializing full JSON in Rust |
| `COALESCE()` | Handle `NULL` BLOB columns gracefully |
| Column list instead of `SELECT *` | Avoid reading BLOB data from disk |

### 4.4 New Row Mapping Function

Add a new `row_to_proxy_summary` function in `repository.rs` that maps directly to `ProxyLogSummary` without going through `ProxyRecord`:

```rust
fn row_to_proxy_summary(row: &rusqlite::Row) -> SqlResult<crate::history::ProxyLogSummary> {
    Ok(crate::history::ProxyLogSummary {
        id: row.get(0)?,
        timestamp: row.get(1)?,
        method: row.get(2)?,
        url: row.get(3)?,
        response_status: row.get::<_, Option<i64>>(4)?.map(|v| v as u16),
        response_status_text: row.get(5)?,
        request_body_size: row.get::<_, i64>(6)? as usize,
        response_body_size: row.get::<_, i64>(7)? as usize,
        server_addr: row.get(8)?,
        user_agent: row.get(9)?,
        response_content_type: row.get(10)?,
    })
}
```

### 4.5 New Database Methods

Add two new methods to `Database`:

| Method | Purpose | Return Type |
|---|---|---|
| `get_summary_paginated(page, per_page, sort_order)` | Unfiltered summary query | `PaginatedResponse<ProxyLogSummary>` |
| `get_filtered_summary_paginated(filter, page, per_page, sort_order)` | Filtered summary query with parameterized count | `PaginatedResponse<ProxyLogSummary>` |

Both return `PaginatedResponse<ProxyLogSummary>` directly, eliminating the `ProxyRecord → ProxyLogSummary` conversion step in `HistoryBridge`.

### 4.6 Count Query Improvement

The current count query builds a separate SQL string with inline values (SQL injection risk, no plan caching). The new count query reuses the same parameterized `WHERE` clause as the data query, using the same `params_vec` for both.

### 4.7 HistoryBridge Update

Change `HistoryBridge::get_paginated` to call summary methods directly and remove the `.into_iter().map(ProxyLogSummary::from).collect()` post-processing:

```rust
pub fn get_paginated(
    &self, page: u32, per_page: u32,
    filter: Option<ProxyFilter>, sort_order: Option<String>,
) -> Result<PaginatedResponse<ProxyLogSummary>, String> {
    let filter = filter.map(|f| self.normalize_filter(f));
    let sort_order = self.normalize_sort_order(sort_order.as_deref());

    match filter {
        Some(filter) if self.has_active_filters(&filter) => {
            self.db.get_filtered_summary_paginated(&filter, page, per_page, sort_order)
        }
        _ => self.db.get_summary_paginated(page, per_page, sort_order),
    }
}
```

### 4.8 Expected Performance Gain

| Metric | Before | After |
|---|---|---|
| Data read per page (100 rows) | ~10 MB | ~20 KB |
| JSON deserialization per page | 200 headers parsed | 0 headers parsed |
| Memory allocation per page | 100 request + 100 response bodies | 0 body allocations |
| Query round-trip time | 500ms–2s | 10–50ms |

Estimated improvement: **10–50× faster** page loads.

---

## 5. Phase 2 — Database Indexes

### 5.1 Current Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_http_logs_timestamp ON http_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_http_logs_method ON http_logs(method);
CREATE INDEX IF NOT EXISTS idx_http_logs_url ON http_logs(url);
```

### 5.2 New Index

```sql
CREATE INDEX IF NOT EXISTS idx_http_logs_response_status ON http_logs(response_status);
```

### 5.3 Why This Index Helps

When the user selects status filters like `2xx`, `4xx`, or `5xx`, the current query does a full table scan over all 16K rows to check each `response_status` value. With the index, SQLite can use an index lookup to jump directly to matching rows.

### 5.4 Expected Performance Gain

| Filter | Before | After |
|---|---|---|
| `4xx` on 16K rows | Full scan: ~16K rows checked | Index lookup: ~hundreds of rows read |
| `2xx` on 16K rows | Full scan: ~16K rows checked | Index lookup: ~thousands of rows read |

---

## 6. Phase 3 — Frontend Search Input Optimization

### 6.1 Current Behavior

The search `onChange` handler replaces the entire filter object on every keystroke:

```tsx
onChange={(e) => setFilter({ ...filter, search: e.target.value })}
```

This triggers: new filter object allocation → `setFilter` store mutation → `page` reset to `1` → `useHistoryQuery` recomputation → `baseQueryKey` recalculation → 300ms debounce reset → fetch.

### 6.2 Improved Behavior

Use the store's dedicated `setSearch` method instead:

```tsx
onChange={(e) => setSearch(e.target.value)}
```

`setSearch` is already defined in the store and handles page reset:

```ts
setSearch: (search) =>
    set((state) => ({
        filter: { ...state.filter, search },
        page: 1,
    })),
```

This avoids spreading the entire filter object and creates a cleaner mutation path.

### 6.3 Files to Change

| File | Change |
|---|---|
| `src/pages/live-traffic/components/log-table/log-filters.tsx` | Destructure `setSearch` from `useHistoryQuery()`, use it for search input `onChange` |

---

## 7. Phase 4 — Frontend Table Virtualization (Optional)

### 7.1 Current Behavior

The `TrafficTable` component renders all 100 rows in the current page as DOM nodes simultaneously. Each row contains 8 cells with `HighlightedText`, `MethodBadge`, `StatusBadge`, `BrowserIcon`, and `SendToRepeaterButton`.

Total DOM nodes per page: ~100 rows × ~20 elements = ~2,000 nodes.

### 7.2 Proposed Change

Use `@tanstack/react-virtual` to render only visible rows (~20–30 rows in viewport at a time).

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
    count: calls.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 32,
    overscan: 10,
});
```

### 7.3 When to Add This

This phase is optional and should be added only if:

- Phase 1–3 do not provide sufficient improvement
- Users report UI jank when scrolling through results
- The per-page size increases beyond 100 rows

For 100 rows, modern browsers handle 2,000 DOM nodes without significant issues. Virtualization adds complexity (scroll anchoring, context menus, keyboard navigation) and should be deferred unless measurably needed.

---

## 8. Implementation Order

```
Step  File                                              Change
────  ────────────────────────────────────────────────  ────────────────────────────────
  1   src-tauri/src/db/schema.rs                        Add response_status index
  2   src-tauri/src/db/repository.rs                    Add row_to_proxy_summary function
  3   src-tauri/src/db/repository.rs                    Add get_summary_paginated method
  4   src-tauri/src/db/repository.rs                    Add get_filtered_summary_paginated method
  5   src-tauri/src/history/mod.rs                      Update get_paginated to use summary methods
  6   src/pages/live-traffic/components/log-table/      Use setSearch for search input
      log-filters.tsx
```

Steps 1–5 are backend changes. Step 6 is frontend. All steps are independent and testable individually.

---

## 9. Testing Strategy

### 9.1 Backend Verification

1. Start app with existing 16K+ record database
2. Open Live Traffic page
3. Verify page loads in <100ms (previously 1–3 seconds)
4. Verify search returns results in <200ms
5. Verify method filters apply in <200ms
6. Verify status filters apply in <200ms
7. Verify scope tab filtering works correctly
8. Verify pagination (Load More) works correctly
9. Verify row selection and detail panel still loads full record

### 9.2 Regression Checks

1. Send to Repeater still works (uses `get_proxy_detail`, not summary)
2. Context menu actions still work
3. Delete single log still works
4. Clear all logs still works
5. WebSocket tab is unaffected (separate query path)
6. Tree view is unaffected (separate query path)
7. New proxy-record events still trigger refresh

### 9.3 Rust Tests

```bash
cd src-tauri && cargo test --lib -- --test-threads=1
```

---

## 10. Expected Results Summary

| Metric | Before | After Phase 1–2 | After Phase 3 |
|---|---|---|---|
| Initial page load | 1–3s | 50–100ms | 50–100ms |
| Search keystroke latency | 300ms + 1–3s fetch | 300ms + 50ms fetch | 300ms + 50ms fetch |
| Filter toggle latency | 1–3s | 50–100ms | 50–100ms |
| Memory per page load | ~10 MB | ~20 KB | ~20 KB |

---

## 11. Future Considerations

### 11.1 Full-Text Search

If search performance on `url LIKE '%term%'` becomes a bottleneck at 100K+ records, consider adding SQLite FTS5:

```sql
CREATE VIRTUAL TABLE http_logs_fts USING fts5(url, method, content='http_logs', content_rowid='rowid');
```

This enables indexed full-text search instead of `LIKE` scans.

### 11.2 Incremental Refresh

Instead of re-fetching the entire page on new events, use append-only updates when on page 1 with `DESC` sort order. The current architecture already debounces events at 500ms, but could be further optimized to insert new rows at the top without a full re-query.

### 11.3 Web Worker Filtering

For very large client-side filter operations, consider moving filter computation to a Web Worker. This is not needed with the backend summary query optimization but could help if client-side derived state becomes expensive.
