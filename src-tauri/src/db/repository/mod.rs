pub mod ai_browser;
pub mod chat_sessions;
pub mod collaborator;
pub mod api_collection;
pub mod documents;
pub mod proxy_logs;
pub mod regression;
pub mod types;
pub mod websocket;
pub mod mock_forge;

pub use types::*;

use rusqlite::{Connection, Result as SqlResult};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
}

impl Database {
    pub fn new(path: PathBuf) -> SqlResult<Self> {
        let conn = Connection::open(&path)?;
        Ok(Self {
            conn: Mutex::new(conn),
            path,
        })
    }

    // ponytail: allow closing the sqlite connection and reopening it to reset the database file safely
    pub fn close_connection(&self) -> SqlResult<()> {
        let mut conn = self.conn.lock().unwrap();
        let dummy_conn = Connection::open_in_memory()?;
        let old_conn = std::mem::replace(&mut *conn, dummy_conn);
        drop(old_conn);
        Ok(())
    }

    pub fn reopen_and_init(&self) -> SqlResult<()> {
        let mut conn = self.conn.lock().unwrap();
        let new_conn = Connection::open(&self.path)?;
        *conn = new_conn;
        drop(conn);
        self.init()?;
        Ok(())
    }


    pub fn init(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;
        conn.execute_batch(crate::db::schema::CREATE_HTTP_LOGS_TABLE)?;
        conn.execute_batch(crate::db::schema::CREATE_WEBSOCKET_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_DOCUMENTS_TABLE)?;
        conn.execute_batch(crate::db::schema::CREATE_AI_BROWSER_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_COLLABORATOR_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_AI_CHAT_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_REGRESSION_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_STASHES_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_CONTEXTS_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_CHRONICLE_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_MOCK_FORGE_TABLES)?;

        Self::ensure_column(
            &conn,
            "regression_test_cases",
            "test_name",
            "TEXT NOT NULL DEFAULT 'Default Test'",
        )?;
        Self::ensure_column(&conn, "ai_browser_pages", "ai_used_for_analysis", "INTEGER")?;
        Self::ensure_column(&conn, "ai_browser_pages", "screenshot_path", "TEXT")?;
        Self::ensure_column(&conn, "ai_browser_pages", "rendered_html_path", "TEXT")?;
        Self::ensure_column(
            &conn,
            "ai_browser_insights",
            "ai_used_for_analysis",
            "INTEGER",
        )?;
        Self::ensure_column(&conn, "ai_browser_insights", "analysis_source", "TEXT")?;
        Self::ensure_column(&conn, "ai_browser_insights", "analysis_tool_id", "TEXT")?;
        Self::ensure_column(&conn, "ai_browser_insights", "analysis_tool_name", "TEXT")?;
        Self::ensure_column(&conn, "ai_browser_logs", "ai_used_for_analysis", "INTEGER")?;
        Self::ensure_column(&conn, "ai_browser_logs", "extra_json", "TEXT")?;
        Self::ensure_column(
            &conn,
            "documents",
            "custom_sections",
            "TEXT NOT NULL DEFAULT '[]'",
        )?;
        Self::ensure_column(
            &conn,
            "documents",
            "removed_built_in_sections",
            "TEXT NOT NULL DEFAULT '[]'",
        )?;
        Self::ensure_column(
            &conn,
            "stashes",
            "sort_order",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        Self::ensure_column(
            &conn,
            "stash_endpoints",
            "sort_order",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        Self::ensure_column(
            &conn,
            "mock_routes",
            "matcher_enabled",
            "INTEGER NOT NULL DEFAULT 1",
        )?;
        drop(conn); // drop conn lock before calling self.seed_relational_data_if_empty which locks it again
        self.seed_relational_data_if_empty()?;
        Ok(())
    }

    fn ensure_column(
        conn: &Connection,
        table_name: &str,
        column_name: &str,
        column_type: &str,
    ) -> SqlResult<()> {
        let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
        let exists = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<SqlResult<Vec<_>>>()?
            .iter()
            .any(|name| name == column_name);

        if !exists {
            conn.execute(
                &format!(
                    "ALTER TABLE {} ADD COLUMN {} {}",
                    table_name, column_name, column_type
                ),
                [],
            )?;
        }

        Ok(())
    }
}
