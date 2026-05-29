pub mod body_decoder;
pub mod completion;

use std::time::Duration;

use hudsucker::{Body, HttpContext, HttpHandler, WebSocketContext, WebSocketHandler};
use hyper::{header::HeaderName, header::HeaderValue, Method, Request, Response, Uri};
use hudsucker::tokio_tungstenite::tungstenite::Message;
use tauri::AppHandle;

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
        }
    }
}

#[derive(Clone)]
pub struct AppHandler {
    app_handle: AppHandle,
    ctx: Option<Ctx>,
}

impl AppHandler {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            ctx: None,
        }
    }
}

impl HttpHandler for AppHandler {
    async fn handle_request(
        &mut self,
        http_ctx: &HttpContext,
        req: Request<Body>,
    ) -> hudsucker::RequestOrResponse {
        use crate::proxy::state::{InterceptMode, PausedRequest, ProxyState};
        use std::sync::Mutex;
        use tauri::Manager;

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
        let body_bytes = match http_body_util::BodyExt::collect(body).await {
            Ok(collected) => collected.to_bytes(),
            Err(e) => {
                eprintln!("[lifecycle] Failed to read request body: {}", e);
                return hudsucker::RequestOrResponse::Request(Request::from_parts(parts, Body::empty()));
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

        let proxy_state_handle = self.app_handle.state::<Mutex<ProxyState>>();
        let should_bypass_uri = proxy_state_handle.lock().unwrap().should_bypass_uri(&ctx.req_uri);

        if ctx.req_method != "CONNECT" && !should_bypass_uri {
            let mode = proxy_state_handle.lock().unwrap().get_mode();

            if mode == InterceptMode::Enabled {
                let paused_id = ctx.transaction_id;
                ctx.paused_id = Some(paused_id);

                let paused_req = PausedRequest {
                    id: paused_id,
                    timestamp: chrono::Utc::now(),
                    client_addr: ctx.client_addr.clone(),
                    server_addr: ctx.server_addr.clone(),
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

                proxy_state_handle.lock().unwrap().add_paused_request(paused_req);

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

                let action = proxy_state_handle.lock().unwrap().take_paused_action(&paused_id);

                match action {
                    Some(crate::proxy::state::InterceptAction::Drop) => {
                        return hudsucker::RequestOrResponse::Response(
                            Response::builder()
                                .status(502)
                                .body(Body::from("Dropped by intercept"))
                                .unwrap_or_else(|_| Response::new(Body::empty())),
                        );
                    }
                    Some(crate::proxy::state::InterceptAction::Forward(Some(modified))) => {
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

        let (parts, body) = res.into_parts();

        if crate::proxy::websocket::is_successful_websocket_handshake(&ctx) {
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

        if ctx.req_method != "CONNECT" {
            save_and_emit(&ctx, &self.app_handle);
        }

        Response::from_parts(parts, Body::from(body_bytes))
    }
}

impl WebSocketHandler for AppHandler {
    async fn handle_message(
        &mut self,
        _ctx: &WebSocketContext,
        msg: Message,
    ) -> Option<Message> {
        println!("[websocket] message: {:?}", msg);
        Some(msg)
    }
}
