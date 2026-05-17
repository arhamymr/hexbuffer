pub mod intercept;
pub mod lifecycle;
pub mod logger;
pub mod state;
pub mod utils;
pub mod https;

pub use state::{ProxyState, ProxyRecord, ProxyFilter, ProxyRequest, ProxyResponse, PausedRequest, InterceptMode};
pub use utils::ensure_port_free;
pub use https::cert::export_ca_cert_pem;

use tauri::AppHandle;
use hudsucker::{Proxy, rustls::crypto::aws_lc_rs};
use std::net::SocketAddr;

use crate::proxy::https::cert::ensure_ca_exists;

pub struct ProxyConfig {
    pub port: u16,
    pub reuse: bool,
    pub tls_port: u16,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self { port: 8888, reuse: false, tls_port: 8889 }
    }
}

pub fn run(config: ProxyConfig, app_handle: AppHandle) {
    eprintln!("[proxy] ========== Starting Hudsucker Proxy ==========");

    ensure_ca_exists();

    if let Err(e) = ensure_port_free(config.port, config.reuse) {
        eprintln!("[proxy] FATAL port {}: {}", config.port, e);
        return;
    }

    // Create AppHandler instance
    let handler = lifecycle::AppHandler::new(app_handle.clone());
    
    // Create CA authority from existing rcgen CA
    let authority = match https::cert::create_hudsucker_authority() {
        Ok(auth) => auth,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to create CA authority: {}", e);
            return;
        }
    };
    
    // Build proxy with Hudsucker
    let proxy = match Proxy::builder()
        .with_addr(SocketAddr::from(([0, 0, 0, 0], config.port)))
        .with_ca(authority)
        .with_rustls_connector(aws_lc_rs::default_provider())
        .with_http_handler(handler)
        .build()
    {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to build proxy: {}", e);
            return;
        }
    };
    
    eprintln!("[proxy] Proxy listening on port {} (HTTP and HTTPS MITM)", config.port);
    
    // Start proxy with tokio runtime (blocking)
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to create tokio runtime: {}", e);
            return;
        }
    };
    
    runtime.block_on(async {
        if let Err(e) = proxy.start().await {
            eprintln!("[proxy] FATAL: Proxy error: {}", e);
        }
    });
}