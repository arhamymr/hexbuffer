mod adapter;
mod body;
pub mod events;
pub mod handler;
pub mod handlers;
pub mod intercept;
pub mod mitm;
pub mod types;
mod utils;

pub use adapter::{ApiCall, RequestType};
pub use handler::{CapturingHandler, create_event_channel};
pub use intercept::InterceptConfig;
pub use types::{InterceptDecision, ProxiedRequest, ProxiedResponse};
pub use events::ProxyEvent;

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;
use tauri::Emitter;
use tokio_util::sync::CancellationToken;

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct ProxyState {
    pub running: bool,
    pub port: Option<u16>,
    pub connections: u32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ProxyConnection {
    pub id: String,
    pub timestamp: u64,
    pub host: String,
    pub port: u16,
    pub target_id: String,
}

pub struct ProxyServer {
    port: u16,
    target_id: Option<String>,
    cert_manager: Arc<crate::CertManager>,
}

impl ProxyServer {
    pub fn new(port: u16, cert_manager: Arc<crate::CertManager>) -> Self {
        Self {
            port,
            target_id: None,
            cert_manager,
        }
    }

    pub fn with_target_id(mut self, target_id: String) -> Self {
        self.target_id = Some(target_id);
        self
    }

    pub async fn start(
        &mut self,
        app_handle: tauri::AppHandle,
        cancel_token: CancellationToken,
        intercept: Arc<InterceptConfig>,
        event_tx_arc: Arc<parking_lot::Mutex<Option<mpsc::Sender<ProxyEvent>>>>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        use tokio::net::TcpListener;

        let listener = TcpListener::bind(std::net::SocketAddr::from(([0, 0, 0, 0], self.port))).await?;
        log::info!("Proxy listening on {}", listener.local_addr().unwrap());

        let target_id = self.target_id.clone().unwrap_or_else(|| "default".to_string());
        let app = app_handle.clone();
        let cert = self.cert_manager.clone();

        let (event_tx, mut event_rx) = create_event_channel();
        {
            let mut tx_guard = event_tx_arc.lock();
            *tx_guard = Some(event_tx.clone());
        }

        let app_for_adapter = app.clone();
        let target_for_adapter = target_id.clone();

        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                if cancel_token.is_cancelled() {
                    break;
                }
                let app = app.clone();
                let tid = target_id.clone();
                let cert = cert.clone();
                let ct = cancel_token.clone();
                let tx = event_tx.clone();
                let ic = intercept.clone();
                tokio::spawn(crate::proxy::handlers::handle_connection(
                    stream, app, tid, cert, ct, tx, ic,
                ));
            }
        });

        tokio::spawn(async move {
            use adapter::adapt_proxy_event_to_apicall;
            while let Some(event) = event_rx.recv().await {
                match event.event_type.as_str() {
                    "RequestIntercepted" => {
                        if let Some(req) = event.request.as_ref() {
                            let _ = app_for_adapter.emit("intercept-request", serde_json::json!({
                                "id": event.id,
                                "request": {
                                    "id": format!("call_{}", event.id),
                                    "method": req.method,
                                    "url": req.url,
                                    "headers": req.headers,
                                    "request_body": req.body,
                                    "timestamp": req.timestamp,
                                }
                            }));
                        }
                    }
                    "RequestComplete" | "Error" => {
                        let api_call = {
                            let req = event.request.as_ref();
                            let res = event.response.as_ref();
                            let (duration_ms, _size) = event.meta.as_ref()
                                .map(|m| (m.duration_ms.unwrap_or(0), m.size.unwrap_or(0)))
                                .unwrap_or((0, 0));
                            adapt_proxy_event_to_apicall(
                                &event.event_type,
                                event.id,
                                req.unwrap_or(&ProxiedRequest::new("GET", "/", "/", "HTTP/1.1", std::collections::HashMap::new(), None, 0)),
                                &res.cloned(),
                                &target_for_adapter,
                                duration_ms,
                            )
                        };
                        let _ = app_for_adapter.emit("proxy-log", &api_call);
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }
}