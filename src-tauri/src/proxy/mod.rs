pub mod intercept;
pub mod lifecycle;
pub mod logger;
pub mod state;
pub mod utils;

pub use state::{ProxyState, ProxyRecord, ProxyFilter, ProxyRequest, ProxyResponse, PausedRequest, InterceptMode};
pub use utils::ensure_port_free;

use pingora_core::server::configuration::Opt;
use pingora_core::server::Server;
use pingora_proxy::http_proxy_service;
use tauri::AppHandle;

pub struct ProxyConfig {
    pub port: u16,
    pub reuse: bool,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self { port: 8888, reuse: false }
    }
}

pub fn run(config: ProxyConfig, app_handle: AppHandle) {
    ensure_port_free(config.port, config.reuse).expect("Failed to ensure port is free");

    let opt = Opt::parse_args();
    let mut server = Server::new(Some(opt)).unwrap();
    server.bootstrap();

    let mut proxy = http_proxy_service(&server.configuration, lifecycle::Rusxy::new(app_handle));
    proxy.add_tcp(&format!("127.0.0.1:{}", config.port));
    server.add_service(proxy);

    println!("Proxy listening on port {}", config.port);

    server.run_forever();
}