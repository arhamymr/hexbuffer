use std::sync::Mutex;

use bytes::Bytes;
use tauri::{Emitter, Manager};

use crate::logger;
use crate::state::{ProxyRecord, ProxyState};
use super::Ctx;

pub fn build_record(ctx: &Ctx) -> ProxyRecord {
    ProxyRecord {
        id: ctx.transaction_id,
        timestamp: chrono::Utc::now(),
        client_addr: ctx.client_addr.clone(),
        server_addr: ctx.server_addr.clone(),
        request: crate::state::ProxyRequest {
            method: ctx.req_method.clone(),
            uri: ctx.req_uri.clone(),
            http_version: ctx.req_http_version.clone(),
            headers: ctx.req_headers.clone(),
            body: ctx.req_body.clone(),
        },
        response: Some(crate::state::ProxyResponse {
            status_code: ctx.res_status_code,
            status_text: ctx.res_status_text.clone(),
            http_version: ctx.res_http_version.clone(),
            headers: ctx.res_headers.clone(),
            body: ctx.res_body.clone(),
        }),
    }
}

pub fn save_and_emit(ctx: &Ctx, app_handle: &tauri::AppHandle) {
    let txn = build_record(ctx);
    app_handle.state::<Mutex<ProxyState>>().lock().unwrap().add_record(txn.clone());

    if let Err(e) = app_handle.emit("proxy-record", &txn) {
        println!("[completion] failed to emit event: {}", e);
    } else {
        println!("[completion] event emitted successfully for txn_id={}", ctx.transaction_id);
    }

    logger::log_request_body(&txn);
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
        println!("[completion] end txn_id={} status={}", ctx.transaction_id, ctx.res_status_code);
        println!("[completion] request_complete txn_id={}", ctx.transaction_id);

        *body = Some(Bytes::copy_from_slice(&ctx.res_body));
    }
}