use std::sync::Mutex;

use bytes::Bytes;
use tauri::{Emitter, Manager};

use super::super::logger;
use super::super::state::ProxyRecord;
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
    eprintln!("[completion] save_and_emit called for txn_id={}", ctx.transaction_id);
    eprintln!("[completion] Request: {} {} (body: {} bytes)", ctx.req_method, ctx.req_uri, ctx.req_body.len());
    eprintln!("[completion] Response: {} {} (body: {} bytes)", ctx.res_status_code, ctx.res_status_text, ctx.res_body.len());
    eprintln!("[completion] Server addr: {}", ctx.server_addr);
    
    let txn = build_record(ctx);

    if let Some(db) = app_handle.try_state::<Mutex<crate::Database>>() {
        if let Err(e) = db.lock().unwrap().insert_log(&txn) {
            println!("[completion] failed to insert to DB: {}", e);
        } else {
            println!("[completion] saved to DB txn_id={}", ctx.transaction_id);
        }
    }

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
        let is_gzip = ctx.res_headers.iter()
            .any(|(k, v)| k.to_lowercase() == "content-encoding" && v.to_lowercase() == "gzip");

        if is_gzip {
            use flate2::read::GzDecoder;
            use std::io::Read;
            let mut decoder = GzDecoder::new(&ctx.res_body[..]);
            let mut decoded = Vec::new();
            if decoder.read_to_end(&mut decoded).is_ok() {
                ctx.res_body = decoded;
                println!("[completion] gzip decoded body for txn_id={}", ctx.transaction_id);
            } else {
                eprintln!("[completion] ERROR gzip decode failed for txn_id={}", ctx.transaction_id);
            }
        }

        println!("[completion] end txn_id={} status={}", ctx.transaction_id, ctx.res_status_code);
        println!("[completion] request_complete txn_id={}", ctx.transaction_id);

        *body = Some(Bytes::copy_from_slice(&ctx.res_body));
    }
}