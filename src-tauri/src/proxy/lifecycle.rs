use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use hexbuffer_proxy::WebSocketMessage as Message;
use hexbuffer_proxy::{Body, HttpContext, HttpHandler, RequestOrResponse};
use hyper::{header::HeaderName, header::HeaderValue, Method, Request, Response, StatusCode, Uri};
use tauri::{AppHandle, Emitter, Manager};

use crate::proxy::completion::save_and_emit;
use crate::proxy::mock_forge;
use crate::proxy::state::{
    WebSocketMessageDirection, WebSocketMessageRecord, WebSocketMessageType,
};
use crate::proxy::websocket;

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
    pending_ctxs: Arc<Mutex<HashMap<u64, Ctx>>>,
    ws_connections: Arc<Mutex<HashMap<String, uuid::Uuid>>>,
}

impl AppHandler {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            pending_ctxs: Arc::new(Mutex::new(HashMap::new())),
            ws_connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[async_trait::async_trait]
impl HttpHandler for AppHandler {
    async fn should_intercept_tls(&self, host: &str) -> bool {
        let proxy_state = self.app_handle.state::<crate::proxy::ProxyState>();
        let is_bypassed = proxy_state.should_bypass_uri(host);
        !is_bypassed
    }

    async fn handle_request(
        &self,
        http_ctx: &mut HttpContext,
        req: Request<Body>,
    ) -> hexbuffer_proxy::Result<RequestOrResponse> {
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

        let (mut parts, body) = req.into_parts();
        let body_bytes = match body.into_bytes().await {
            Ok(bytes) => bytes,
            Err(e) => {
                eprintln!("[lifecycle] Failed to read request body: {}", e);
                return Ok(RequestOrResponse::Request(Request::from_parts(
                    parts,
                    Body::from(bytes::Bytes::new()),
                )));
            }
        };
        ctx.req_body = body_bytes.to_vec();

        let mut body_modified = false;

        // ponytail: delegate MockForge interception to its own module
        if ctx.req_method != "CONNECT" {
            if let Some(resp) = mock_forge::try_intercept(&self.app_handle, &ctx).await {
                return Ok(resp);
            }
        }

        let proxy_state = self.app_handle.state::<ProxyState>();
        let should_bypass_uri = proxy_state.should_bypass_uri(&ctx.req_uri);

        if ctx.req_method != "CONNECT" && !should_bypass_uri {
            let mode = proxy_state.get_mode();

            if mode == InterceptMode::Enabled {
                let intercept_tab_id = proxy_state.matching_intercept_tab_id(&ctx.req_uri);

                if intercept_tab_id.is_none() {
                    self.pending_ctxs.lock().unwrap().insert(http_ctx.id, ctx.clone());
                    let mut req = Request::from_parts(parts, Body::from(bytes::Bytes::from(body_bytes.to_vec())));
                    req.headers_mut().insert("x-rusxy", "1".parse().unwrap());
                    return Ok(RequestOrResponse::Request(req));
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

                proxy_state.add_paused_request(paused_req.clone());
                crate::automation::ingest_intercept_paused_request(&self.app_handle, &paused_req);

                loop {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                    if proxy_state.get_paused_request(&paused_id).is_none() {
                        break;
                    }
                }

                let action = proxy_state.take_paused_action(&paused_id);

                match action {
                    Some(crate::proxy::state::InterceptAction::Drop) => {
                        return Ok(RequestOrResponse::Response(
                            Response::builder()
                                .status(502)
                                .body(Body::from(bytes::Bytes::from("Dropped by intercept")))
                                .unwrap_or_else(|_| Response::new(Body::from(bytes::Bytes::new()))),
                        ));
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

        self.pending_ctxs.lock().unwrap().insert(http_ctx.id, ctx.clone());

        let request_body = if body_modified {
            ctx.req_body.clone()
        } else {
            body_bytes.to_vec()
        };
        let mut req = Request::from_parts(parts, Body::from(bytes::Bytes::from(request_body)));
        req.headers_mut().insert("x-rusxy", "1".parse().unwrap());

        Ok(RequestOrResponse::Request(req))
    }

    async fn handle_response(
        &self,
        http_ctx: &mut HttpContext,
        res: Response<Body>,
    ) -> hexbuffer_proxy::Result<Response<Body>> {
        let mut ctx = match self.pending_ctxs.lock().unwrap().remove(&http_ctx.id) {
            Some(c) => c,
            None => {
                eprintln!("[lifecycle] ERROR: No ctx found for req_id={} in handle_response", http_ctx.id);
                return Ok(res);
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

        let body_bytes = match body.into_bytes().await {
            Ok(bytes) => bytes,
            Err(e) => {
                eprintln!("[lifecycle] Failed to read response body: {}", e);
                return Ok(Response::from_parts(parts, Body::from(bytes::Bytes::new())));
            }
        };
        ctx.res_body = body_bytes.to_vec();

        let mut response_body = body_bytes.to_vec();

        if ctx.req_method != "CONNECT" {
            let proxy_state = self.app_handle.state::<crate::proxy::ProxyState>();
            let should_bypass_uri = proxy_state.should_bypass_uri(&ctx.req_uri);
            let mode = proxy_state.get_mode();

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

                proxy_state.add_paused_request(paused_req.clone());
                crate::automation::ingest_intercept_paused_request(&self.app_handle, &paused_req);

                loop {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                    if proxy_state.get_paused_request(&paused_id).is_none() {
                        break;
                    }
                }

                let action = proxy_state.take_paused_action(&paused_id);

                match action {
                    Some(crate::proxy::state::InterceptAction::Drop) => {
                        return Ok(Response::builder()
                            .status(502)
                            .body(Body::from(bytes::Bytes::from("Dropped by intercept")))
                            .unwrap_or_else(|_| Response::new(Body::from(bytes::Bytes::new()))));
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

        Ok(Response::from_parts(parts, Body::from(bytes::Bytes::from(response_body))))
    }
}

#[async_trait::async_trait]
impl hexbuffer_proxy::WebSocketHandler for AppHandler {
    async fn on_upgrade(
        &self,
        ctx: &mut HttpContext,
        request: Request<Body>,
    ) -> Request<Body> {
        let connection_id = uuid::Uuid::new_v4();
        let client_addr = ctx.client_addr.to_string();
        let req_uri = request.uri().to_string();

        let req_headers: HashMap<String, String> = request
            .headers()
            .iter()
            .filter_map(|(k, v)| v.to_str().ok().map(|s| (k.as_str().to_string(), s.to_string())))
            .collect();

        let (host, path, url) = websocket::parse_websocket_target(&req_uri, &req_headers);
        let key = format!("{}|{}|{}", client_addr, host, path);

        self.ws_connections
            .lock()
            .unwrap()
            .insert(key, connection_id);

        let now = chrono::Utc::now();
        let record = crate::proxy::state::WebSocketConnectionRecord {
            id: connection_id,
            timestamp: now,
            url,
            host,
            path,
            handshake_request_headers: req_headers,
            handshake_response_status: Some(101),
            handshake_response_headers: HashMap::new(),
            client_addr: client_addr.clone(),
            server_addr: req_uri,
            state: crate::proxy::state::WebSocketConnectionState::Open,
            message_count: 0,
            last_activity_at: now,
        };

        if let Some(history) = self.app_handle.try_state::<crate::HistoryBridge>() {
            if let Err(e) = history.insert_websocket_connection(&record) {
                eprintln!("[websocket] failed to insert WS connection: {}", e);
            }
        }
        if let Err(e) = self.app_handle.emit("websocket-connection", &record) {
            eprintln!("[websocket] failed to emit WS connection event: {}", e);
        }

        request
    }

    async fn on_frame(
        &self,
        ctx: &mut HttpContext,
        msg: hexbuffer_proxy::WebSocketMessage,
        direction: hexbuffer_proxy::Direction,
    ) -> Option<hexbuffer_proxy::WebSocketMessage> {
        let ws_direction = match direction {
            hexbuffer_proxy::Direction::ClientToServer => WebSocketMessageDirection::Inbound,
            hexbuffer_proxy::Direction::ServerToClient => WebSocketMessageDirection::Outbound,
        };
        let client_addr = ctx.client_addr.to_string();
        let uri = ctx.host.clone();

        eprintln!(
            "[websocket] handle_message dir={:?} client={} uri={}",
            ws_direction, client_addr, uri
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
                direction: ws_direction,
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

    async fn on_close(&self, ctx: &mut HttpContext) {
        let client_addr = ctx.client_addr.to_string();
        let uri_str = ctx.host.clone();
        let empty_headers = HashMap::new();
        let (host, path, _) = websocket::parse_websocket_target(&uri_str, &empty_headers);
        let key = format!("{}|{}|{}", client_addr, host, path);
        if let Some(conn_id) = self.ws_connections.lock().unwrap().remove(&key) {
            eprintln!("[websocket] connection closed via on_close conn_id={}", conn_id);
        }
    }
}
