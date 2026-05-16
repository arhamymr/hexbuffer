use tauri_plugin_sql::{Database, Row, Value};
use crate::proxy::state::{ProxyRecord, ProxyRequest, ProxyResponse};
use serde_json;

pub async fn insert_log(db: &Database, record: &ProxyRecord) -> Result<(), String> {
    let request_headers = serde_json::to_string(&record.request.headers).unwrap_or_default();
    let response_headers = record.response.as_ref()
        .map(|r| serde_json::to_string(&r.headers).unwrap_or_default())
        .unwrap_or_default();

    db.execute(
        r#"INSERT INTO http_logs (
            id, timestamp, method, url,
            request_headers, request_body,
            response_status, response_status_text,
            response_headers, response_body,
            client_addr, server_addr, duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"#,
        vec![
            Value::Text(record.id.to_string()),
            Value::Text(record.timestamp.to_rfc3339()),
            Value::Text(record.request.method.clone()),
            Value::Text(record.request.uri.clone()),
            Value::Text(request_headers),
            Value::Binary(record.request.body.clone()),
            record.response.as_ref().map(|r| Value::Integer(r.status_code as i64)).unwrap_or(Value::Null),
            record.response.as_ref().map(|r| Value::Text(r.status_text.clone())).unwrap_or(Value::Null),
            Value::Text(response_headers),
            record.response.as_ref().map(|r| Value::Binary(r.body.clone())).unwrap_or(Value::Null),
            Value::Text(record.client_addr.clone()),
            Value::Text(record.server_addr.clone()),
            None::<i64>.map(|_| Value::Integer(0)), // duration_ms placeholder
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn get_all(db: &Database) -> Result<Vec<ProxyRecord>, String> {
    let rows = db
        .select::<Row>(r#"SELECT * FROM http_logs ORDER BY timestamp DESC"#)
        .await
        .map_err(|e| e.to_string())?;

    rows.into_iter().map(row_to_proxy_record).collect()
}

pub async fn get_filtered(db: &Database, filter: &ProxyFilter) -> Result<Vec<ProxyRecord>, String> {
    let mut sql = String::from("SELECT * FROM http_logs WHERE 1=1");
    let mut params: Vec<Value> = vec![];

    if let Some(ref search) = filter.search {
        if !search.is_empty() {
            sql.push_str(" AND (url LIKE $1 OR method LIKE $1)");
            params.push(Value::Text(format!("%{}%", search)));
        }
    }

    if let Some(ref methods) = filter.methods {
        if !methods.is_empty() {
            let placeholders: Vec<String> = methods.iter()
                .enumerate()
                .map(|(i, _)| format!("${}", i + params.len() + 1))
                .collect();
            sql.push_str(&format!(" AND method IN ({})", placeholders.join(",")));
            params.extend(methods.iter().map(|m| Value::Text(m.clone())));
        }
    }

    if let Some(ref status_codes) = filter.status_codes {
        if !status_codes.is_empty() {
            let placeholders: Vec<String> = status_codes.iter()
                .enumerate()
                .map(|(i, _)| format!("${}", i + params.len() + 1))
                .collect();
            sql.push_str(&format!(" AND response_status IN ({})", placeholders.join(",")));
            params.extend(status_codes.iter().map(|s| Value::Integer(*s as i64)));
        }
    }

    sql.push_str(" ORDER BY timestamp DESC");

    let rows = db
        .select_with_params::<Row>(&sql, params)
        .await
        .map_err(|e| e.to_string())?;

    rows.into_iter().map(row_to_proxy_record).collect()
}

pub async fn delete_log(db: &Database, id: &str) -> Result<(), String> {
    db.execute("DELETE FROM http_logs WHERE id = $1", vec![Value::Text(id.to_string())])
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn clear_logs(db: &Database) -> Result<(), String> {
    db.execute("DELETE FROM http_logs", vec![])
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn row_to_proxy_record(row: Row) -> Result<ProxyRecord, String> {
    let mut values = row.values;
    
    fn get_text(values: &[Value], idx: usize) -> String {
        match &values[idx] {
            Value::Text(s) => s.clone(),
            _ => String::new(),
        }
    }
    
    fn get_blob(values: &[Value], idx: usize) -> Vec<u8> {
        match &values[idx] {
            Value::Binary(b) => b.clone(),
            _ => vec![],
        }
    }
    
    fn get_i64(values: &[Value], idx: usize) -> Option<i64> {
        match &values[idx] {
            Value::Integer(i) => Some(*i),
            Value::Null => None,
            _ => None,
        }
    }

    let id = get_text(&values, 0);
    let timestamp = get_text(&values, 1);
    let method = get_text(&values, 2);
    let url = get_text(&values, 3);
    let request_headers = get_text(&values, 4);
    let request_body = get_blob(&values, 5);
    let response_status = get_i64(&values, 6);
    let response_status_text = get_text(&values, 7);
    let response_headers = get_text(&values, 8);
    let response_body = get_blob(&values, 9);
    let client_addr = get_text(&values, 10);
    let server_addr = get_text(&values, 11);

    let request = ProxyRequest {
        method,
        uri: url,
        http_version: String::from("HTTP/1.1"),
        headers: serde_json::from_str(&request_headers).unwrap_or_default(),
        body: request_body,
    };

    let response = response_status.map(|status| ProxyResponse {
        status_code: status as u16,
        status_text: response_status_text,
        http_version: String::from("HTTP/1.1"),
        headers: serde_json::from_str(&response_headers).unwrap_or_default(),
        body: response_body,
    });

    Ok(ProxyRecord {
        id: uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?,
        timestamp: chrono::DateTime::parse_from_rfc3339(&timestamp)
            .map_err(|e| e.to_string())?
            .with_timezone(&chrono::Utc),
        request,
        response,
        client_addr,
        server_addr,
    })
}

use crate::proxy::state::ProxyFilter;