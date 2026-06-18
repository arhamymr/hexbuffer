use crate::proxy::state::{ProxyFilter, ProxyRecord, ProxyRequest, ProxyResponse};
use rusqlite::{params, Result as SqlResult};
use uuid::Uuid;

use super::types::{PaginatedResponse, ProxySummaryRow, TreeNode, TreePath};
use super::Database;

impl Database {
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

    /// Optimized paginated query that skips request/response BLOBs and headers.
    /// Only selects lightweight columns needed for the summary table view.
    pub fn get_summary_paginated(
        &self,
        page: u32,
        per_page: u32,
        sort_order: &str,
    ) -> Result<PaginatedResponse<ProxySummaryRow>, String> {
        let conn = self.conn.lock().unwrap();
        let offset = (page - 1) * per_page;

        let sql = format!(
            "SELECT id, timestamp, method, url, response_status, response_status_text,
                    COALESCE(LENGTH(request_body), 0),
                    COALESCE(LENGTH(response_body), 0),
                    COALESCE(server_addr, ''),
                    json_extract(CASE WHEN request_headers IS NOT NULL AND request_headers != '' THEN request_headers ELSE '{{}}' END, '$.user-agent'),
                    json_extract(CASE WHEN request_headers IS NOT NULL AND request_headers != '' THEN request_headers ELSE '{{}}' END, '$.referer'),
                    json_extract(CASE WHEN response_headers IS NOT NULL AND response_headers != '' THEN response_headers ELSE '{{}}' END, '$.content-type')
             FROM http_logs
             ORDER BY timestamp {} LIMIT ? OFFSET ?",
            sort_order
        );

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query(params![per_page as i64, offset as i64])
            .map_err(|e| e.to_string())?;
        let mut records: Vec<ProxySummaryRow> = Vec::new();
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            records.push(row_to_proxy_summary(row).map_err(|e| e.to_string())?);
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

    /// Optimized filtered paginated query that skips request/response BLOBs.
    /// Uses parameterized queries for both data and count to allow SQLite plan caching.
    pub fn get_filtered_summary_paginated(
        &self,
        filter: &ProxyFilter,
        page: u32,
        per_page: u32,
        sort_order: &str,
    ) -> Result<PaginatedResponse<ProxySummaryRow>, String> {
        let conn = self.conn.lock().unwrap();
        let offset = (page - 1) * per_page;

        let mut where_sql = String::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                let search_pattern = format!("%{}%", search);
                where_sql.push_str(" AND (url LIKE ? OR method LIKE ?)");
                params_vec.push(Box::new(search_pattern.clone()));
                params_vec.push(Box::new(search_pattern));
            }
        }

        if let Some(ref path) = filter.path {
            if !path.is_empty() {
                where_sql.push_str(" AND url LIKE ?");
                params_vec.push(Box::new(format!("%{}%", path)));
            }
        }

        if let Some(ref methods) = filter.methods {
            if !methods.is_empty() {
                where_sql.push_str(" AND method IN (");
                for (i, m) in methods.iter().enumerate() {
                    if i > 0 {
                        where_sql.push_str(", ");
                    }
                    where_sql.push('?');
                    params_vec.push(Box::new(m.clone()));
                }
                where_sql.push(')');
            }
        }

        if let Some(ref status_codes) = filter.status_codes {
            if !status_codes.is_empty() {
                where_sql.push_str(" AND response_status IN (");
                for (i, s) in status_codes.iter().enumerate() {
                    if i > 0 {
                        where_sql.push_str(", ");
                    }
                    where_sql.push('?');
                    params_vec.push(Box::new(*s as i64));
                }
                where_sql.push(')');
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
                where_sql.push_str(" AND (");
                where_sql.push_str(&scope_clauses.join(" OR "));
                where_sql.push(')');
            }
        }

        let data_sql = format!(
            "SELECT id, timestamp, method, url, response_status, response_status_text,
                    COALESCE(LENGTH(request_body), 0),
                    COALESCE(LENGTH(response_body), 0),
                    COALESCE(server_addr, ''),
                    json_extract(CASE WHEN request_headers IS NOT NULL AND request_headers != '' THEN request_headers ELSE '{{}}' END, '$.user-agent'),
                    json_extract(CASE WHEN request_headers IS NOT NULL AND request_headers != '' THEN request_headers ELSE '{{}}' END, '$.referer'),
                    json_extract(CASE WHEN response_headers IS NOT NULL AND response_headers != '' THEN response_headers ELSE '{{}}' END, '$.content-type')
             FROM http_logs WHERE 1=1{}
             ORDER BY timestamp {} LIMIT ? OFFSET ?",
            where_sql, sort_order
        );

        let count_sql = format!("SELECT COUNT(*) FROM http_logs WHERE 1=1{}", where_sql);

        let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;
        let mut all_params: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|b| b.as_ref()).collect();
        all_params.push(&per_page as &dyn rusqlite::ToSql);
        all_params.push(&offset as &dyn rusqlite::ToSql);

        let mut rows = stmt
            .query(all_params.as_slice())
            .map_err(|e| e.to_string())?;
        let mut records: Vec<ProxySummaryRow> = Vec::new();
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            records.push(row_to_proxy_summary(row).map_err(|e| e.to_string())?);
        }

        let count_params: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|b| b.as_ref()).collect();
        let total: i64 = conn
            .query_row(&count_sql, count_params.as_slice(), |row| row.get(0))
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

fn row_to_proxy_summary(row: &rusqlite::Row) -> SqlResult<ProxySummaryRow> {
    Ok(ProxySummaryRow {
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
        referrer: row.get(10)?,
        response_content_type: row.get(11)?,
    })
}

fn collect_records<T, I>(rows: I) -> Vec<T>
where
    I: IntoIterator<Item = SqlResult<T>>,
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
