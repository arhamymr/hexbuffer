use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::target::Target;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct Finding {
    pub id: String,
    pub target_id: String,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub steps_to_reproduce: String,
    pub impact: String,
    pub remediation: String,
    pub request_data: Option<String>,
    pub response_data: Option<String>,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Clone, serde::Serialize)]
pub struct Call {
    pub id: String,
    pub timestamp: u64,
    pub method: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub headers: std::collections::HashMap<String, String>,
    pub request_body: Option<String>,
    pub response_status: Option<u16>,
    pub response_headers: std::collections::HashMap<String, String>,
    pub response_body: Option<String>,
    pub duration: u64,
    pub session_id: String,
    pub target_id: String,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Self {
        let data_dir = std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("data");

        if !data_dir.exists() {
            std::fs::create_dir_all(&data_dir).ok();
        }

        let db_path = data_dir.join("apsara_data.db");
        let conn = Connection::open(&db_path).expect("Failed to open database");

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_tables();
        db
    }

    fn init_tables(&self) {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS targets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                scope TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("Failed to create targets table");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS calls (
                id TEXT PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                host TEXT NOT NULL,
                path TEXT NOT NULL,
                headers TEXT NOT NULL DEFAULT '{}',
                request_body TEXT,
                response_status INTEGER,
                response_headers TEXT NOT NULL DEFAULT '{}',
                response_body TEXT,
                duration INTEGER NOT NULL,
                session_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                FOREIGN KEY (target_id) REFERENCES targets(id)
            )",
            [],
        )
        .expect("Failed to create calls table");

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_calls_target_id ON calls(target_id)",
            [],
        )
        .expect("Failed to create calls index");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS findings (
                id TEXT PRIMARY KEY,
                target_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                severity TEXT NOT NULL DEFAULT 'medium',
                steps_to_reproduce TEXT NOT NULL DEFAULT '',
                impact TEXT NOT NULL DEFAULT '',
                remediation TEXT NOT NULL DEFAULT '',
                request_data TEXT,
                response_data TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (target_id) REFERENCES targets(id)
            )",
            [],
        )
        .expect("Failed to create findings table");

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_findings_target_id ON findings(target_id)",
            [],
        )
        .expect("Failed to create findings index");
    }

    pub fn load_targets(&self) -> Vec<Target> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT id, name, description, scope, created_at, updated_at FROM targets")
            .unwrap();

        let targets = stmt
            .query_map([], |row| {
                let scope_json: String = row.get(3)?;
                let scope: Vec<String> = serde_json::from_str(&scope_json).unwrap_or_default();
                Ok(Target {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    scope,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        targets
    }

    pub fn save_target(&self, target: &Target) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let scope_json = serde_json::to_string(&target.scope).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT OR REPLACE INTO targets (id, name, description, scope, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                target.id,
                target.name,
                target.description,
                scope_json,
                target.created_at,
                target.updated_at
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn delete_target(&self, id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().unwrap();
        let affected = conn
            .execute("DELETE FROM targets WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(affected > 0)
    }

    pub fn load_calls(&self, target_id: &str) -> Vec<Call> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT id, timestamp, method, url, host, path, headers, request_body, response_status, response_headers, response_body, duration, session_id, target_id FROM calls WHERE target_id = ?1 ORDER BY timestamp DESC LIMIT 1000",
            )
            .unwrap();

        let calls = stmt
            .query_map(params![target_id], |row| {
                let headers_json: String = row.get(6)?;
                let headers: std::collections::HashMap<String, String> =
                    serde_json::from_str(&headers_json).unwrap_or_default();
                let response_headers_json: String = row.get(9)?;
                let response_headers: std::collections::HashMap<String, String> =
                    serde_json::from_str(&response_headers_json).unwrap_or_default();

                Ok(Call {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    method: row.get(2)?,
                    url: row.get(3)?,
                    host: row.get(4)?,
                    path: row.get(5)?,
                    headers,
                    request_body: row.get(7)?,
                    response_status: row.get(8)?,
                    response_headers,
                    response_body: row.get(10)?,
                    duration: row.get(11)?,
                    session_id: row.get(12)?,
                    target_id: row.get(13)?,
                })
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        calls
    }

    pub fn save_call(&self, call: &Call) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let headers_json = serde_json::to_string(&call.headers).map_err(|e| e.to_string())?;
        let response_headers_json =
            serde_json::to_string(&call.response_headers).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO calls (id, timestamp, method, url, host, path, headers, request_body, response_status, response_headers, response_body, duration, session_id, target_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                call.id,
                call.timestamp,
                call.method,
                call.url,
                call.host,
                call.path,
                headers_json,
                call.request_body,
                call.response_status,
                response_headers_json,
                call.response_body,
                call.duration,
                call.session_id,
                call.target_id
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn load_findings(&self, target_id: Option<&str>) -> Vec<Finding> {
        let conn = self.conn.lock().unwrap();

        let sql = if target_id.is_some() {
            "SELECT id, target_id, title, description, severity, steps_to_reproduce, impact, remediation, request_data, response_data, status, created_at, updated_at FROM findings WHERE target_id = ?1 ORDER BY created_at DESC"
        } else {
            "SELECT id, target_id, title, description, severity, steps_to_reproduce, impact, remediation, request_data, response_data, status, created_at, updated_at FROM findings ORDER BY created_at DESC"
        };

        let mut stmt = conn.prepare(sql).unwrap();

        let findings = if let Some(tid) = target_id {
            stmt.query_map(params![tid], |row| {
                Ok(Finding {
                    id: row.get(0)?,
                    target_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    severity: row.get(4)?,
                    steps_to_reproduce: row.get(5)?,
                    impact: row.get(6)?,
                    remediation: row.get(7)?,
                    request_data: row.get(8)?,
                    response_data: row.get(9)?,
                    status: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                })
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect()
        } else {
            stmt.query_map([], |row| {
                Ok(Finding {
                    id: row.get(0)?,
                    target_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    severity: row.get(4)?,
                    steps_to_reproduce: row.get(5)?,
                    impact: row.get(6)?,
                    remediation: row.get(7)?,
                    request_data: row.get(8)?,
                    response_data: row.get(9)?,
                    status: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                })
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect()
        };

        findings
    }

    pub fn save_finding(&self, finding: &Finding) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT OR REPLACE INTO findings (id, target_id, title, description, severity, steps_to_reproduce, impact, remediation, request_data, response_data, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                finding.id,
                finding.target_id,
                finding.title,
                finding.description,
                finding.severity,
                finding.steps_to_reproduce,
                finding.impact,
                finding.remediation,
                finding.request_data,
                finding.response_data,
                finding.status,
                finding.created_at,
                finding.updated_at
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn delete_finding(&self, id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().unwrap();
        let affected = conn
            .execute("DELETE FROM findings WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(affected > 0)
    }
}

impl Default for Database {
    fn default() -> Self {
        Self::new()
    }
}