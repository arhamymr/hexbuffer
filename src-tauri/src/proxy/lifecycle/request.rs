use std::sync::Mutex;
use std::time::Duration;

use pingora_http::RequestHeader;
use pingora_proxy::Session;
use tauri::{AppHandle, Manager};

use super::super::intercept;
use super::super::state::{self, InterceptMode, PausedRequest, ProxyState};
use super::Ctx;

pub async fn handle_request_filter(
    _session: &mut Session,
    upstream_request: &mut RequestHeader,
    ctx: &mut Ctx,
    app_handle: &AppHandle,
) {
    println!("[request_filter] start txn_id={}", ctx.transaction_id);
    intercept::on_request(upstream_request);

    if intercept::should_bypass(&ctx.req_uri) {
        println!("[request_filter] bypassed txn_id={}", ctx.transaction_id);
        return;
    }

    let state = app_handle.state::<Mutex<ProxyState>>();
    let mode = state.lock().unwrap().get_mode();
    if mode != InterceptMode::Enabled {
        println!("[request_filter] disabled txn_id={} mode={mode:?}", ctx.transaction_id);
        return;
    }

    let paused_id = ctx.transaction_id;
    ctx.paused_id = Some(paused_id);

    let paused_req = PausedRequest {
        id: paused_id,
        timestamp: chrono::Utc::now(),
        client_addr: ctx.client_addr.clone(),
        server_addr: ctx.server_addr.clone(),
        request: state::ProxyRequest {
            method: ctx.req_method.clone(),
            uri: ctx.req_uri.clone(),
            http_version: ctx.req_http_version.clone(),
            headers: ctx.req_headers.clone(),
            body: ctx.req_body.clone(),
        },
        response: None,
    };

    state.lock().unwrap().add_paused_request(paused_req);

    loop {
        tokio::time::sleep(Duration::from_millis(100)).await;
        if state.lock().unwrap().get_paused_request(&paused_id).is_none() {
            break;
        }
    }

    println!("[request_filter] end txn_id={}", ctx.transaction_id);
}