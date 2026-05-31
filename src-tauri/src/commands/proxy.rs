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
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/0xbuffer.log")
        .map_err(|e| e.to_string())?;
    writeln!(
        file,
        "start_proxy called: port={}, tls_port={}",
        port, tls_port
    )
    .map_err(|e| e.to_string())?;

    let handle = app.clone();
    std::thread::spawn(move || {
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("/tmp/0xbuffer.log")
            .unwrap();
        writeln!(file, "thread spawned, calling run()").unwrap();
        crate::proxy::run(
            crate::proxy::ProxyConfig {
                port,
                reuse: true,
                tls_port,
            },
            handle,
        );
        writeln!(file, "run() returned").unwrap();
    });
    Ok(format!(
        "Proxy starting on port {} (HTTP) and {} (HTTPS MITM)",
        port, tls_port
    ))
}

#[tauri::command]
pub async fn stop_proxy() -> Result<String, String> {
    crate::proxy::stop()?;
    Ok("Proxy stopped".to_string())
}

#[tauri::command]
pub async fn get_proxy_status() -> Result<ProxyRuntimeStatus, String> {
    let default_port = crate::proxy::default_proxy_port();
    let port = crate::proxy::active_proxy_port().unwrap_or(default_port);
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let running = TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok();

    Ok(ProxyRuntimeStatus {
        running,
        port: running.then_some(port),
        default_port,
        connections: 0,
    })
}
