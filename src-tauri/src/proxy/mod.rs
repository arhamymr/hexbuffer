pub mod intercept;
pub mod lifecycle;
pub mod logger;
pub mod state;
pub mod utils;
pub mod https;

pub use state::{ProxyState, ProxyRecord, ProxyFilter, ProxyRequest, ProxyResponse, PausedRequest, InterceptMode};
pub use utils::ensure_port_free;
pub use https::cert::{export_ca_cert_pem, get_ca_cert_x509};

use std::sync::Arc;
use pingora::listeners::tls::TlsSettings;
use pingora_core::server::configuration::Opt;
use pingora_core::server::Server;
use pingora_proxy::http_proxy_service;
use tauri::AppHandle;

use crate::proxy::https::{TlsManager, TlsCertCallback};

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
    eprintln!("[proxy] ========== Starting ==========");

    if let Err(e) = ensure_port_free(config.port, config.reuse) {
        eprintln!("[proxy] FATAL port {}: {}", config.port, e);
        return;
    }

    if let Err(e) = ensure_port_free(config.tls_port, config.reuse) {
        eprintln!("[proxy] FATAL tls_port {}: {}", config.tls_port, e);
        return;
    }

    let opt = Opt::parse_args();
    let mut server = match Server::new(Some(opt)) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[proxy] FATAL server: {:?}", e);
            return;
        }
    };

    server.bootstrap();

    let proxy_service = http_proxy_service(&server.configuration, lifecycle::Rusxy::new(app_handle));
    let mut proxy = proxy_service;

    proxy.add_tcp(&format!("127.0.0.1:{}", config.port));
    println!("[proxy] HTTP proxy bound to port {} (CONNECT tunneling for HTTP/HTTPS)", config.port);

    let tls_manager = Arc::new(TlsManager::new());
    let callback = Box::new(TlsCertCallback::new(tls_manager));
    println!("[proxy] TlsCertCallback created");

    let mut tls_settings = match TlsSettings::with_callbacks(callback) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[proxy] FATAL TLS settings creation failed: {:?}", e);
            return;
        }
    };
    println!("[proxy] TLS settings created successfully");
    tls_settings.enable_h2();
    println!("[proxy] HTTP/2 enabled on TLS settings");

    proxy.add_tls_with_settings(&format!("127.0.0.1:{}", config.tls_port), None, tls_settings);
    println!("[proxy] HTTPS MITM proxy bound to port {}", config.tls_port);

    server.add_service(proxy);

    eprintln!("[proxy] ========== Starting Server ==========");
    println!("Proxy listening on port {} (HTTP tunnel) and port {} (HTTPS MITM)", config.port, config.tls_port);

    server.run_forever();
}