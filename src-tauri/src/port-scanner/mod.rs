mod banner;
mod scanner;
mod services;
mod state;
mod targets;
mod types;

use scanner::scan_single_port;
use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    Arc, Mutex,
};
use targets::{expand_targets, normalize_scan_ports};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Semaphore;
use types::{PortScanProgress, PortScanRequest};

pub use types::PortScanResult;
pub use state::PortScanState;

#[tauri::command]
pub async fn scan_ports(
    app: AppHandle,
    scan_state: State<'_, PortScanState>,
    request: PortScanRequest,
) -> Result<Vec<PortScanResult>, String> {
    if matches!(request.scan_type.as_deref(), Some("syn")) {
        return Err(
            "SYN scanning requires raw sockets and a privileged helper; use TCP connect scan for now"
                .to_string(),
        );
    }

    let hosts = expand_targets(&request.target)?;
    let ports = normalize_scan_ports(request.ports)?;
    let total = hosts.len() * ports.len();
    if total > 65_535 {
        return Err("Scans are limited to 65,535 host/port checks at a time".to_string());
    }

    let timeout_ms = request.timeout_ms.unwrap_or(800).clamp(100, 10_000);
    let concurrency = request.concurrency.unwrap_or(100).clamp(1, 500);
    let banner_grab = request.banner_grab.unwrap_or(true);
    let cancel_flag = Arc::new(AtomicBool::new(false));

    {
        let mut cancellations = scan_state
            .cancellations
            .lock()
            .map_err(|_| "Failed to acquire scanner state".to_string())?;
        cancellations.insert(request.scan_id.clone(), cancel_flag.clone());
    }

    let semaphore = Arc::new(Semaphore::new(concurrency));
    let completed = Arc::new(AtomicUsize::new(0));
    let results = Arc::new(Mutex::new(Vec::with_capacity(total)));
    let mut handles = Vec::with_capacity(total);

    for host in hosts {
        for port in &ports {
            if cancel_flag.load(Ordering::Relaxed) {
                break;
            }

            let permit = match semaphore.clone().acquire_owned().await {
                Ok(permit) => permit,
                Err(_) => break,
            };
            let app = app.clone();
            let host = host.clone();
            let port = *port;
            let scan_id = request.scan_id.clone();
            let cancel_flag = cancel_flag.clone();
            let completed = completed.clone();
            let results = results.clone();

            handles.push(tokio::spawn(async move {
                let _permit = permit;
                if cancel_flag.load(Ordering::Relaxed) {
                    return;
                }

                let result =
                    scan_single_port(&host, port, timeout_ms, banner_grab, cancel_flag.clone())
                        .await;
                if result.state == "cancelled" {
                    return;
                }
                crate::automation::ingest_port_scan_result(&app, &scan_id, &result);

                let current = completed.fetch_add(1, Ordering::Relaxed) + 1;
                if let Ok(mut results) = results.lock() {
                    results.push(result.clone());
                }

                let _ = app.emit(&format!("port-scan-result-{}", scan_id), result);
                let _ = app.emit(
                    &format!("port-scan-progress-{}", scan_id),
                    PortScanProgress::Update { current, total },
                );
            }));
        }
    }

    for handle in handles {
        let _ = handle.await;
    }

    let was_cancelled = cancel_flag.load(Ordering::Relaxed);
    if let Ok(mut cancellations) = scan_state.cancellations.lock() {
        cancellations.remove(&request.scan_id);
    }

    let progress = if was_cancelled {
        PortScanProgress::Cancelled
    } else {
        PortScanProgress::Complete
    };
    let _ = app.emit(&format!("port-scan-progress-{}", request.scan_id), progress);

    let mut results = results
        .lock()
        .map_err(|_| "Failed to collect scan results".to_string())?
        .clone();
    results.sort_by(|a, b| a.host.cmp(&b.host).then(a.port.cmp(&b.port)));
    Ok(results)
}

#[tauri::command]
pub fn stop_port_scan(scan_state: State<'_, PortScanState>, scan_id: String) -> Result<(), String> {
    let cancellations = scan_state
        .cancellations
        .lock()
        .map_err(|_| "Failed to acquire scanner state".to_string())?;

    if let Some(cancel_flag) = cancellations.get(&scan_id) {
        cancel_flag.store(true, Ordering::Relaxed);
    }

    Ok(())
}
