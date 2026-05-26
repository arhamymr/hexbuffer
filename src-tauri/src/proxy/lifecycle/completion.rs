use bytes::Bytes;
use tauri::{Emitter, Manager};
use url::Url;

use super::super::logger;
use super::super::state::{ProxyRecord, WebSocketConnectionRecord, WebSocketConnectionState};
use super::Ctx;

pub fn build_record(ctx: &Ctx) -> ProxyRecord {
    ProxyRecord {
        id: ctx.transaction_id,
        timestamp: chrono::Utc::now(),
        client_addr: ctx.client_addr.clone(),
        server_addr: ctx.server_addr.clone(),
        request: super::super::state::ProxyRequest {
            method: ctx.req_method.clone(),
            uri: ctx.req_uri.clone(),
            http_version: ctx.req_http_version.clone(),
            headers: ctx.req_headers.clone(),
            body: ctx.req_body.clone(),
        },
        response: Some(super::super::state::ProxyResponse {
            status_code: ctx.res_status_code,
            status_text: ctx.res_status_text.clone(),
            http_version: ctx.res_http_version.clone(),
            headers: ctx.res_headers.clone(),
            body: ctx.res_body.clone(),
        }),
    }
}

pub fn save_and_emit(ctx: &Ctx, app_handle: &tauri::AppHandle) {
    eprintln!(
        "[completion] save_and_emit called for txn_id={}",
        ctx.transaction_id
    );
    eprintln!(
        "[completion] Request: {} {} (body: {} bytes)",
        ctx.req_method,
        ctx.req_uri,
        ctx.req_body.len()
    );
    eprintln!(
        "[completion] Response: {} {} (body: {} bytes)",
        ctx.res_status_code,
        ctx.res_status_text,
        ctx.res_body.len()
    );
    eprintln!("[completion] Server addr: {}", ctx.server_addr);

    let txn = build_record(ctx);

    if let Some(history) = app_handle.try_state::<crate::HistoryBridge>() {
        if let Err(e) = history.insert_record(&txn) {
            println!("[completion] failed to insert to DB: {}", e);
        } else {
            println!("[completion] saved to DB txn_id={}", ctx.transaction_id);
        }

        if let Some(websocket_record) = build_websocket_connection_record(ctx) {
            if let Err(e) = history.insert_websocket_connection(&websocket_record) {
                println!(
                    "[completion] failed to insert websocket handshake to DB: {}",
                    e
                );
            } else {
                println!(
                    "[completion] saved websocket handshake to DB txn_id={}",
                    ctx.transaction_id
                );
            }

            if let Err(e) = app_handle.emit("websocket-connection", &websocket_record) {
                println!("[completion] failed to emit websocket event: {}", e);
            }
        }
    }

    if let Err(e) = app_handle.emit("proxy-record", &txn) {
        println!("[completion] failed to emit event: {}", e);
    } else {
        println!(
            "[completion] event emitted successfully for txn_id={}",
            ctx.transaction_id
        );
    }

    logger::log_request_body(&txn);
}

fn build_websocket_connection_record(ctx: &Ctx) -> Option<WebSocketConnectionRecord> {
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

fn is_websocket_upgrade_request(headers: &std::collections::HashMap<String, String>) -> bool {
    let upgrade = headers
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case("upgrade"))
        .map(|(_, value)| value.to_ascii_lowercase());
    let connection = headers
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case("connection"))
        .map(|(_, value)| value.to_ascii_lowercase());

    matches!(upgrade.as_deref(), Some("websocket"))
        || connection
            .as_deref()
            .map(|value| value.contains("upgrade"))
            .unwrap_or(false)
        || headers
            .keys()
            .any(|name| name.eq_ignore_ascii_case("sec-websocket-key"))
}

fn parse_websocket_target(
    req_uri: &str,
    headers: &std::collections::HashMap<String, String>,
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

    let host = headers
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case("host"))
        .map(|(_, value)| value.clone())
        .unwrap_or_default();
    let path = if req_uri.is_empty() {
        "/".to_string()
    } else {
        req_uri.to_string()
    };
    let scheme = if headers
        .iter()
        .any(|(name, value)| name.eq_ignore_ascii_case("x-forwarded-proto") && value == "https")
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

pub fn handle_response_body(
    body: &mut Option<Bytes>,
    end_of_stream: bool,
    ctx: &mut Ctx,
    _app_handle: &tauri::AppHandle,
) {
    if let Some(b) = body {
        ctx.res_body.extend_from_slice(b);
    }

    if end_of_stream {
        if let Some((_, encoding)) = ctx
            .res_headers
            .iter()
            .find(|(k, _)| k.to_lowercase() == "content-encoding")
        {
            let encoding_lower = encoding.to_lowercase();
            match encoding_lower.as_str() {
                "gzip" => {
                    use flate2::read::GzDecoder;
                    use std::io::Read;
                    let mut decoder = GzDecoder::new(&ctx.res_body[..]);
                    let mut decoded = Vec::new();
                    if decoder.read_to_end(&mut decoded).is_ok() {
                        ctx.res_body = decoded;
                        println!(
                            "[completion] gzip decoded body for txn_id={}",
                            ctx.transaction_id
                        );
                    } else {
                        eprintln!(
                            "[completion] ERROR gzip decode failed for txn_id={}",
                            ctx.transaction_id
                        );
                    }
                }
                "br" => {
                    use brotli::Decompressor;
                    use std::io::Read;
                    let mut decompressor = Decompressor::new(&ctx.res_body[..], 4096);
                    let mut decoded = Vec::new();
                    if decompressor.read_to_end(&mut decoded).is_ok() {
                        ctx.res_body = decoded;
                        println!(
                            "[completion] brotli decoded body for txn_id={}",
                            ctx.transaction_id
                        );
                    } else {
                        eprintln!(
                            "[completion] ERROR brotli decode failed for txn_id={}",
                            ctx.transaction_id
                        );
                    }
                }
                "deflate" => {
                    use flate2::read::DeflateDecoder;
                    use std::io::Read;
                    let mut decoder = DeflateDecoder::new(&ctx.res_body[..]);
                    let mut decoded = Vec::new();
                    if decoder.read_to_end(&mut decoded).is_ok() {
                        ctx.res_body = decoded;
                        println!(
                            "[completion] deflate decoded body for txn_id={}",
                            ctx.transaction_id
                        );
                    } else {
                        eprintln!(
                            "[completion] ERROR deflate decode failed for txn_id={}",
                            ctx.transaction_id
                        );
                    }
                }
                _ => {
                    println!(
                        "[completion] Unknown content-encoding '{}' for txn_id={}",
                        encoding_lower, ctx.transaction_id
                    );
                }
            }
        }

        println!(
            "[completion] end txn_id={} status={}",
            ctx.transaction_id, ctx.res_status_code
        );
        println!(
            "[completion] request_complete txn_id={}",
            ctx.transaction_id
        );

        // Keep decoded bytes in the captured context for history, but do not
        // replace the live response chunk. The browser still receives the
        // original encoded bytes that match the upstream Content-Encoding.
    }
}
