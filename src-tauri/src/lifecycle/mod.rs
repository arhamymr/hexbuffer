pub mod completion;
pub mod context;
pub mod peer;
pub mod request;
pub mod response;

use std::time::Duration;

use async_trait::async_trait;
use bytes::Bytes;

use pingora_core::upstreams::peer::HttpPeer;
use pingora_core::Result;
use pingora_http::{RequestHeader, ResponseHeader};
use pingora_proxy::{ProxyHttp, Session};
use tauri::AppHandle;

pub use completion::handle_response_body;
pub use completion::save_and_emit;
pub use context::parse_request;
pub use peer::create_peer;
pub use request::handle_request_filter;
pub use response::handle_response_filter;

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
        }
    }
}

pub struct Rusxy {
    pub app_handle: AppHandle,
}

impl Rusxy {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
}

#[async_trait]
impl ProxyHttp for Rusxy {
    type CTX = Ctx;

    fn new_ctx(&self) -> Self::CTX {
        let ctx = Ctx::new(self.app_handle.clone());
        println!("[lifecycle] new_ctx txn_id={}", ctx.transaction_id);
        ctx
    }

    async fn upstream_peer(&self, session: &mut Session, ctx: &mut Ctx) -> Result<Box<HttpPeer>> {
        println!("[lifecycle] upstream_peer start txn_id={}", ctx.transaction_id);
        parse_request(session, ctx);
        let peer = create_peer(session, ctx)?;
        println!("[host] connect on {}", peer);
        println!("[lifecycle] upstream_peer end txn_id={}", ctx.transaction_id);
        Ok(peer)
    }

    async fn upstream_request_filter(
        &self,
        session: &mut Session,
        upstream_request: &mut RequestHeader,
        ctx: &mut Ctx,
    ) -> Result<()> {
        handle_request_filter(session, upstream_request, ctx, &self.app_handle).await;
        Ok(())
    }

    async fn request_body_filter(
        &self,
        _session: &mut Session,
        body: &mut Option<Bytes>,
        end_of_stream: bool,
        ctx: &mut Ctx,
    ) -> Result<()> {
        if let Some(b) = body {
            ctx.req_body.extend_from_slice(b);
        }
        println!("[lifecycle] request_body_filter txn_id={} body_len={} end={}", ctx.transaction_id, ctx.req_body.len(), end_of_stream);
        Ok(())
    }

    async fn response_filter(
        &self,
        session: &mut Session,
        upstream_response: &mut ResponseHeader,
        ctx: &mut Ctx,
    ) -> Result<()> {
        handle_response_filter(session, upstream_response, ctx);
        Ok(())
    }

    fn response_body_filter(
        &self,
        _session: &mut Session,
        body: &mut Option<Bytes>,
        end_of_stream: bool,
        ctx: &mut Ctx,
    ) -> Result<Option<Duration>>
    where
        Self::CTX: Send + Sync,
    {
        println!("[lifecycle] response_body_filter txn_id={} body_len={} end={}", ctx.transaction_id, body.as_ref().map(|b| b.len()).unwrap_or(0), end_of_stream);

        if !ctx.response_recorded && end_of_stream {
            println!("[lifecycle] response_body_filter calling save_and_emit for txn_id={}", ctx.transaction_id);
            save_and_emit(ctx, &self.app_handle);
            ctx.response_recorded = true;
        }

        handle_response_body(body, end_of_stream, ctx, &self.app_handle);
        Ok(None)
    }
}