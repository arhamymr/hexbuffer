pub mod intercept;
pub mod lifecycle;
pub mod logger;
pub mod state;
pub mod utils;
pub mod cert;
pub mod tls;

pub use state::{ProxyState, ProxyRecord, ProxyFilter, ProxyRequest, ProxyResponse, PausedRequest, InterceptMode};
pub use utils::ensure_port_free;
pub use cert::export_ca_cert_pem;

use std::sync::Arc;
use pingora::listeners::tls::TlsSettings;
use pingora_core::server::configuration::Opt;
use pingora_core::server::Server;
use pingora_proxy::http_proxy_service;
use tauri::AppHandle;

use crate::proxy::tls::{TlsManager, TlsCertCallback};

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
    eprintln!("[proxy] ========== Starting Proxy ==========");
    eprintln!("[proxy] port={}, tls_port={}, reuse={}", config.port, config.tls_port, config.reuse);

    if let Err(e) = ensure_port_free(config.port, config.reuse) {
        eprintln!("[proxy] FATAL: Port {} error: {}", config.port, e);
        return;
    }
    eprintln!("[proxy] Port {} is free", config.port);

    if let Err(e) = ensure_port_free(config.tls_port, config.reuse) {
        eprintln!("[proxy] FATAL: TLS port {} error: {}", config.tls_port, e);
        return;
    }
    eprintln!("[proxy] TLS port {} is free", config.tls_port);

    let opt = Opt::parse_args();
    eprintln!("[proxy] Opt parsed");

    let mut server = match Server::new(Some(opt)) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to create server: {:?}", e);
            return;
        }
    };
    eprintln!("[proxy] Server created");

    server.bootstrap();
    eprintln!("[proxy] Server bootstrapped");

    let proxy_service = http_proxy_service(&server.configuration, lifecycle::Rusxy::new(app_handle));
    let mut proxy = proxy_service;
    eprintln!("[proxy] Proxy service created");

    let tcp_addr = format!("127.0.0.1:{}", config.port);
    proxy.add_tcp(&tcp_addr);
    eprintln!("[proxy] Added TCP listener on {}", tcp_addr);

    let tls_manager = Arc::new(TlsManager::new());
    let callback = Box::new(TlsCertCallback::new(tls_manager));
    eprintln!("[proxy] Created TLS callback");

    let mut tls_settings = match TlsSettings::with_callbacks(callback) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[proxy] FATAL: Failed to create TLS settings: {:?}", e);
            return;
        }
    };
    eprintln!("[proxy] TLS settings created");

    tls_settings.enable_h2();
    eprintln!("[proxy] HTTP/2 enabled");

    let tls_addr = format!("127.0.0.1:{}", config.tls_port);
    proxy.add_tls_with_settings(&tls_addr, None, tls_settings);
    eprintln!("[proxy] Added TLS listener on {}", tls_addr);

    server.add_service(proxy);
    eprintln!("[proxy] Service added to server");

    eprintln!("[proxy] ========== Starting Server Loop ==========");
    println!("Proxy listening on port {} (HTTP) and port {} (HTTPS MITM)", config.port, config.tls_port);

    server.run_forever();
}