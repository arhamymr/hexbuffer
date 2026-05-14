use std::time::Duration;

use async_trait::async_trait;
use bytes::Bytes;

use pingora_core::upstreams::peer::HttpPeer;
use pingora_core::Result;
use pingora_http::{RequestHeader, ResponseHeader};
use pingora_proxy::{ProxyHttp, Session};

use crate::intercept;
use crate::logger;
use crate::state;

pub struct Rusxy;

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
}

#[async_trait]
impl ProxyHttp for Rusxy {
    type CTX = Ctx;

    fn new_ctx(&self) -> Self::CTX {
        let ctx = Ctx {
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
        };
        println!("[lifecycle] new_ctx txn_id={}", ctx.transaction_id);
        ctx
    }

    async fn upstream_peer(&self, session: &mut Session, ctx: &mut Ctx) -> Result<Box<HttpPeer>> {
        println!("[lifecycle] upstream_peer start txn_id={}", ctx.transaction_id);

        ctx.client_addr = session.client_addr().map(|a| a.to_string()).unwrap_or_default();

        let req = session.req_header();
        ctx.req_method = req.method.as_str().to_string();
        ctx.req_uri = req.uri.to_string();
        ctx.req_http_version = format!("{:?}", req.version);

        for (name, value) in req.headers.iter() {
            if let Ok(v) = value.to_str() {
                ctx.req_headers.insert(name.as_str().to_string(), v.to_string());
            }
        }

       let host = session
            .get_header("Host")
            .and_then(|v| v.to_str().ok())
            .filter(|s| !s.is_empty() && !s.starts_with(':'))
            .or_else(|| session.req_header().uri.host())
            .unwrap_or("localhost");

        let port = session.req_header().uri.port_u16().unwrap_or(80);

        let addr = format!("{host}:{port}");
        println!("[lifecycle] upstream_peer connecting to {}", addr);

        let peer = HttpPeer::new(
            &addr,
            false,
            host.to_string(),
        );

        println!("[lifecycle] upstream_peer end txn_id={}", ctx.transaction_id);

        Ok(Box::new(peer))
    }

    async fn upstream_request_filter(
        &self,
        _session: &mut Session,
        upstream_request: &mut RequestHeader,
        ctx: &mut Ctx,
    ) -> Result<()> {
        println!("[lifecycle] upstream_request_filter start txn_id={}", ctx.transaction_id);
        intercept::on_request(upstream_request);

        if intercept::should_bypass(&ctx.req_uri) {
            println!("[lifecycle] bypassed txn_id={}", ctx.transaction_id);
            return Ok(());
        }

        let mode = intercept::get_mode().await;
        if mode != intercept::InterceptMode::Enabled {
            println!("[lifecycle] intercept disabled txn_id={} mode={:?}", ctx.transaction_id, mode);
            return Ok(());
        }

        let paused_id = ctx.transaction_id;
        ctx.paused_id = Some(paused_id);

        let paused_req = intercept::PausedRequest {
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

        intercept::add_paused_request(paused_req).await;

        loop {
            tokio::time::sleep(Duration::from_millis(100)).await;
            let still_exists = intercept::get_paused_request(&paused_id).await;
            if still_exists.is_none() {
                break;
            }
        }

        println!("[lifecycle] upstream_request_filter end txn_id={}", ctx.transaction_id);
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
        _session: &mut Session,
        upstream_response: &mut ResponseHeader,
        ctx: &mut Ctx,
    ) -> Result<()> {
        println!("[lifecycle] response_filter start txn_id={} status={}", ctx.transaction_id, upstream_response.status.as_u16());
        ctx.res_status_code = upstream_response.status.as_u16();
        ctx.res_status_text = upstream_response
            .status
            .canonical_reason()
            .unwrap_or("Unknown")
            .to_string();
        ctx.res_http_version = format!("{:?}", upstream_response.version);

        for (name, value) in upstream_response.headers.iter() {
            if let Ok(v) = value.to_str() {
                ctx.res_headers.insert(name.as_str().to_string(), v.to_string());
            }
        }

        intercept::on_response(upstream_response);
        println!("[lifecycle] response_filter end txn_id={}", ctx.transaction_id);
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
        if let Some(b) = body {
            ctx.res_body.extend_from_slice(b);
        }

        if end_of_stream {
            println!("[lifecycle] response_body_filter end txn_id={} status={}", ctx.transaction_id, ctx.res_status_code);
            let txn = state::ProxyRecord {
                id: ctx.transaction_id,
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
                response: Some(state::ProxyResponse {
                    status_code: ctx.res_status_code,
                    status_text: ctx.res_status_text.clone(),
                    http_version: ctx.res_http_version.clone(),
                    headers: ctx.res_headers.clone(),
                    body: ctx.res_body.clone(),
                }),
            };

            state::PROXY_STORE.write().unwrap().push(txn.clone());

            logger::log_request_body(&txn);

            *body = Some(Bytes::copy_from_slice(&ctx.res_body));
        }

        Ok(None)
    }
}