pub mod completion;

use std::time::Duration;

use hudsucker::{Body, HttpContext, HttpHandler, RequestOrResponse};
use hyper::{Request, Response};
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
    ) -> RequestOrResponse {
        use std::sync::Mutex;
        use tauri::Manager;
        use crate::proxy::intercept;
        use crate::proxy::state::{InterceptMode, PausedRequest, ProxyState};
        
        let mut ctx = Ctx::new(self.app_handle.clone());
        
        ctx.client_addr = http_ctx.client_addr.to_string();
        ctx.server_addr = req.uri().to_string();
        ctx.req_method = req.method().to_string();
        ctx.req_uri = req.uri().to_string();
        ctx.req_http_version = format!("{:?}", req.version());
        
        for (name, value) in req.headers().iter() {
            if let Ok(v) = value.to_str() {
                ctx.req_headers.insert(name.as_str().to_string(), v.to_string());
            }
        }
        
        let (parts, body) = req.into_parts();
        let body_bytes = match http_body_util::BodyExt::collect(body).await {
            Ok(collected) => collected.to_bytes(),
            Err(e) => {
                eprintln!("[lifecycle] Failed to read request body: {}", e);
                return RequestOrResponse::Request(Request::from_parts(parts, Body::empty()));
            }
        };
        ctx.req_body = body_bytes.to_vec();
        
        if !intercept::should_bypass(&ctx.req_uri) {
            let state = self.app_handle.state::<Mutex<ProxyState>>();
            let mode = state.lock().unwrap().get_mode();
            
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
            }
        }
        
        self.ctx = Some(ctx);
        
        let mut req = Request::from_parts(parts, Body::from(body_bytes));
        req.headers_mut().insert("x-rusxy", "1".parse().unwrap());
        
        RequestOrResponse::Request(req)
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
        ctx.res_status_text = res.status().canonical_reason().unwrap_or("Unknown").to_string();
        ctx.res_http_version = format!("{:?}", res.version());
        
        for (name, value) in res.headers().iter() {
            if let Ok(v) = value.to_str() {
                ctx.res_headers.insert(name.as_str().to_string(), v.to_string());
            }
        }
        
        let (parts, body) = res.into_parts();
        let body_bytes = match http_body_util::BodyExt::collect(body).await {
            Ok(collected) => collected.to_bytes(),
            Err(e) => {
                eprintln!("[lifecycle] Failed to read response body: {}", e);
                return Response::from_parts(parts, Body::empty());
            }
        };
        ctx.res_body = body_bytes.to_vec();
        
        let is_gzip = ctx.res_headers.iter()
            .any(|(k, v)| k.to_lowercase() == "content-encoding" && v.to_lowercase() == "gzip");
        
        if is_gzip {
            use flate2::read::GzDecoder;
            use std::io::Read;
            let mut decoder = GzDecoder::new(&ctx.res_body[..]);
            let mut decoded = Vec::new();
            if decoder.read_to_end(&mut decoded).is_ok() {
                ctx.res_body = decoded;
                eprintln!("[lifecycle] gzip decoded body for txn_id={}", ctx.transaction_id);
            } else {
                eprintln!("[lifecycle] ERROR gzip decode failed for txn_id={}", ctx.transaction_id);
            }
        }
        
        if ctx.req_method != "CONNECT" {
            save_and_emit(&ctx, &self.app_handle);
        }
        
        Response::from_parts(parts, Body::from(body_bytes))
    }
}