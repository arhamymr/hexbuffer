use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

use serde::Serialize;
use tauri::AppHandle;

#[derive(Serialize)]
pub struct ProxyRuntimeStatus {
    running: bool,
    port: Option<u16>,
    default_port: u16,
    connections: usize,
}

#[tauri::command]
pub async fn start_proxy(app: AppHandle, port: u16, tls_port: u16) -> Result<String, String> {
    if let Some(active_port) = crate::proxy::active_proxy_port() {
        return Ok(format!("Proxy already running on port {}", active_port));
    }

    let handle = app.clone();
    std::thread::spawn(move || {
        crate::proxy::run(
            crate::proxy::ProxyConfig {
                port,
                reuse: true,
                tls_port,
                enabled: true,
            },
            handle,
        );
    });

    for _ in 0..30 {
        tokio::time::sleep(Duration::from_millis(100)).await;
        if let Some(active_port) = crate::proxy::active_proxy_port() {
            let addr = SocketAddr::from(([127, 0, 0, 1], active_port));
            if TcpStream::connect_timeout(&addr, Duration::from_millis(150)).is_ok() {
                return Ok(format!(
                    "Proxy started on port {} (HTTP) and {} (HTTPS MITM)",
                    active_port, tls_port
                ));
            }
        }
    }

    Err(format!("Timed out waiting for proxy to start on port {}", port))
}

#[tauri::command]
pub async fn stop_proxy() -> Result<String, String> {
    crate::proxy::stop()?;
    Ok("Proxy stopped".to_string())
}

#[tauri::command]
pub async fn get_proxy_status() -> Result<ProxyRuntimeStatus, String> {
    let default_port = crate::proxy::default_proxy_port();
    let Some(port) = crate::proxy::active_proxy_port() else {
        return Ok(ProxyRuntimeStatus {
            running: false,
            port: None,
            default_port,
            connections: 0,
        });
    };

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let running = TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok();

    Ok(ProxyRuntimeStatus {
        running,
        port: running.then_some(port),
        default_port,
        connections: 0,
    })
}
