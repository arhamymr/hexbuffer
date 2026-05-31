use crate::packet_capture::types::{
    PacketCaptureRecord, PacketConnectionRecord, StoredPacketRecord,
};
use crate::proxy::state::{
    ProxyFilter, ProxyRecord, ProxyRequest, ProxyResponse, WebSocketConnectionRecord,
    WebSocketConnectionState, WebSocketFilter, WebSocketMessageDirection, WebSocketMessageRecord,
    WebSocketMessageType,
};
use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use serde_json;
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRecord {
    pub id: String,
    pub name: String,
    pub title: String,
    pub sections: serde_json::Value,
    pub api_entries: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: usize,
    pub page: u32,
    pub per_page: u32,
    pub has_more: bool,
}

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
        Ok(())
    }

    pub fn insert_packet_capture(&self, capture: &PacketCaptureRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            r#"INSERT INTO captures (
                id, name, interface_id, interface_label, started_at, ended_at, status, packet_count, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
            params![
                capture.id,
                capture.name,
                capture.interface_id,
                capture.interface_label,
                capture.started_at,
                capture.ended_at,
                capture.status,
                capture.packet_count as i64,
                capture.created_at,
            ],
        )?;

        Ok(())
    }

    pub fn finish_packet_capture(&self, capture_id: &str, ended_at: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            r#"UPDATE captures
               SET ended_at = ?2, status = 'stopped'
               WHERE id = ?1"#,
            params![capture_id, ended_at],
        )?;

        Ok(())
    }

    pub fn insert_captured_packet(
        &self,
        packet: &StoredPacketRecord,
        connection: &PacketConnectionRecord,
    ) -> SqlResult<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        tx.execute(
            r#"INSERT OR IGNORE INTO packets (
                id, capture_id, packet_number, timestamp, relative_time,
                source_ip, destination_ip, protocol, source_port, destination_port,
                packet_length, info, raw_line, raw_data, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"#,
            params![
                packet.id,
                packet.capture_id,
                packet.packet_number as i64,
                packet.timestamp,
                packet.relative_time,
                packet.source_ip,
                packet.destination_ip,
                packet.protocol,
                packet.source_port.map(|value| value as i64),
                packet.destination_port.map(|value| value as i64),
                packet.packet_length as i64,
                packet.info,
                packet.raw_line,
                packet.raw_data,
                packet.created_at,
            ],
        )?;

        tx.execute(
            r#"INSERT INTO connections (
                id, capture_id, source_ip, source_port, destination_ip, destination_port,
                protocol, first_seen, last_seen, packet_count, total_bytes, incomplete
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?11)
            ON CONFLICT(id) DO UPDATE SET
                last_seen = excluded.last_seen,
                packet_count = packet_count + 1,
                total_bytes = total_bytes + excluded.total_bytes,
                incomplete = excluded.incomplete"#,
            params![
                connection.id,
                connection.capture_id,
                connection.source_ip,
                connection.source_port.map(|value| value as i64),
                connection.destination_ip,
                connection.destination_port.map(|value| value as i64),
                connection.protocol,
                connection.first_seen,
                connection.last_seen,
                connection.total_bytes as i64,
                if connection.incomplete { 1i64 } else { 0i64 },
            ],
        )?;

        tx.execute(
            r#"UPDATE captures
               SET packet_count = packet_count + 1
               WHERE id = ?1"#,
            params![packet.capture_id],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn get_packets_paginated(
        &self,
        capture_id: &str,
        page: u32,
        per_page: u32,
    ) -> Result<PaginatedResponse<StoredPacketRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let offset = (page - 1) * per_page;

        let mut stmt = conn
            .prepare(
                r#"SELECT id, capture_id, packet_number, timestamp, relative_time,
                   source_ip, destination_ip, protocol, source_port, destination_port,
                   packet_length, info, raw_line, raw_data, created_at
                   FROM packets WHERE capture_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?"#,
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(
                params![capture_id, per_page as i64, offset as i64],
                row_to_stored_packet_record,
            )
            .map_err(|e| e.to_string())?;

        let records = collect_stored_packet_records(rows);

        let total: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM packets WHERE capture_id = ?",
                params![capture_id],
                |row| row.get(0),
            )
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

    pub fn get_documents(&self) -> SqlResult<Vec<DocumentRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"SELECT id, name, title, sections, api_entries, created_at, updated_at
               FROM documents
               ORDER BY created_at ASC"#,
        )?;
        let rows = stmt.query_map([], row_to_document_record)?;

        rows.collect()
    }

    pub fn upsert_document(&self, document: &DocumentRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let sections = serde_json::to_string(&document.sections).unwrap_or_else(|_| "{}".into());
        let api_entries =
            serde_json::to_string(&document.api_entries).unwrap_or_else(|_| "[]".into());

        conn.execute(
            r#"INSERT INTO documents (
                id, name, title, sections, api_entries, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                title = excluded.title,
                sections = excluded.sections,
                api_entries = excluded.api_entries,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at"#,
            params![
                document.id,
                document.name,
                document.title,
                sections,
                api_entries,
                document.created_at,
                document.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_document(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM documents WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn insert_log(&self, record: &ProxyRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let request_headers = serde_json::to_string(&record.request.headers).unwrap_or_default();
        let response_headers = record
            .response
            .as_ref()
            .map(|r| serde_json::to_string(&r.headers).unwrap_or_default())
            .unwrap_or_default();

        conn.execute(
            r#"INSERT INTO http_logs (
                id, timestamp, method, url,
                request_headers, request_body,
                response_status, response_status_text,
                response_headers, response_body,
                client_addr, server_addr, duration_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"#,
            params![
                record.id.to_string(),
                record.timestamp.to_rfc3339(),
                record.request.method,
                record.request.uri,
                request_headers,
                record.request.body,
                record.response.as_ref().map(|r| r.status_code as i64),
                record.response.as_ref().map(|r| r.status_text.clone()),
                response_headers,
                record.response.as_ref().map(|r| r.body.clone()),
                record.client_addr,
                record.server_addr,
                0i64, // duration_ms placeholder
            ],
        )?;
        Ok(())
    }

    pub fn get_all(&self) -> SqlResult<Vec<ProxyRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM http_logs ORDER BY timestamp DESC")?;
        let rows = stmt.query_map([], row_to_proxy_record)?;

        Ok(collect_records(rows))
    }

    pub fn get_filtered(&self, filter: &ProxyFilter) -> SqlResult<Vec<ProxyRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut sql = String::from("SELECT * FROM http_logs WHERE 1=1");
        let mut conditions = Vec::new();

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                conditions.push(format!(
                    "(url LIKE '%{}%' OR method LIKE '%{}%')",
                    search, search
                ));
            }
        }

        if let Some(ref path) = filter.path {
            if !path.is_empty() {
                conditions.push(format!("url LIKE '%{}%'", path));
            }
        }

        if let Some(ref methods) = filter.methods {
            if !methods.is_empty() {
                let method_list: Vec<String> = methods.iter().map(|m| format!("'{}'", m)).collect();
                conditions.push(format!("method IN ({})", method_list.join(",")));
            }
        }

        if let Some(ref status_codes) = filter.status_codes {
            if !status_codes.is_empty() {
                let status_list: Vec<String> = status_codes.iter().map(|s| s.to_string()).collect();
                conditions.push(format!("response_status IN ({})", status_list.join(",")));
            }
        }

        if !conditions.is_empty() {
            sql.push_str(" AND ");
            sql.push_str(&conditions.join(" AND "));
        }

        sql.push_str(" ORDER BY timestamp DESC");

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map([], row_to_proxy_record)?;

        Ok(collect_records(rows))
    }

    pub fn delete_log(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM http_logs WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_by_id(&self, id: &str) -> SqlResult<Option<ProxyRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM http_logs WHERE id = ?1 LIMIT 1")?;
        let mut rows = stmt.query(params![id])?;

        match rows.next()? {
            Some(row) => row_to_proxy_record(row).map(Some),
            None => Ok(None),
        }
    }

    pub fn clear_logs(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM http_logs", [])?;
        Ok(())
    }

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

    pub fn get_paginated(
        &self,
        page: u32,
        per_page: u32,
        sort_order: &str,
    ) -> Result<PaginatedResponse<ProxyRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let offset = (page - 1) * per_page;

        let mut stmt = conn
            .prepare(&format!(
                "SELECT * FROM http_logs ORDER BY timestamp {} LIMIT ? OFFSET ?",
                sort_order
            ))
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![per_page as i64, offset as i64], row_to_proxy_record)
            .map_err(|e| e.to_string())?;

        let records = collect_records(rows);

        let total: i64 = conn
            .query_row("SELECT COUNT(*) FROM http_logs", [], |row| row.get(0))
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

    pub fn get_filtered_paginated(
        &self,
        filter: &ProxyFilter,
        page: u32,
        per_page: u32,
        sort_order: &str,
    ) -> Result<PaginatedResponse<ProxyRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let offset = (page - 1) * per_page;

        let mut sql = String::from("SELECT * FROM http_logs WHERE 1=1");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                let search_pattern = format!("%{}%", search);
                sql.push_str(" AND (url LIKE ? OR method LIKE ?)");
                params_vec.push(Box::new(search_pattern.clone()));
                params_vec.push(Box::new(search_pattern));
            }
        }

        if let Some(ref path) = filter.path {
            if !path.is_empty() {
                sql.push_str(" AND url LIKE ?");
                params_vec.push(Box::new(format!("%{}%", path)));
            }
        }

        if let Some(ref methods) = filter.methods {
            if !methods.is_empty() {
                sql.push_str(" AND method IN (");
                for (i, m) in methods.iter().enumerate() {
                    if i > 0 {
                        sql.push_str(", ");
                    }
                    sql.push_str("?");
                    params_vec.push(Box::new(m.clone()));
                }
                sql.push(')');
            }
        }

        if let Some(ref status_codes) = filter.status_codes {
            if !status_codes.is_empty() {
                sql.push_str(" AND response_status IN (");
                for (i, s) in status_codes.iter().enumerate() {
                    if i > 0 {
                        sql.push_str(", ");
                    }
                    sql.push_str("?");
                    params_vec.push(Box::new(*s as i64));
                }
                sql.push(')');
            }
        }

        if let Some(ref scope) = filter.scope {
            let scope_clauses: Vec<String> = scope
                .iter()
                .filter_map(|pattern| {
                    let value = pattern.trim();
                    if value.is_empty() {
                        return None;
                    }

                    if let Some(domain) = value.strip_prefix("*.") {
                        Some(format!(
                            "(url LIKE '%://{}%' OR url LIKE '%://%.{}%')",
                            domain, domain
                        ))
                    } else {
                        Some(format!("url LIKE '%://{}%'", value))
                    }
                })
                .collect();

            if !scope_clauses.is_empty() {
                sql.push_str(" AND (");
                sql.push_str(&scope_clauses.join(" OR "));
                sql.push(')');
            }
        }

        sql.push_str(&format!(
            " ORDER BY timestamp {} LIMIT ? OFFSET ?",
            sort_order
        ));

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        let mut all_params: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|b| b.as_ref()).collect();
        all_params.push(&per_page as &dyn rusqlite::ToSql);
        all_params.push(&offset as &dyn rusqlite::ToSql);

        let rows = stmt
            .query_map(all_params.as_slice(), row_to_proxy_record)
            .map_err(|e| e.to_string())?;

        let records = collect_records(rows);

        let mut count_sql = String::from("SELECT COUNT(*) FROM http_logs WHERE 1=1");

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                count_sql.push_str(&format!(
                    " AND (url LIKE '%{}%' OR method LIKE '%{}%')",
                    search, search
                ));
            }
        }

        if let Some(ref path) = filter.path {
            if !path.is_empty() {
                count_sql.push_str(&format!(" AND url LIKE '%{}%'", path));
            }
        }

        if let Some(ref methods) = filter.methods {
            if !methods.is_empty() {
                let method_list: Vec<String> = methods.iter().map(|m| format!("'{}'", m)).collect();
                count_sql.push_str(&format!(" AND method IN ({})", method_list.join(",")));
            }
        }

        if let Some(ref status_codes) = filter.status_codes {
            if !status_codes.is_empty() {
                let status_list: Vec<String> = status_codes.iter().map(|s| s.to_string()).collect();
                count_sql.push_str(&format!(
                    " AND response_status IN ({})",
                    status_list.join(",")
                ));
            }
        }

        if let Some(ref scope) = filter.scope {
            let scope_clauses: Vec<String> = scope
                .iter()
                .filter_map(|pattern| {
                    let value = pattern.trim();
                    if value.is_empty() {
                        return None;
                    }

                    if let Some(domain) = value.strip_prefix("*.") {
                        Some(format!(
                            "(url LIKE '%://{}%' OR url LIKE '%://%.{}%')",
                            domain, domain
                        ))
                    } else {
                        Some(format!("url LIKE '%://{}%'", value))
                    }
                })
                .collect();

            if !scope_clauses.is_empty() {
                count_sql.push_str(" AND (");
                count_sql.push_str(&scope_clauses.join(" OR "));
                count_sql.push(')');
            }
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

    pub fn count(&self) -> Result<usize, String> {
        let conn = self.conn.lock().unwrap();
        let total: i64 = conn
            .query_row("SELECT COUNT(*) FROM http_logs", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        Ok(total as usize)
    }

    pub fn get_tree(&self, filter: &ProxyFilter) -> Result<Vec<TreeNode>, String> {
        let conn = self.conn.lock().unwrap();

        let mut sql = String::from("SELECT url, method FROM http_logs WHERE 1=1");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                let search_pattern = format!("%{}%", search);
                sql.push_str(" AND (url LIKE ? OR method LIKE ?)");
                params_vec.push(Box::new(search_pattern.clone()));
                params_vec.push(Box::new(search_pattern));
            }
        }

        if let Some(ref path) = filter.path {
            if !path.is_empty() {
                sql.push_str(" AND url LIKE ?");
                params_vec.push(Box::new(format!("%{}%", path)));
            }
        }

        if let Some(ref methods) = filter.methods {
            if !methods.is_empty() {
                sql.push_str(" AND method IN (");
                for (i, m) in methods.iter().enumerate() {
                    if i > 0 {
                        sql.push_str(", ");
                    }
                    sql.push_str("?");
                    params_vec.push(Box::new(m.clone()));
                }
                sql.push(')');
            }
        }

        if let Some(ref status_codes) = filter.status_codes {
            if !status_codes.is_empty() {
                sql.push_str(" AND response_status IN (");
                for (i, s) in status_codes.iter().enumerate() {
                    if i > 0 {
                        sql.push_str(", ");
                    }
                    sql.push_str("?");
                    params_vec.push(Box::new(*s as i64));
                }
                sql.push(')');
            }
        }

        if let Some(ref scope) = filter.scope {
            let scope_clauses: Vec<String> = scope
                .iter()
                .filter_map(|pattern| {
                    let value = pattern.trim();
                    if value.is_empty() {
                        return None;
                    }

                    if let Some(domain) = value.strip_prefix("*.") {
                        Some(format!(
                            "(url LIKE '%://{}%' OR url LIKE '%://%.{}%')",
                            domain, domain
                        ))
                    } else {
                        Some(format!("url LIKE '%://{}%'", value))
                    }
                })
                .collect();

            if !scope_clauses.is_empty() {
                sql.push_str(" AND (");
                sql.push_str(&scope_clauses.join(" OR "));
                sql.push(')');
            }
        }

        let all_params: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(all_params.as_slice(), |row| {
                let url: String = row.get(0)?;
                let method: String = row.get(1)?;
                Ok((url, method))
            })
            .map_err(|e| e.to_string())?;

        #[derive(Default)]
        struct PathInfo {
            url: String,
            count: u32,
            methods: std::collections::HashSet<String>,
        }

        let mut host_paths: std::collections::HashMap<
            String,
            std::collections::HashMap<String, PathInfo>,
        > = Default::default();

        for row in rows {
            let (url, method) = row.map_err(|e| e.to_string())?;
            let uri = if url.contains("://") {
                match url.split("://").nth(1) {
                    Some(u) => u,
                    _ => &url,
                }
            } else {
                &url
            };
            let host = uri.split('/').next().unwrap_or("");

            let host_entry = host_paths.entry(host.to_string()).or_default();
            let path_entry = host_entry
                .entry(url.to_string())
                .or_insert_with(|| PathInfo {
                    url,
                    ..Default::default()
                });
            path_entry.count += 1;
            path_entry.methods.insert(method);
        }

        let mut tree: Vec<TreeNode> = Vec::new();
        let mut hosts: Vec<_> = host_paths.into_iter().collect();
        hosts.sort_by(|a, b| a.0.cmp(&b.0));

        for (host, paths_map) in hosts {
            let mut paths_vec: Vec<TreePath> = Vec::new();
            let mut paths: Vec<_> = paths_map.into_iter().collect();
            paths.sort_by(|a, b| b.1.count.cmp(&a.1.count));

            for (_url, info) in paths {
                let mut methods: Vec<String> = info.methods.into_iter().collect();
                methods.sort();
                let uri = if info.url.contains("://") {
                    match info.url.split("://").nth(1) {
                        Some(u) => u,
                        _ => &info.url,
                    }
                } else {
                    &info.url
                };
                let path = uri.strip_prefix(&host).unwrap_or("/");
                let path = if path.is_empty() { "/" } else { path };
                paths_vec.push(TreePath {
                    path: path.to_string(),
                    url: info.url,
                    count: info.count,
                    methods,
                });
            }

            tree.push(TreeNode {
                host,
                paths: paths_vec,
            });
        }

        Ok(tree)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeNode {
    pub host: String,
    pub paths: Vec<TreePath>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreePath {
    pub path: String,
    pub url: String,
    pub count: u32,
    pub methods: Vec<String>,
}

fn row_to_proxy_record(row: &rusqlite::Row) -> SqlResult<ProxyRecord> {
    let id: String = row.get(0)?;
    let timestamp: String = row.get(1)?;
    let method: String = row.get(2)?;
    let url: String = row.get(3)?;
    let request_headers: Option<String> = row.get(4)?;
    let request_body: Option<Vec<u8>> = row.get(5)?;
    let response_status: Option<i64> = row.get(6)?;
    let response_status_text: Option<String> = row.get(7)?;
    let response_headers: Option<String> = row.get(8)?;
    let response_body: Option<Vec<u8>> = row.get(9)?;
    let client_addr: Option<String> = row.get(10)?;
    let server_addr: Option<String> = row.get(11)?;

    let mut request = ProxyRequest {
        method,
        uri: url,
        http_version: String::from("HTTP/1.1"),
        headers: request_headers
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .unwrap_or_default()
            .unwrap_or_default(),
        body: request_body.unwrap_or_default(),
        content_decoded: false,
    };

    if !request.content_decoded
        && !request.body.is_empty()
        && request
            .headers
            .keys()
            .any(|k| k.eq_ignore_ascii_case("content-encoding"))
    {
        request.content_decoded = true;
    }

    let mut response = response_status.map(|status| ProxyResponse {
        status_code: status as u16,
        status_text: response_status_text.unwrap_or_default(),
        http_version: String::from("HTTP/1.1"),
        headers: response_headers
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .unwrap_or_default()
            .unwrap_or_default(),
        body: response_body.unwrap_or_default(),
        content_decoded: false,
    });

    if let Some(ref mut resp) = response {
        if !resp.content_decoded
            && !resp.body.is_empty()
            && resp
                .headers
                .keys()
                .any(|k| k.eq_ignore_ascii_case("content-encoding"))
        {
            resp.content_decoded = true;
        }
    }

    Ok(ProxyRecord {
        id: Uuid::parse_str(&id).map_err(|_| rusqlite::Error::InvalidQuery)?,
        timestamp: chrono::DateTime::parse_from_rfc3339(&timestamp)
            .map_err(|_| rusqlite::Error::InvalidQuery)?
            .with_timezone(&chrono::Utc),
        request,
        response,
        client_addr: client_addr.unwrap_or_default(),
        server_addr: server_addr.unwrap_or_default(),
    })
}

fn row_to_document_record(row: &rusqlite::Row) -> SqlResult<DocumentRecord> {
    let sections: String = row.get("sections")?;
    let api_entries: String = row.get("api_entries")?;

    Ok(DocumentRecord {
        id: row.get("id")?,
        name: row.get("name")?,
        title: row.get("title")?,
        sections: serde_json::from_str(&sections).unwrap_or_else(|_| serde_json::json!({})),
        api_entries: serde_json::from_str(&api_entries).unwrap_or_else(|_| serde_json::json!([])),
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_stored_packet_record(row: &rusqlite::Row) -> SqlResult<StoredPacketRecord> {
    Ok(StoredPacketRecord {
        id: row.get(0)?,
        capture_id: row.get(1)?,
        packet_number: row.get::<_, i64>(2)? as u64,
        timestamp: row.get::<_, f64>(3)?,
        relative_time: row.get::<_, f64>(4)?,
        source_ip: row.get(5)?,
        destination_ip: row.get(6)?,
        protocol: row.get(7)?,
        source_port: row.get::<_, Option<i64>>(8)?.map(|v| v as u16),
        destination_port: row.get::<_, Option<i64>>(9)?.map(|v| v as u16),
        packet_length: row.get::<_, i64>(10)? as usize,
        info: row.get(11)?,
        raw_line: row.get(12)?,
        raw_data: row.get(13)?,
        created_at: row.get(14)?,
    })
}

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

fn collect_records<I>(rows: I) -> Vec<ProxyRecord>
where
    I: IntoIterator<Item = SqlResult<ProxyRecord>>,
{
    let mut records = Vec::new();

    for row in rows {
        match row {
            Ok(record) => records.push(record),
            Err(err) => eprintln!("[db] skipping malformed http_logs row: {}", err),
        }
    }

    records
}

fn collect_stored_packet_records<I>(rows: I) -> Vec<StoredPacketRecord>
where
    I: IntoIterator<Item = SqlResult<StoredPacketRecord>>,
{
    let mut records = Vec::new();

    for row in rows {
        match row {
            Ok(record) => records.push(record),
            Err(err) => eprintln!("[db] skipping malformed packets row: {}", err),
        }
    }

    records
}

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
