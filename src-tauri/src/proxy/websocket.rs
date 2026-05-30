use std::collections::HashMap;

use tauri::{Emitter, Manager};
use url::Url;

use super::lifecycle::Ctx;
use super::state::{WebSocketConnectionRecord, WebSocketConnectionState};

pub fn is_websocket_upgrade_request(headers: &HashMap<String, String>) -> bool {
    let upgrade = header_value(headers, "upgrade").map(|value| value.to_ascii_lowercase());
    let connection = header_value(headers, "connection").map(|value| value.to_ascii_lowercase());

    matches!(upgrade.as_deref(), Some("websocket"))
        || connection
            .as_deref()
            .map(has_upgrade_token)
            .unwrap_or(false)
        || headers
            .keys()
            .any(|name| name.eq_ignore_ascii_case("sec-websocket-key"))
}

pub fn is_successful_websocket_handshake(ctx: &Ctx) -> bool {
    ctx.res_status_code == 101 && is_websocket_upgrade_request(&ctx.req_headers)
}

pub fn save_and_emit_connection(ctx: &Ctx, app_handle: &tauri::AppHandle) {
    eprintln!(
        "[websocket] save_and_emit_connection called txn_id={} status={} has_ws_headers={}",
        ctx.transaction_id,
        ctx.res_status_code,
        is_websocket_upgrade_request(&ctx.req_headers)
    );

    let Some(websocket_record) = build_connection_record(ctx) else {
        eprintln!(
            "[websocket] build_connection_record returned None txn_id={}",
            ctx.transaction_id
        );
        return;
    };

    if let Some(history) = app_handle.try_state::<crate::HistoryBridge>() {
        if let Err(e) = history.insert_websocket_connection(&websocket_record) {
            println!(
                "[websocket] failed to insert websocket handshake to DB: {}",
                e
            );
        } else {
            println!(
                "[websocket] saved websocket handshake to DB txn_id={}",
                ctx.transaction_id
            );
        }
    }

    if let Err(e) = app_handle.emit("websocket-connection", &websocket_record) {
        println!("[websocket] failed to emit websocket event: {}", e);
    }
}

pub fn build_connection_record(ctx: &Ctx) -> Option<WebSocketConnectionRecord> {
    if !is_websocket_upgrade_request(&ctx.req_headers) {
        return None;
    }

    let now = chrono::Utc::now();
    let (host, path, url) = parse_websocket_target(&ctx.req_uri, &ctx.req_headers);
    let state = if ctx.res_status_code == 101 {
        WebSocketConnectionState::Open
    } else {
        WebSocketConnectionState::Error
    };

    Some(WebSocketConnectionRecord {
        id: ctx.transaction_id,
        timestamp: now,
        url,
        host,
        path,
        handshake_request_headers: ctx.req_headers.clone(),
        handshake_response_status: Some(ctx.res_status_code),
        handshake_response_headers: ctx.res_headers.clone(),
        client_addr: ctx.client_addr.clone(),
        server_addr: ctx.server_addr.clone(),
        state,
        message_count: 0,
        last_activity_at: now,
    })
}

pub fn parse_websocket_target(
    req_uri: &str,
    headers: &HashMap<String, String>,
) -> (String, String, String) {
    if let Ok(parsed) = Url::parse(req_uri) {
        let host = parsed.host_str().unwrap_or_default().to_string();
        let mut path = parsed.path().to_string();
        if let Some(query) = parsed.query() {
            path.push('?');
            path.push_str(query);
        }
        return (host, path, parsed.to_string());
    }

    let host = header_value(headers, "host").cloned().unwrap_or_default();
    let path = if req_uri.is_empty() {
        "/".to_string()
    } else {
        req_uri.to_string()
    };
    let scheme = if header_value(headers, "x-forwarded-proto")
        .map(|value| value.eq_ignore_ascii_case("https"))
        .unwrap_or(false)
    {
        "wss"
    } else {
        "ws"
    };
    let url = if host.is_empty() {
        path.clone()
    } else {
        format!("{scheme}://{host}{path}")
    };

    (host, path, url)
}

fn header_value<'a>(headers: &'a HashMap<String, String>, name: &str) -> Option<&'a String> {
    headers
        .iter()
        .find(|(header_name, _)| header_name.eq_ignore_ascii_case(name))
        .map(|(_, value)| value)
}

fn has_upgrade_token(value: &str) -> bool {
    value
        .split(',')
        .any(|token| token.trim().eq_ignore_ascii_case("upgrade"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_websocket_upgrade_with_connection_token_list() {
        let mut headers = HashMap::new();
        headers.insert("Connection".to_string(), "keep-alive, Upgrade".to_string());
        headers.insert("Upgrade".to_string(), "websocket".to_string());

        assert!(is_websocket_upgrade_request(&headers));
    }

    #[test]
    fn parses_relative_websocket_target_from_host_header() {
        let mut headers = HashMap::new();
        headers.insert("Host".to_string(), "example.test".to_string());

        let (host, path, url) = parse_websocket_target("/socket?room=1", &headers);

        assert_eq!(host, "example.test");
        assert_eq!(path, "/socket?room=1");
        assert_eq!(url, "ws://example.test/socket?room=1");
    }

    #[test]
    fn parses_absolute_websocket_target() {
        let headers = HashMap::new();

        let (host, path, url) = parse_websocket_target("wss://example.test/ws?q=1", &headers);

        assert_eq!(host, "example.test");
        assert_eq!(path, "/ws?q=1");
        assert_eq!(url, "wss://example.test/ws?q=1");
    }
}
