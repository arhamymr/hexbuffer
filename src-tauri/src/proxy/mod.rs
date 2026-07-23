pub mod ca;
pub mod completion;
pub mod lifecycle;
pub mod mock_forge;
pub mod state;
pub mod types;
pub mod utils;
pub mod websocket;

pub use ca::export_ca_cert_pem;
pub use state::{
    InterceptMode, PausedRequest, ProxyFilter, ProxyRecord, ProxyRequest, ProxyResponse, ProxyState,
};
pub use utils::{encode_body, ensure_port_free};

use hexbuffer_proxy::ProxyBuilder;
use std::io;
use std::net::Ipv4Addr;
use std::sync::{
    atomic::{AtomicBool, AtomicU16, Ordering},
    Arc, Mutex, OnceLock,
};
use tauri::AppHandle;
use tokio::net::TcpListener;
use tokio::sync::oneshot;

use crate::proxy::ca::ensure_ca_exists;

pub struct ProxyConfig {
    pub port: u16,
    pub reuse: bool,
    pub tls_port: u16,
    pub enabled: bool,
}

static ACTIVE_PROXY_PORT: AtomicU16 = AtomicU16::new(0);
static DEFAULT_PROXY_PORT: AtomicU16 = AtomicU16::new(8888);
static PROXY_SHUTDOWN: OnceLock<Mutex<Option<oneshot::Sender<()>>>> = OnceLock::new();
static PROXY_ENABLED_HANDLE: OnceLock<Mutex<Option<Arc<AtomicBool>>>> = OnceLock::new();

fn proxy_shutdown_sender() -> &'static Mutex<Option<oneshot::Sender<()>>> {
    PROXY_SHUTDOWN.get_or_init(|| Mutex::new(None))
}

fn proxy_enabled_handle() -> &'static Mutex<Option<Arc<AtomicBool>>> {
    PROXY_ENABLED_HANDLE.get_or_init(|| Mutex::new(None))
}

pub fn set_proxy_enabled(enabled: bool) {
    if let Ok(handle) = proxy_enabled_handle().lock() {
        if let Some(ref flag) = *handle {
            flag.store(enabled, Ordering::Relaxed);
        }
    }
}

pub fn is_proxy_enabled() -> bool {
    if let Ok(handle) = proxy_enabled_handle().lock() {
        if let Some(ref flag) = *handle {
            return flag.load(Ordering::Relaxed);
        }
    }
    true
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
    if let Ok(mut handle) = proxy_enabled_handle().lock() {
        *handle = None;
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
            enabled: true,
        }
    }
}

pub fn run(config: ProxyConfig, app_handle: AppHandle) {
    eprintln!("[proxy] ========== Starting Hexbuffer Proxy ==========");

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

    // Create CA authority
    let authority = match ca::create_proxy_authority() {
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
    drop(listener);
    ACTIVE_PROXY_PORT.store(port, Ordering::SeqCst);

    let socket_addr: std::net::SocketAddr = (Ipv4Addr::UNSPECIFIED, port).into();

    // Build proxy with hexbuffer-proxy
    let builder = ProxyBuilder::new()
        .with_addr(socket_addr)
        .with_ca(authority)
        .with_decompression(true)
        .with_request_buffer_size(16384)
        .with_enabled(config.enabled)
        .add_http_handler(hexbuffer_proxy::decoder::DecodeHandler)
        .add_http_handler(handler.clone())
        .with_ws_handler(handler);

    let enabled_flag = builder.enabled_flag();
    if let Ok(mut handle) = proxy_enabled_handle().lock() {
        *handle = Some(enabled_flag);
    }

    let proxy = match builder.build() {
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

    runtime.block_on(async move {
        tokio::select! {
            res = proxy.start() => {
                if let Err(e) = res {
                    eprintln!("[proxy] Proxy stopped: {} ({:?})", e, e);
                }
            }
            _ = shutdown_rx => {
                eprintln!("[proxy] Graceful shutdown signal received");
            }
        }
    });
    clear_proxy_runtime();
}
