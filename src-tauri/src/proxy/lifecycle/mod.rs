pub mod body_decoder;
pub mod completion;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use hudsucker::tokio_tungstenite::tungstenite::Message;
use hudsucker::{Body, HttpContext, HttpHandler, WebSocketContext, WebSocketHandler};
use hyper::{header::HeaderName, header::HeaderValue, Method, Request, Response, StatusCode, Uri};
use tauri::{AppHandle, Emitter, Manager};

use crate::proxy::state::{
    WebSocketMessageDirection, WebSocketMessageRecord, WebSocketMessageType,
};
use crate::proxy::websocket;

pub use completion::save_and_emit;

#[derive(Clone)]
pub struct Ctx {
    pub transaction_id: uuid::Uuid,
    pub client_addr: String,
    pub server_addr: String,
    pub req_method: String,
    pub req_uri: String,
    pub req_http_version: String,
    pub req_headers: std::collections::HashMap<String, String>,
    pub req_body: Vec<u8>,
    pub res_status_code: u16,
    pub res_status_text: String,
    pub res_http_version: String,
    pub res_headers: std::collections::HashMap<String, String>,
    pub res_body: Vec<u8>,
    pub req_content_decoded: bool,
    pub res_content_decoded: bool,
    pub paused_id: Option<uuid::Uuid>,
    pub app_handle: AppHandle,
    pub response_recorded: bool,
    pub is_mitm_loopback: bool,
    pub sni_override: Option<String>,
    pub intercept_response: bool,
    pub intercept_tab_id: Option<String>,
}

impl Ctx {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            transaction_id: uuid::Uuid::new_v4(),
            client_addr: String::new(),
            server_addr: String::new(),
            req_method: String::new(),
            req_uri: String::new(),
            req_http_version: String::new(),
            req_headers: std::collections::HashMap::new(),
            req_body: Vec::new(),
            res_status_code: 0,
            res_status_text: String::new(),
            res_http_version: String::new(),
            res_headers: std::collections::HashMap::new(),
            res_body: Vec::new(),
            req_content_decoded: false,
            res_content_decoded: false,
            paused_id: None,
            app_handle,
            response_recorded: false,
            is_mitm_loopback: false,
            sni_override: None,
            intercept_response: false,
            intercept_tab_id: None,
        }
    }
}

#[derive(Clone)]
pub struct AppHandler {
    app_handle: AppHandle,
    ctx: Option<Ctx>,
    ws_connections: Arc<Mutex<HashMap<String, uuid::Uuid>>>,
}

impl AppHandler {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            ctx: None,
            ws_connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

fn remove_header_case_insensitive(headers: &mut HashMap<String, String>, name: &str) {
    if let Some(key) = headers
        .keys()
        .find(|key| key.eq_ignore_ascii_case(name))
        .cloned()
    {
        headers.remove(&key);
    }
}

fn normalize_decoded_body_headers(
    headers: &mut HashMap<String, String>,
    body_len: usize,
    content_decoded: bool,
    was_chunked: bool,
) {
    if content_decoded {
        remove_header_case_insensitive(headers, "content-encoding");
    }

    if content_decoded || was_chunked {
        remove_header_case_insensitive(headers, "transfer-encoding");
        remove_header_case_insensitive(headers, "content-length");
        headers.insert("content-length".to_string(), body_len.to_string());
    }
}

impl HttpHandler for AppHandler {
    async fn handle_request(
        &mut self,
        http_ctx: &HttpContext,
        req: Request<Body>,
    ) -> hudsucker::RequestOrResponse {
        use crate::proxy::state::{InterceptMode, PausedRequest, ProxyState};

        let mut ctx = Ctx::new(self.app_handle.clone());

        ctx.client_addr = http_ctx.client_addr.to_string();
        ctx.server_addr = req.uri().to_string();
        ctx.req_method = req.method().to_string();
        ctx.req_uri = req.uri().to_string();
        ctx.req_http_version = format!("{:?}", req.version());

        for (name, value) in req.headers().iter() {
            if let Ok(v) = value.to_str() {
                ctx.req_headers
                    .insert(name.as_str().to_string(), v.to_string());
            }
        }

        if websocket::is_websocket_upgrade_request(&ctx.req_headers) {
            eprintln!(
                "[lifecycle] WS upgrade request detected txn_id={} uri={}",
                ctx.transaction_id, ctx.req_uri
            );
            if let Some(record) = websocket::build_connection_record(&ctx) {
                if let Some(history) = self.app_handle.try_state::<crate::HistoryBridge>() {
                    if let Err(e) = history.insert_websocket_connection(&record) {
                        eprintln!(
                            "[lifecycle] failed to insert WS connection from request: {}",
                            e
                        );
                    } else {
                        eprintln!(
                            "[lifecycle] saved WS connection from request txn_id={}",
                            ctx.transaction_id
                        );
                    }
                }
                if let Err(e) = self.app_handle.emit("websocket-connection", &record) {
                    eprintln!("[lifecycle] failed to emit WS connection event: {}", e);
                }
                let (host, path, _) =
                    websocket::parse_websocket_target(&ctx.req_uri, &ctx.req_headers);
                let key = format!("{}|{}|{}", ctx.client_addr, host, path);
                self.ws_connections
                    .lock()
                    .unwrap()
                    .insert(key, ctx.transaction_id);
            }
        }

        let (mut parts, body) = req.into_parts();
        let body_bytes = match http_body_util::BodyExt::collect(body).await {
            Ok(collected) => collected.to_bytes(),
            Err(e) => {
                eprintln!("[lifecycle] Failed to read request body: {}", e);
                return hudsucker::RequestOrResponse::Request(Request::from_parts(
                    parts,
                    Body::empty(),
                ));
            }
        };
        ctx.req_body = body_bytes.to_vec();

        if !ctx.req_body.is_empty() {
            let decoded = body_decoder::decode_http_body(&ctx.req_headers, &ctx.req_body);
            if decoded.metadata.content_decoded {
                eprintln!(
                    "[lifecycle] decoded request body for txn_id={} encoding={:?}",
                    ctx.transaction_id, decoded.metadata.content_encoding
                );
            }
            for error in decoded.metadata.errors.iter() {
                eprintln!(
                    "[lifecycle] ERROR request body decode issue for txn_id={}: {}",
                    ctx.transaction_id, error
                );
            }
            ctx.req_content_decoded = decoded.metadata.content_decoded;
            ctx.req_body = decoded.decoded_body;
        }

        let mut body_modified = false;

        // ponytail: MockForge domain proxy interception
        if let Some(mock_state) = self.app_handle.try_state::<crate::commands::mock_forge::MockForgeState>() {
            // Extract path and query
            let uri_parsed = url::Url::parse(&ctx.req_uri).ok();
            let host_str = uri_parsed.as_ref().and_then(|u| u.host_str()).unwrap_or("");
            let path_str = uri_parsed.as_ref().map(|u| u.path()).unwrap_or("/");
            
            let query_map: HashMap<String, String> = uri_parsed
                .as_ref()
                .map(|u| u.query_pairs().into_owned().collect())
                .unwrap_or_default();
                
            let (matched, matching_domain) = {
                let domains_guard = mock_state.domains.lock().unwrap();
                let routes_guard = mock_state.routes.lock().unwrap();
                
                let matched = crate::commands::mock_forge::find_matching_route(
                    &domains_guard,
                    &routes_guard,
                    host_str,
                    &ctx.req_method,
                    path_str,
                    &ctx.req_headers,
                    &query_map,
                    &ctx.req_body,
                    false, // is_local_server = false
                );
                
                let matching_domain = if matched.is_none() {
                    domains_guard.iter().find(|d| {
                        d.status == "active" && d.hostname == host_str
                    }).cloned()
                } else {
                    None
                };
                
                (matched, matching_domain)
            };
            
            if let Some((domain, route)) = matched {
                let start_time = std::time::Instant::now();
                let mut latency_ms = 0;
                let mut status_code = route.status_code;

                use rand::Rng;

                if route.chaos.latency_mode == "fixed" {
                    if let Some(fixed) = route.chaos.latency_fixed {
                        latency_ms = fixed;
                        tokio::time::sleep(Duration::from_millis(fixed)).await;
                    }
                } else if route.chaos.latency_mode == "random" {
                    if let (Some(min), Some(max)) = (route.chaos.latency_min, route.chaos.latency_max) {
                        if max >= min {
                            let rand_val = rand::thread_rng().gen_range(min..=max);
                            latency_ms = rand_val;
                            tokio::time::sleep(Duration::from_millis(rand_val)).await;
                        }
                    }
                }

                if let Some(err_rate) = route.chaos.error_rate {
                    if err_rate > 0.0 {
                        let roll = rand::thread_rng().gen_range(0.0..100.0);
                        if roll < err_rate {
                            if let Some(err_status) = route.chaos.error_status {
                                status_code = err_status;
                            } else {
                                status_code = 500;
                            }
                        }
                    }
                }
                
                let log_entry = crate::commands::mock_forge::RequestLog {
                    id: format!("l{}", uuid::Uuid::new_v4()),
                    domain_id: domain.id.clone(),
                    route_id: Some(route.id.clone()),
                    method: ctx.req_method.clone(),
                    path: path_str.to_string(),
                    status_code,
                    latency_ms: if latency_ms == 0 { start_time.elapsed().as_millis() as u64 } else { latency_ms },
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    request_headers: ctx.req_headers.clone(),
                    request_body: if ctx.req_body.is_empty() { None } else { Some(String::from_utf8_lossy(&ctx.req_body).into_owned()) },
                };
                
                {
                    let mut logs_lock = mock_state.logs.lock().unwrap();
                    logs_lock.insert(0, log_entry.clone());
                    if logs_lock.len() > 200 {
                        logs_lock.truncate(200);
                    }
                }
                
                let _ = self.app_handle.emit("mock-forge-log", log_entry);
                
                let mut builder = Response::builder().status(status_code);
                for (k, v) in &route.response_headers {
                    if let (Ok(name), Ok(val)) = (HeaderName::from_bytes(k.as_bytes()), HeaderValue::from_str(v)) {
                        builder = builder.header(name, val);
                    }
                }
                
                let body_content = if status_code == route.status_code {
                    route.response_body.clone()
                } else {
                    format!("Simulated chaos error status: {}", status_code)
                };
                
                return hudsucker::RequestOrResponse::Response(
                    builder.body(Body::from(body_content)).unwrap()
                );
            } else if let Some(domain) = matching_domain {
                let log_entry = crate::commands::mock_forge::RequestLog {
                    id: format!("l{}", uuid::Uuid::new_v4()),
                    domain_id: domain.id.clone(),
                    route_id: None,
                    method: ctx.req_method.clone(),
                    path: path_str.to_string(),
                    status_code: 404,
                    latency_ms: 0,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    request_headers: ctx.req_headers.clone(),
                    request_body: if ctx.req_body.is_empty() { None } else { Some(String::from_utf8_lossy(&ctx.req_body).into_owned()) },
                };
                
                {
                    let mut logs_lock = mock_state.logs.lock().unwrap();
                    logs_lock.insert(0, log_entry.clone());
                    if logs_lock.len() > 200 {
                        logs_lock.truncate(200);
                    }
                }
                let _ = self.app_handle.emit("mock-forge-log", log_entry);
                
                return hudsucker::RequestOrResponse::Response(
                    Response::builder()
                        .status(StatusCode::NOT_FOUND)
                        .body(Body::from("404 Not Found (MockForge)"))
                        .unwrap()
                );
            }
        }

        let proxy_state_handle = self.app_handle.state::<Mutex<ProxyState>>();
        let should_bypass_uri = proxy_state_handle
            .lock()
            .unwrap()
            .should_bypass_uri(&ctx.req_uri);

        if ctx.req_method != "CONNECT" && !should_bypass_uri {
            let mode = proxy_state_handle.lock().unwrap().get_mode();

            if mode == InterceptMode::Enabled {
                let intercept_tab_id = proxy_state_handle
                    .lock()
                    .unwrap()
                    .matching_intercept_tab_id(&ctx.req_uri);

                if intercept_tab_id.is_none() {
                    self.ctx = Some(ctx);
                    let mut req = Request::from_parts(parts, Body::from(body_bytes.to_vec()));
                    req.headers_mut().insert("x-rusxy", "1".parse().unwrap());
                    return hudsucker::RequestOrResponse::Request(req);
                }

                let paused_id = ctx.transaction_id;
                ctx.paused_id = Some(paused_id);
                ctx.intercept_tab_id = intercept_tab_id.clone();

                let paused_req = PausedRequest {
                    id: paused_id,
                    timestamp: chrono::Utc::now(),
                    client_addr: ctx.client_addr.clone(),
                    server_addr: ctx.server_addr.clone(),
                    tab_id: intercept_tab_id,
                    request: crate::proxy::state::ProxyRequest {
                        method: ctx.req_method.clone(),
                        uri: ctx.req_uri.clone(),
                        http_version: ctx.req_http_version.clone(),
                        headers: ctx.req_headers.clone(),
                        body: ctx.req_body.clone(),
                        content_decoded: ctx.req_content_decoded,
                    },
                    response: None,
                };

                proxy_state_handle
                    .lock()
                    .unwrap()
                    .add_paused_request(paused_req.clone());
                crate::automation::ingest_intercept_paused_request(&self.app_handle, &paused_req);

                loop {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                    if proxy_state_handle
                        .lock()
                        .unwrap()
                        .get_paused_request(&paused_id)
                        .is_none()
                    {
                        break;
                    }
                }

                let action = proxy_state_handle
                    .lock()
                    .unwrap()
                    .take_paused_action(&paused_id);

                match action {
                    Some(crate::proxy::state::InterceptAction::Drop) => {
                        return hudsucker::RequestOrResponse::Response(
                            Response::builder()
                                .status(502)
                                .body(Body::from("Dropped by intercept"))
                                .unwrap_or_else(|_| Response::new(Body::empty())),
                        );
                    }
                    Some(crate::proxy::state::InterceptAction::Forward {
                        request: Some(modified),
                        intercept_response,
                    }) => {
                        ctx.intercept_response = intercept_response;

                        if let Ok(method) = modified.method.parse::<Method>() {
                            ctx.req_method = method.to_string();
                            parts.method = method;
                        }

                        if let Ok(uri) = modified.uri.parse::<Uri>() {
                            ctx.req_uri = uri.to_string();
                            ctx.server_addr = uri.to_string();
                            parts.uri = uri;
                        }

                        parts.headers.clear();
                        ctx.req_headers = modified.headers.clone();
                        for (name, value) in modified.headers.iter() {
                            let Ok(header_name) = HeaderName::from_bytes(name.as_bytes()) else {
                                continue;
                            };
                            let Ok(header_value) = HeaderValue::from_str(value) else {
                                continue;
                            };
                            parts.headers.insert(header_name, header_value);
                        }

                        ctx.req_body = modified.body;
                        body_modified = true;
                    }
                    Some(crate::proxy::state::InterceptAction::Forward {
                        request: None,
                        intercept_response,
                    }) => {
                        ctx.intercept_response = intercept_response;
                    }
                    _ => {}
                }
            }
        }

        self.ctx = Some(ctx);

        let request_body = if body_modified {
            self.ctx.as_ref().unwrap().req_body.clone()
        } else {
            body_bytes.to_vec()
        };
        let mut req = Request::from_parts(parts, Body::from(request_body));
        req.headers_mut().insert("x-rusxy", "1".parse().unwrap());

        hudsucker::RequestOrResponse::Request(req)
    }

    async fn handle_response(
        &mut self,
        _http_ctx: &HttpContext,
        res: Response<Body>,
    ) -> Response<Body> {
        let mut ctx = match self.ctx.take() {
            Some(c) => c,
            None => {
                eprintln!("[lifecycle] ERROR: No ctx found in handle_response");
                return res;
            }
        };

        ctx.res_status_code = res.status().as_u16();
        ctx.res_status_text = res
            .status()
            .canonical_reason()
            .unwrap_or("Unknown")
            .to_string();
        ctx.res_http_version = format!("{:?}", res.version());

        for (name, value) in res.headers().iter() {
            if let Ok(v) = value.to_str() {
                ctx.res_headers
                    .insert(name.as_str().to_string(), v.to_string());
            }
        }

        let (mut parts, body) = res.into_parts();

        let is_ws_handshake = crate::proxy::websocket::is_successful_websocket_handshake(&ctx);
        eprintln!(
            "[lifecycle] handle_response txn_id={} status={} is_ws_handshake={} ws_upgrade_req_headers={}",
            ctx.transaction_id,
            ctx.res_status_code,
            is_ws_handshake,
            websocket::is_websocket_upgrade_request(&ctx.req_headers)
        );

        if is_ws_handshake {
            eprintln!(
                "[lifecycle] WS handshake confirmed in handle_response txn_id={}",
                ctx.transaction_id
            );
            save_and_emit(&ctx, &self.app_handle);
            return Response::from_parts(parts, body);
        }

        let body_bytes = match http_body_util::BodyExt::collect(body).await {
            Ok(collected) => collected.to_bytes(),
            Err(e) => {
                eprintln!("[lifecycle] Failed to read response body: {}", e);
                return Response::from_parts(parts, Body::empty());
            }
        };
        ctx.res_body = body_bytes.to_vec();

        let decoded = body_decoder::decode_http_body(&ctx.res_headers, &ctx.res_body);
        if decoded.metadata.content_decoded {
            eprintln!(
                "[lifecycle] decoded body for txn_id={} encoding={:?}",
                ctx.transaction_id, decoded.metadata.content_encoding
            );
        }
        for error in decoded.metadata.errors.iter() {
            eprintln!(
                "[lifecycle] ERROR body decode issue for txn_id={}: {}",
                ctx.transaction_id, error
            );
        }
        ctx.res_content_decoded = decoded.metadata.content_decoded;
        ctx.res_body = decoded.decoded_body;
        normalize_decoded_body_headers(
            &mut ctx.res_headers,
            ctx.res_body.len(),
            ctx.res_content_decoded,
            decoded.metadata.was_chunked,
        );

        let mut response_body = body_bytes.to_vec();

        if ctx.req_method != "CONNECT" {
            let proxy_state_handle = self.app_handle.state::<Mutex<crate::proxy::ProxyState>>();
            let should_bypass_uri = proxy_state_handle
                .lock()
                .unwrap()
                .should_bypass_uri(&ctx.req_uri);
            let mode = proxy_state_handle.lock().unwrap().get_mode();

            if ctx.intercept_response
                && mode == crate::proxy::state::InterceptMode::Enabled
                && !should_bypass_uri
                && ctx.intercept_tab_id.is_some()
            {
                let paused_id = ctx.transaction_id;
                ctx.paused_id = Some(paused_id);

                let paused_req = crate::proxy::state::PausedRequest {
                    id: paused_id,
                    timestamp: chrono::Utc::now(),
                    client_addr: ctx.client_addr.clone(),
                    server_addr: ctx.server_addr.clone(),
                    tab_id: ctx.intercept_tab_id.clone(),
                    request: crate::proxy::state::ProxyRequest {
                        method: ctx.req_method.clone(),
                        uri: ctx.req_uri.clone(),
                        http_version: ctx.req_http_version.clone(),
                        headers: ctx.req_headers.clone(),
                        body: ctx.req_body.clone(),
                        content_decoded: ctx.req_content_decoded,
                    },
                    response: Some(crate::proxy::state::ProxyResponse {
                        status_code: ctx.res_status_code,
                        status_text: ctx.res_status_text.clone(),
                        http_version: ctx.res_http_version.clone(),
                        headers: ctx.res_headers.clone(),
                        body: ctx.res_body.clone(),
                        content_decoded: ctx.res_content_decoded,
                    }),
                };

                proxy_state_handle
                    .lock()
                    .unwrap()
                    .add_paused_request(paused_req.clone());
                crate::automation::ingest_intercept_paused_request(&self.app_handle, &paused_req);

                loop {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                    if proxy_state_handle
                        .lock()
                        .unwrap()
                        .get_paused_request(&paused_id)
                        .is_none()
                    {
                        break;
                    }
                }

                let action = proxy_state_handle
                    .lock()
                    .unwrap()
                    .take_paused_action(&paused_id);

                match action {
                    Some(crate::proxy::state::InterceptAction::Drop) => {
                        return Response::builder()
                            .status(502)
                            .body(Body::from("Dropped by intercept"))
                            .unwrap_or_else(|_| Response::new(Body::empty()));
                    }
                    Some(crate::proxy::state::InterceptAction::ForwardResponse(Some(modified))) => {
                        if let Ok(status) = StatusCode::from_u16(modified.status_code) {
                            parts.status = status;
                            ctx.res_status_code = modified.status_code;
                            ctx.res_status_text = modified.status_text.clone();
                        }

                        parts.headers.clear();
                        ctx.res_headers = modified.headers.clone();
                        for (name, value) in modified.headers.iter() {
                            let Ok(header_name) = HeaderName::from_bytes(name.as_bytes()) else {
                                continue;
                            };
                            let Ok(header_value) = HeaderValue::from_str(value) else {
                                continue;
                            };
                            parts.headers.insert(header_name, header_value);
                        }

                        ctx.res_body = modified.body.clone();
                        ctx.res_content_decoded = false;
                        response_body = modified.body;
                    }
                    _ => {}
                }
            }
        }

        if ctx.req_method != "CONNECT" {
            save_and_emit(&ctx, &self.app_handle);
        }

        Response::from_parts(parts, Body::from(response_body))
    }
}

impl WebSocketHandler for AppHandler {
    async fn handle_message(&mut self, ctx: &WebSocketContext, msg: Message) -> Option<Message> {
        let (client_addr, uri, direction) = match ctx {
            WebSocketContext::ClientToServer { src, dst, .. } => (
                src.to_string(),
                dst.clone(),
                WebSocketMessageDirection::Inbound,
            ),
            WebSocketContext::ServerToClient { src, dst, .. } => (
                dst.to_string(),
                src.clone(),
                WebSocketMessageDirection::Outbound,
            ),
        };

        eprintln!(
            "[websocket] handle_message dir={:?} client={} uri={}",
            direction, client_addr, uri
        );

        let message_type = match &msg {
            Message::Text(_) => WebSocketMessageType::Text,
            Message::Binary(_) => WebSocketMessageType::Binary,
            Message::Ping(_) => WebSocketMessageType::Ping,
            Message::Pong(_) => WebSocketMessageType::Pong,
            Message::Close(_) => WebSocketMessageType::Close,
            Message::Frame(_) => WebSocketMessageType::Binary,
        };

        let payload = match &msg {
            Message::Text(text) => text.as_bytes().to_vec(),
            Message::Binary(data) => data.to_vec(),
            Message::Ping(data) | Message::Pong(data) => data.to_vec(),
            Message::Close(data) => {
                if let Some(frame) = data {
                    let reason = frame.reason.clone();
                    let code: u16 = frame.code.into();
                    let mut payload = vec![(code >> 8) as u8, (code & 0xFF) as u8];
                    payload.extend_from_slice(reason.as_bytes());
                    payload
                } else {
                    Vec::new()
                }
            }
            Message::Frame(data) => data.payload().to_vec(),
        };

        let uri_str = uri.to_string();
        let empty_headers = HashMap::new();
        let (host, path, url) = websocket::parse_websocket_target(&uri_str, &empty_headers);
        let key = format!("{}|{}|{}", client_addr, host, path);

        let connection_id = self.ws_connections.lock().unwrap().get(&key).copied();

        if let Some(connection_id) = connection_id {
            let now = chrono::Utc::now();
            let message_record = WebSocketMessageRecord {
                id: uuid::Uuid::new_v4(),
                connection_id,
                timestamp: now,
                direction,
                message_type: message_type.clone(),
                payload: payload.clone(),
                payload_size: payload.len(),
            };

            if let Some(history) = self.app_handle.try_state::<crate::HistoryBridge>() {
                if let Err(e) = history.insert_websocket_message(&message_record) {
                    eprintln!("[websocket] failed to save message: {}", e);
                }
            }

            if let Err(e) = self.app_handle.emit("websocket-message", &message_record) {
                eprintln!("[websocket] failed to emit message event: {}", e);
            }

            crate::automation::ingest_websocket_message(
                &self.app_handle,
                &message_record,
                &host,
                &path,
                &url,
            );

            if matches!(&msg, Message::Close(_)) {
                self.ws_connections.lock().unwrap().remove(&key);
                eprintln!("[websocket] connection closed conn_id={}", connection_id);
            }
        } else {
            eprintln!(
                "[websocket] no connection mapping found for key={} client={} uri={}",
                key, client_addr, uri_str
            );
        }

        println!("[websocket] message: {:?}", msg);
        Some(msg)
    }
}
