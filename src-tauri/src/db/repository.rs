use rusqlite::{params, Connection, Result as SqlResult};
use std::path::PathBuf;
use std::sync::Mutex;
use crate::proxy::state::{ProxyRecord, ProxyRequest, ProxyResponse, ProxyFilter};
use serde::{Deserialize, Serialize};
use serde_json;

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
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn init(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(crate::db::schema::CREATE_HTTP_LOGS_TABLE)?;
        Ok(())
    }

    pub fn insert_log(&self, record: &ProxyRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let request_headers = serde_json::to_string(&record.request.headers).unwrap_or_default();
        let response_headers = record.response.as_ref()
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
        
        let mut records = Vec::new();
        for row in rows {
            records.push(row?);
        }
        Ok(records)
    }

    pub fn get_filtered(&self, filter: &ProxyFilter) -> SqlResult<Vec<ProxyRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut sql = String::from("SELECT * FROM http_logs WHERE 1=1");
        let mut conditions = Vec::new();

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                conditions.push(format!("(url LIKE '%{}%' OR method LIKE '%{}%')", search, search));
            }
        }

        if let Some(ref methods) = filter.methods {
            if !methods.is_empty() {
                let method_list: Vec<String> = methods.iter()
                    .map(|m| format!("'{}'", m))
                    .collect();
                conditions.push(format!("method IN ({})", method_list.join(",")));
            }
        }

        if let Some(ref status_codes) = filter.status_codes {
            if !status_codes.is_empty() {
                let status_list: Vec<String> = status_codes.iter()
                    .map(|s| s.to_string())
                    .collect();
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
        
        let mut records = Vec::new();
        for row in rows {
            records.push(row?);
        }
        Ok(records)
    }

    pub fn delete_log(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM http_logs WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn clear_logs(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM http_logs", [])?;
        Ok(())
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

        let mut records = Vec::new();
        for row in rows {
            records.push(row.map_err(|e| e.to_string())?);
        }

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
        let mut param_idx = 1;

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                sql.push_str(&format!(" AND (url LIKE ${}", param_idx));
                params_vec.push(Box::new(format!("%{}%", search)));
                param_idx += 1;
                sql.push_str(&format!(" OR method LIKE ${})", param_idx - 1));
            }
        }

        if let Some(ref methods) = filter.methods {
            if !methods.is_empty() {
                sql.push_str(" AND method IN (");
                for (i, m) in methods.iter().enumerate() {
                    if i > 0 {
                        sql.push_str(", ");
                    }
                    sql.push_str(&format!("${}", param_idx));
                    params_vec.push(Box::new(m.clone()));
                    param_idx += 1;
                }
                sql.push_str(")");
            }
        }

        if let Some(ref status_codes) = filter.status_codes {
            if !status_codes.is_empty() {
                sql.push_str(" AND response_status IN (");
                for (i, s) in status_codes.iter().enumerate() {
                    if i > 0 {
                        sql.push_str(", ");
                    }
                    sql.push_str(&format!("${}", param_idx));
                    params_vec.push(Box::new(*s as i64));
                    param_idx += 1;
                }
                sql.push_str(")");
            }
        }

        sql.push_str(&format!(" ORDER BY timestamp {} LIMIT ? OFFSET ?", sort_order));

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        let mut all_params: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|b| b.as_ref())
            .collect();
        all_params.push(&per_page as &dyn rusqlite::ToSql);
        all_params.push(&offset as &dyn rusqlite::ToSql);

        let rows = stmt
            .query_map(all_params.as_slice(), row_to_proxy_record)
            .map_err(|e| e.to_string())?;

        let mut records = Vec::new();
        for row in rows {
            records.push(row.map_err(|e| e.to_string())?);
        }

        let mut count_sql = String::from("SELECT COUNT(*) FROM http_logs WHERE 1=1");

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                count_sql.push_str(&format!(" AND (url LIKE '%{}%' OR method LIKE '%{}%')", search, search));
            }
        }

        if let Some(ref methods) = filter.methods {
            if !methods.is_empty() {
                let method_list: Vec<String> =
                    methods.iter().map(|m| format!("'{}'", m)).collect();
                count_sql.push_str(&format!(" AND method IN ({})", method_list.join(",")));
            }
        }

        if let Some(ref status_codes) = filter.status_codes {
            if !status_codes.is_empty() {
                let status_list: Vec<String> = status_codes
                    .iter()
                    .map(|s| s.to_string())
                    .collect();
                count_sql.push_str(&format!(
                    " AND response_status IN ({})",
                    status_list.join(",")
                ));
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
}

fn row_to_proxy_record(row: &rusqlite::Row) -> SqlResult<ProxyRecord> {
    let id: String = row.get(0)?;
    let timestamp: String = row.get(1)?;
    let method: String = row.get(2)?;
    let url: String = row.get(3)?;
    let request_headers: String = row.get(4)?;
    let request_body: Vec<u8> = row.get(5)?;
    let response_status: Option<i64> = row.get(6)?;
    let response_status_text: Option<String> = row.get(7)?;
    let response_headers: String = row.get(8)?;
    let response_body: Option<Vec<u8>> = row.get(9)?;
    let client_addr: String = row.get(10)?;
    let server_addr: String = row.get(11)?;

    let request = ProxyRequest {
        method,
        uri: url,
        http_version: String::from("HTTP/1.1"),
        headers: serde_json::from_str(&request_headers).unwrap_or_default(),
        body: request_body,
    };

    let response = response_status.map(|status| ProxyResponse {
        status_code: status as u16,
        status_text: response_status_text.unwrap_or_default(),
        http_version: String::from("HTTP/1.1"),
        headers: serde_json::from_str(&response_headers).unwrap_or_default(),
        body: response_body.unwrap_or_default(),
    });

    Ok(ProxyRecord {
        id: uuid::Uuid::parse_str(&id).map_err(|_| rusqlite::Error::InvalidQuery)?,
        timestamp: chrono::DateTime::parse_from_rfc3339(&timestamp)
            .map_err(|_| rusqlite::Error::InvalidQuery)?
            .with_timezone(&chrono::Utc),
        request,
        response,
        client_addr,
        server_addr,
    })
}