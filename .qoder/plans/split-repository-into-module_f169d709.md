# Split repository.rs into repository/ module

## Task 1: Create repository/ directory and types.rs
- Create `src-tauri/src/db/repository/types.rs`
- Move `DocumentRecord`, `PaginatedResponse<T>`, `ProxySummaryRow`, `TreeNode`, `TreePath` structs
- Add `use serde::{Deserialize, Serialize};`

## Task 2: Create repository/mod.rs (core)
- Move `Database` struct, `new()`, `init()`, `ensure_column()`
- Add module declarations: `pub mod types; pub mod ai_browser; pub mod packet_capture; pub mod documents; pub mod proxy_logs; pub mod websocket; pub mod collaborator;`
- Re-export key types: `pub use types::*;`
- Imports: `rusqlite`, `std::path::PathBuf`, `std::sync::Mutex`

## Task 3: Create repository/ai_browser.rs
- Move 11 AI browser methods (upsert_ai_browser_session through list_ai_browser_logs)
- `impl super::Database { ... }`
- Import: `crate::commands::browser::{AIInsight, ActivityLog, CrawlPage, CrawlSession}`, `rusqlite::{params, OptionalExtension, Result as SqlResult}`

## Task 4: Create repository/packet_capture.rs
- Move 4 packet capture methods + `row_to_stored_packet_record` + `collect_stored_packet_records`
- Import: `crate::packet_capture::types::*`, `rusqlite::params`, `SqlResult`

## Task 5: Create repository/documents.rs
- Move `get_documents`, `upsert_document`, `delete_document` + `row_to_document_record`
- Import: `super::types::DocumentRecord`, `rusqlite::{params, Result as SqlResult}`, `serde_json`, `uuid::Uuid`

## Task 6: Create repository/proxy_logs.rs
- Move HTTP log methods: `insert_log`, `get_all`, `get_filtered`, `delete_log`, `get_by_id`, `clear_logs`, `get_paginated`, `get_filtered_paginated`, `get_summary_paginated`, `get_filtered_summary_paginated`, `count`, `get_tree`
- Move helpers: `row_to_proxy_record`, `row_to_proxy_summary`, `collect_records<T>`
- Import: `crate::proxy::state::*`, `super::types::*`, `rusqlite`, `uuid::Uuid`

## Task 7: Create repository/websocket.rs
- Move WebSocket methods + all conversion helpers + filter SQL builders
- Import: `crate::proxy::state::*`, `rusqlite`, `uuid::Uuid`

## Task 8: Create repository/collaborator.rs
- Move all collaborator methods + `map_collab_payload`
- Import: `crate::collaborator::*`, `rusqlite`, `uuid::Uuid`

## Task 9: Update db/mod.rs
- Change `pub mod repository;` — no text change needed (same declaration works for directory)

## Task 10: Delete old repository.rs
- Remove the monolithic file

## Task 11: Verify with cargo check
- Run `cargo check` to ensure all imports resolve and compilation succeeds
