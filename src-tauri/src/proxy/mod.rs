pub mod https;
pub mod intercept;
pub mod lifecycle;
pub mod logger;
pub mod state;
pub mod utils;

pub use https::cert::export_ca_cert_pem;
pub use state::{
    InterceptMode, PausedRequest, ProxyFilter, ProxyRecord, ProxyRequest, ProxyResponse, ProxyState,
};
pub use utils::ensure_port_free;

use hudsucker::{rustls::crypto::aws_lc_rs, Proxy};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU16, Ordering};
use tauri::AppHandle;

use crate::proxy::https::cert::ensure_ca_exists;

pub struct ProxyConfig {
    pub port: u16,
    pub reuse: bool,
    pub tls_port: u16,
}

static ACTIVE_PROXY_PORT: AtomicU16 = AtomicU16::new(0);
static DEFAULT_PROXY_PORT: AtomicU16 = AtomicU16::new(8888);

pub fn active_proxy_port() -> Option<u16> {
    match ACTIVE_PROXY_PORT.load(Ordering::SeqCst) {
        0 => None,
        port => Some(port),
    }
}

pub fn default_proxy_port() -> u16 {
    DEFAULT_PROXY_PORT.load(Ordering::SeqCst)
}

fn resolve_proxy_port(config: &ProxyConfig) -> Result<u16, String> {
    DEFAULT_PROXY_PORT.store(config.port, Ordering::SeqCst);

    if config.reuse {
        ensure_port_free(config.port, true)?;
        return Ok(config.port);
    }

    for port in config.port..=u16::MAX {
        match ensure_port_free(port, false) {
            Ok(()) => return Ok(port),
            Err(error) => {
                eprintln!("[proxy] Port {} unavailable: {}", port, error);
            }
        }
    }

    Err(format!(
        "No free proxy ports found at or above {}",
        config.port
    ))
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            port: 8888,
            reuse: false,
            tls_port: 8889,
        }
    }
}

pub fn run(config: ProxyConfig, app_handle: AppHandle) {
    eprintln!("[proxy] ========== Starting Hudsucker Proxy ==========");

    ensure_ca_exists();

    let port = match resolve_proxy_port(&config) {
        Ok(port) => port,
        Err(e) => {
            eprintln!("[proxy] FATAL port {}: {}", config.port, e);
            ACTIVE_PROXY_PORT.store(0, Ordering::SeqCst);
            return;
        }
    };

    if port != config.port {
        eprintln!(
            "[proxy] Default port {} is in use; using {} instead",
            config.port, port
        );
    }

    ACTIVE_PROXY_PORT.store(port, Ordering::SeqCst);

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
        .with_addr(SocketAddr::from(([0, 0, 0, 0], port)))
        .with_ca(authority)
        .with_rustls_connector(aws_lc_rs::default_provider())
        .with_http_handler(handler)
        .build()
    {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to build proxy: {}", e);
            ACTIVE_PROXY_PORT.store(0, Ordering::SeqCst);
            return;
        }
    };

    eprintln!(
        "[proxy] Proxy listening on port {} (HTTP and HTTPS MITM)",
        port
    );

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
            ACTIVE_PROXY_PORT.store(0, Ordering::SeqCst);
        }
    });
}
