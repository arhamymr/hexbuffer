use crate::proxy::state::{
    WebSocketConnectionRecord, WebSocketConnectionState, WebSocketFilter,
    WebSocketMessageDirection, WebSocketMessageRecord, WebSocketMessageType,
};
use rusqlite::{params, Result as SqlResult};
use uuid::Uuid;

use super::types::PaginatedResponse;
use super::Database;

impl Database {
    pub fn insert_websocket_connection(&self, record: &WebSocketConnectionRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let request_headers =
            serde_json::to_string(&record.handshake_request_headers).unwrap_or_default();
        let response_headers =
            serde_json::to_string(&record.handshake_response_headers).unwrap_or_default();

        conn.execute(
            r#"INSERT INTO websocket_connections (
                id, timestamp, url, host, path,
                handshake_request_headers, handshake_response_status, handshake_response_headers,
                client_addr, server_addr, state, message_count, last_activity_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"#,
            params![
                record.id.to_string(),
                record.timestamp.to_rfc3339(),
                record.url,
                record.host,
                record.path,
                request_headers,
                record.handshake_response_status.map(|status| status as i64),
                response_headers,
                record.client_addr,
                record.server_addr,
                websocket_connection_state_to_str(&record.state),
                record.message_count as i64,
                record.last_activity_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn insert_websocket_message(&self, record: &WebSocketMessageRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"INSERT INTO websocket_messages (
                id, connection_id, timestamp, direction, message_type, payload, payload_size
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#,
            params![
                record.id.to_string(),
                record.connection_id.to_string(),
                record.timestamp.to_rfc3339(),
                websocket_message_direction_to_str(&record.direction),
                websocket_message_type_to_str(&record.message_type),
                record.payload,
                record.payload_size as i64,
            ],
        )?;

        conn.execute(
            r#"UPDATE websocket_connections
               SET message_count = message_count + 1, last_activity_at = ?2
               WHERE id = ?1"#,
            params![
                record.connection_id.to_string(),
                record.timestamp.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn clear_websocket_logs(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM websocket_messages", [])?;
        conn.execute("DELETE FROM websocket_connections", [])?;
        Ok(())
    }

    pub fn delete_websocket_connection(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM websocket_connections WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn get_websocket_paginated(
        &self,
        filter: Option<&WebSocketFilter>,
        page: u32,
        per_page: u32,
    ) -> Result<PaginatedResponse<WebSocketConnectionRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let offset = (page - 1) * per_page;

        let mut sql = String::from("SELECT * FROM websocket_connections WHERE 1=1");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(filter) = filter {
            append_websocket_filter_sql(filter, &mut sql, &mut params_vec);
        }

        sql.push_str(" ORDER BY timestamp DESC LIMIT ? OFFSET ?");

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let mut all_params: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|value| value.as_ref()).collect();
        all_params.push(&per_page as &dyn rusqlite::ToSql);
        all_params.push(&offset as &dyn rusqlite::ToSql);

        let rows = stmt
            .query_map(all_params.as_slice(), row_to_websocket_connection_record)
            .map_err(|e| e.to_string())?;

        let records = collect_websocket_connections(rows);

        let mut count_sql = String::from("SELECT COUNT(*) FROM websocket_connections WHERE 1=1");
        if let Some(filter) = filter {
            append_websocket_filter_count_sql(filter, &mut count_sql);
        }

        let total: i64 = conn
            .query_row(&count_sql, [], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        let has_more = (offset as usize + records.len()) < total as usize;

        Ok(PaginatedResponse {
            data: records,
            total: total as usize,
            page,
            per_page,
            has_more,
        })
    }

    pub fn get_websocket_by_id(
        &self,
        id: &str,
    ) -> Result<Option<WebSocketConnectionRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT * FROM websocket_connections WHERE id = ?1 LIMIT 1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;

        match rows.next().map_err(|e| e.to_string())? {
            Some(row) => row_to_websocket_connection_record(row)
                .map(Some)
                .map_err(|e| e.to_string()),
            None => Ok(None),
        }
    }

    pub fn get_websocket_messages_by_connection_id(
        &self,
        connection_id: &str,
    ) -> Result<Vec<WebSocketMessageRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT * FROM websocket_messages WHERE connection_id = ?1 ORDER BY timestamp ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![connection_id], row_to_websocket_message_record)
            .map_err(|e| e.to_string())?;

        Ok(collect_websocket_messages(rows))
    }
}

// ── Row mappers ──────────────────────────────────────────────

fn row_to_websocket_connection_record(row: &rusqlite::Row) -> SqlResult<WebSocketConnectionRecord> {
    let id: String = row.get(0)?;
    let timestamp: String = row.get(1)?;
    let url: String = row.get(2)?;
    let host: String = row.get(3)?;
    let path: String = row.get(4)?;
    let handshake_request_headers: Option<String> = row.get(5)?;
    let handshake_response_status: Option<i64> = row.get(6)?;
    let handshake_response_headers: Option<String> = row.get(7)?;
    let client_addr: Option<String> = row.get(8)?;
    let server_addr: Option<String> = row.get(9)?;
    let state: String = row.get(10)?;
    let message_count: i64 = row.get(11)?;
    let last_activity_at: String = row.get(12)?;

    Ok(WebSocketConnectionRecord {
        id: Uuid::parse_str(&id).map_err(|_| rusqlite::Error::InvalidQuery)?,
        timestamp: chrono::DateTime::parse_from_rfc3339(&timestamp)
            .map_err(|_| rusqlite::Error::InvalidQuery)?
            .with_timezone(&chrono::Utc),
        url,
        host,
        path,
        handshake_request_headers: handshake_request_headers
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .unwrap_or_default()
            .unwrap_or_default(),
        handshake_response_status: handshake_response_status.map(|value| value as u16),
        handshake_response_headers: handshake_response_headers
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .unwrap_or_default()
            .unwrap_or_default(),
        client_addr: client_addr.unwrap_or_default(),
        server_addr: server_addr.unwrap_or_default(),
        state: websocket_connection_state_from_str(&state),
        message_count: message_count as u32,
        last_activity_at: chrono::DateTime::parse_from_rfc3339(&last_activity_at)
            .map_err(|_| rusqlite::Error::InvalidQuery)?
            .with_timezone(&chrono::Utc),
    })
}

fn row_to_websocket_message_record(row: &rusqlite::Row) -> SqlResult<WebSocketMessageRecord> {
    let id: String = row.get(0)?;
    let connection_id: String = row.get(1)?;
    let timestamp: String = row.get(2)?;
    let direction: String = row.get(3)?;
    let message_type: String = row.get(4)?;
    let payload: Option<Vec<u8>> = row.get(5)?;
    let payload_size: i64 = row.get(6)?;

    Ok(WebSocketMessageRecord {
        id: Uuid::parse_str(&id).map_err(|_| rusqlite::Error::InvalidQuery)?,
        connection_id: Uuid::parse_str(&connection_id)
            .map_err(|_| rusqlite::Error::InvalidQuery)?,
        timestamp: chrono::DateTime::parse_from_rfc3339(&timestamp)
            .map_err(|_| rusqlite::Error::InvalidQuery)?
            .with_timezone(&chrono::Utc),
        direction: websocket_message_direction_from_str(&direction),
        message_type: websocket_message_type_from_str(&message_type),
        payload: payload.unwrap_or_default(),
        payload_size: payload_size as usize,
    })
}

// ── Collect helpers ──────────────────────────────────────────

fn collect_websocket_connections<I>(rows: I) -> Vec<WebSocketConnectionRecord>
where
    I: IntoIterator<Item = SqlResult<WebSocketConnectionRecord>>,
{
    let mut records = Vec::new();

    for row in rows {
        match row {
            Ok(record) => records.push(record),
            Err(err) => eprintln!("[db] skipping malformed websocket_connections row: {}", err),
        }
    }

    records
}

fn collect_websocket_messages<I>(rows: I) -> Vec<WebSocketMessageRecord>
where
    I: IntoIterator<Item = SqlResult<WebSocketMessageRecord>>,
{
    let mut records = Vec::new();

    for row in rows {
        match row {
            Ok(record) => records.push(record),
            Err(err) => eprintln!("[db] skipping malformed websocket_messages row: {}", err),
        }
    }

    records
}

// ── Conversion helpers ──────────────────────────────────────

fn websocket_connection_state_to_str(state: &WebSocketConnectionState) -> &'static str {
    match state {
        WebSocketConnectionState::Open => "open",
        WebSocketConnectionState::Closed => "closed",
        WebSocketConnectionState::Error => "error",
    }
}

fn websocket_connection_state_from_str(value: &str) -> WebSocketConnectionState {
    match value {
        "open" => WebSocketConnectionState::Open,
        "error" => WebSocketConnectionState::Error,
        _ => WebSocketConnectionState::Closed,
    }
}

fn websocket_message_direction_to_str(direction: &WebSocketMessageDirection) -> &'static str {
    match direction {
        WebSocketMessageDirection::Inbound => "inbound",
        WebSocketMessageDirection::Outbound => "outbound",
    }
}

fn websocket_message_direction_from_str(value: &str) -> WebSocketMessageDirection {
    match value {
        "outbound" => WebSocketMessageDirection::Outbound,
        _ => WebSocketMessageDirection::Inbound,
    }
}

fn websocket_message_type_to_str(message_type: &WebSocketMessageType) -> &'static str {
    match message_type {
        WebSocketMessageType::Text => "text",
        WebSocketMessageType::Binary => "binary",
        WebSocketMessageType::Ping => "ping",
        WebSocketMessageType::Pong => "pong",
        WebSocketMessageType::Close => "close",
    }
}

fn websocket_message_type_from_str(value: &str) -> WebSocketMessageType {
    match value {
        "binary" => WebSocketMessageType::Binary,
        "ping" => WebSocketMessageType::Ping,
        "pong" => WebSocketMessageType::Pong,
        "close" => WebSocketMessageType::Close,
        _ => WebSocketMessageType::Text,
    }
}

// ── Filter SQL builders ─────────────────────────────────────

fn append_websocket_filter_sql(
    filter: &WebSocketFilter,
    sql: &mut String,
    params_vec: &mut Vec<Box<dyn rusqlite::ToSql>>,
) {
    if let Some(ref search) = filter.search {
        if !search.is_empty() {
            let search_pattern = format!("%{}%", search);
            sql.push_str(" AND (url LIKE ? OR host LIKE ? OR path LIKE ?)");
            params_vec.push(Box::new(search_pattern.clone()));
            params_vec.push(Box::new(search_pattern.clone()));
            params_vec.push(Box::new(search_pattern));
        }
    }

    if let Some(ref states) = filter.states {
        if !states.is_empty() {
            sql.push_str(" AND state IN (");
            for (index, state) in states.iter().enumerate() {
                if index > 0 {
                    sql.push_str(", ");
                }
                sql.push('?');
                params_vec.push(Box::new(state.clone()));
            }
            sql.push(')');
        }
    }

    if let Some(ref scope) = filter.scope {
        let scoped: Vec<String> = scope
            .iter()
            .map(|pattern| pattern.trim().to_string())
            .filter(|pattern| !pattern.is_empty())
            .collect();

        if !scoped.is_empty() {
            sql.push_str(" AND (");
            for (index, pattern) in scoped.iter().enumerate() {
                if index > 0 {
                    sql.push_str(" OR ");
                }
                if let Some(domain) = pattern.strip_prefix("*.") {
                    sql.push_str("(host = ? OR host LIKE ?)");
                    params_vec.push(Box::new(domain.to_string()));
                    params_vec.push(Box::new(format!("%.{}", domain)));
                } else {
                    sql.push_str("host LIKE ?");
                    params_vec.push(Box::new(format!("%{}%", pattern)));
                }
            }
            sql.push(')');
        }
    }
}

fn append_websocket_filter_count_sql(filter: &WebSocketFilter, sql: &mut String) {
    if let Some(ref search) = filter.search {
        if !search.is_empty() {
            sql.push_str(&format!(
                " AND (url LIKE '%{0}%' OR host LIKE '%{0}%' OR path LIKE '%{0}%')",
                search
            ));
        }
    }

    if let Some(ref states) = filter.states {
        if !states.is_empty() {
            let values = states
                .iter()
                .map(|state| format!("'{}'", state))
                .collect::<Vec<_>>()
                .join(",");
            sql.push_str(&format!(" AND state IN ({})", values));
        }
    }

    if let Some(ref scope) = filter.scope {
        let clauses: Vec<String> = scope
            .iter()
            .filter_map(|pattern| {
                let value = pattern.trim();
                if value.is_empty() {
                    return None;
                }
                if let Some(domain) = value.strip_prefix("*.") {
                    Some(format!("(host = '{}' OR host LIKE '%.{}')", domain, domain))
                } else {
                    Some(format!("host LIKE '%{}%'", value))
                }
            })
            .collect();

        if !clauses.is_empty() {
            sql.push_str(" AND (");
            sql.push_str(&clauses.join(" OR "));
            sql.push(')');
        }
    }
}
