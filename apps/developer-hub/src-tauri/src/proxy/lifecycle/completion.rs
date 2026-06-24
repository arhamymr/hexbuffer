use bytes::Bytes;
use tauri::{Emitter, Manager};

use super::super::state::ProxyRecord;
use super::super::websocket;
use super::body_decoder::decode_http_body;
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
            content_decoded: ctx.req_content_decoded,
        },
        response: Some(super::super::state::ProxyResponse {
            status_code: ctx.res_status_code,
            status_text: ctx.res_status_text.clone(),
            http_version: ctx.res_http_version.clone(),
            headers: ctx.res_headers.clone(),
            body: ctx.res_body.clone(),
            content_decoded: ctx.res_content_decoded,
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
    }

    websocket::save_and_emit_connection(ctx, app_handle);

    crate::automation::ingest_proxy_record(app_handle, &txn);

    if let Err(e) = app_handle.emit("proxy-record", &txn) {
        println!("[completion] failed to emit event: {}", e);
    } else {
        println!(
            "[completion] event emitted successfully for txn_id={}",
            ctx.transaction_id
        );
    }
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
        let decoded = decode_http_body(&ctx.res_headers, &ctx.res_body);
        if decoded.metadata.content_decoded {
            println!(
                "[completion] decoded response body for txn_id={} encoding={:?}",
                ctx.transaction_id, decoded.metadata.content_encoding
            );
        }
        for error in decoded.metadata.errors.iter() {
            eprintln!(
                "[completion] ERROR body decode issue for txn_id={}: {}",
                ctx.transaction_id, error
            );
        }
        ctx.res_body = decoded.decoded_body;

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
