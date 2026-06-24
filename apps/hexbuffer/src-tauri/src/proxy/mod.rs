pub mod https;
pub mod intercept;
pub mod lifecycle;
pub mod state;
pub mod utils;
pub mod websocket;

pub use https::cert::export_ca_cert_pem;
pub use state::{
    InterceptMode, PausedRequest, ProxyFilter, ProxyRecord, ProxyRequest, ProxyResponse, ProxyState,
};
pub use utils::ensure_port_free;

use hudsucker::{rustls::crypto::aws_lc_rs, Proxy};
use std::io;
use std::net::Ipv4Addr;
use std::sync::{
    atomic::{AtomicU16, Ordering},
    Mutex, OnceLock,
};
use tauri::AppHandle;
use tokio::net::TcpListener;
use tokio::sync::oneshot;

use crate::proxy::https::cert::ensure_ca_exists;

pub struct ProxyConfig {
    pub port: u16,
    pub reuse: bool,
    pub tls_port: u16,
}

static ACTIVE_PROXY_PORT: AtomicU16 = AtomicU16::new(0);
static DEFAULT_PROXY_PORT: AtomicU16 = AtomicU16::new(8888);
static PROXY_SHUTDOWN: OnceLock<Mutex<Option<oneshot::Sender<()>>>> = OnceLock::new();

fn proxy_shutdown_sender() -> &'static Mutex<Option<oneshot::Sender<()>>> {
    PROXY_SHUTDOWN.get_or_init(|| Mutex::new(None))
}

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

    if let Some(port) = active_proxy_port() {
        return Ok(port);
    }

    if let Err(error) = ensure_port_free(config.port, config.reuse) {
        if !config.reuse {
            return Err(error);
        }

        eprintln!(
            "[proxy] WARN: Could not free port {}: {}. Will try fallback ports.",
            config.port, error
        );
    }

    Ok(config.port)
}

fn bind_proxy_listener(
    runtime: &tokio::runtime::Runtime,
    preferred_port: u16,
    allow_fallback: bool,
) -> Result<(u16, TcpListener), String> {
    let max_attempts = if allow_fallback { 20 } else { 1 };

    for offset in 0..max_attempts {
        let Some(port) = preferred_port.checked_add(offset) else {
            break;
        };

        match runtime.block_on(TcpListener::bind((Ipv4Addr::UNSPECIFIED, port))) {
            Ok(listener) => {
                if port != preferred_port {
                    eprintln!(
                        "[proxy] WARN: Port {} is unavailable; using fallback port {}",
                        preferred_port, port
                    );
                }

                return Ok((port, listener));
            }
            Err(error) if error.kind() == io::ErrorKind::AddrInUse && allow_fallback => {
                eprintln!(
                    "[proxy] WARN: Port {} is still in use: {} ({:?})",
                    port, error, error
                );
            }
            Err(error) => {
                return Err(format!(
                    "Failed to bind port {}: {} ({:?})",
                    port, error, error
                ));
            }
        }
    }

    Err(format!(
        "Failed to bind proxy listener: no available port found from {} to {}",
        preferred_port,
        preferred_port.saturating_add(max_attempts.saturating_sub(1))
    ))
}

fn clear_proxy_runtime() {
    ACTIVE_PROXY_PORT.store(0, Ordering::SeqCst);

    if let Ok(mut shutdown) = proxy_shutdown_sender().lock() {
        *shutdown = None;
    }
}

pub fn stop() -> Result<(), String> {
    let Some(shutdown) = proxy_shutdown_sender()
        .lock()
        .map_err(|error| format!("{error}"))?
        .take()
    else {
        ACTIVE_PROXY_PORT.store(0, Ordering::SeqCst);
        return Ok(());
    };

    shutdown
        .send(())
        .map_err(|_| "Proxy shutdown signal could not be delivered".to_string())?;
    ACTIVE_PROXY_PORT.store(0, Ordering::SeqCst);
    Ok(())
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

    if let Some(port) = active_proxy_port() {
        eprintln!("[proxy] Proxy already running on port {}", port);
        return;
    }

    let port = match resolve_proxy_port(&config) {
        Ok(port) => port,
        Err(e) => {
            eprintln!("[proxy] FATAL port {}: {}", config.port, e);
            ACTIVE_PROXY_PORT.store(0, Ordering::SeqCst);
            return;
        }
    };

    let (shutdown_tx, shutdown_rx) = oneshot::channel();

    {
        let mut shutdown = match proxy_shutdown_sender().lock() {
            Ok(shutdown) => shutdown,
            Err(error) => {
                eprintln!(
                    "[proxy] FATAL: Failed to acquire shutdown handle: {}",
                    error
                );
                ACTIVE_PROXY_PORT.store(0, Ordering::SeqCst);
                return;
            }
        };

        if shutdown.is_some() {
            eprintln!("[proxy] Proxy is already running");
            return;
        }

        *shutdown = Some(shutdown_tx);
    }
    // Create AppHandler instance
    let handler = lifecycle::AppHandler::new(app_handle.clone());

    // Create CA authority from existing rcgen CA
    let authority = match https::cert::create_hudsucker_authority() {
        Ok(auth) => auth,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to create CA authority: {}", e);
            clear_proxy_runtime();
            return;
        }
    };

    // Start proxy with tokio runtime (blocking)
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to create tokio runtime: {}", e);
            clear_proxy_runtime();
            return;
        }
    };

    let (port, listener) = match bind_proxy_listener(&runtime, port, config.reuse) {
        Ok(result) => result,
        Err(error) => {
            eprintln!("[proxy] FATAL: {}", error);
            clear_proxy_runtime();
            return;
        }
    };
    ACTIVE_PROXY_PORT.store(port, Ordering::SeqCst);

    // Build proxy with Hudsucker
    let proxy = match Proxy::builder()
        .with_listener(listener)
        .with_ca(authority)
        .with_rustls_connector(aws_lc_rs::default_provider())
        .with_http_handler(handler.clone())
        .with_websocket_handler(handler)
        .with_graceful_shutdown(async move {
            let _ = shutdown_rx.await;
        })
        .build()
    {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to build proxy: {}", e);
            clear_proxy_runtime();
            return;
        }
    };

    eprintln!(
        "[proxy] Proxy listening on port {} (HTTP and HTTPS MITM)",
        port
    );

    runtime.block_on(async {
        if let Err(e) = proxy.start().await {
            eprintln!("[proxy] Proxy stopped: {} ({:?})", e, e);
        }
    });
    clear_proxy_runtime();
}
