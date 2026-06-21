pub mod ai_browser;
pub mod chat_sessions;
pub mod collaborator;
pub mod api_collection;
pub mod documents;
pub mod packet_capture;
pub mod proxy_logs;
pub mod regression;
pub mod threats;
pub mod types;
pub mod websocket;

pub use types::*;

use rusqlite::{Connection, Result as SqlResult};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: PathBuf) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn init(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;
        conn.execute_batch(crate::db::schema::CREATE_HTTP_LOGS_TABLE)?;
        conn.execute_batch(crate::db::schema::CREATE_WEBSOCKET_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_DOCUMENTS_TABLE)?;
        conn.execute_batch(crate::db::schema::CREATE_PACKET_CAPTURE_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_THREAT_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_AI_BROWSER_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_COLLABORATOR_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_AI_CHAT_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_REGRESSION_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_STASHES_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_CONTEXTS_TABLES)?;
        conn.execute_batch(crate::db::schema::CREATE_CHRONICLE_TABLES)?;

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
