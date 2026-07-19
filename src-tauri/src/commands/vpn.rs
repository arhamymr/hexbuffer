// ponytail: simple OpenVPN status and log management without external complex process monitors.

use std::sync::{Arc, Mutex};
use std::process::{Child, Command, Stdio};
use std::path::PathBuf;
use std::io::{BufRead, BufReader};
use tauri::{AppHandle, Emitter, State};

#[derive(Clone)]
pub struct VpnState {
    pub child: Arc<Mutex<Option<Child>>>,
    pub status: Arc<Mutex<String>>, // "disconnected" | "connecting" | "connected" | "error"
    pub logs: Arc<Mutex<Vec<String>>>,
    pub auth_file: Arc<Mutex<Option<PathBuf>>>,
}

impl Default for VpnState {
    fn default() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            status: Arc::new(Mutex::new("disconnected".to_string())),
            logs: Arc::new(Mutex::new(Vec::new())),
            auth_file: Arc::new(Mutex::new(None)),
        }
    }
}

#[derive(serde::Serialize)]
pub struct VpnStatusResponse {
    pub status: String,
    pub logs: Vec<String>,
}

fn find_openvpn_binary() -> PathBuf {
    let brew_path = PathBuf::from("/opt/homebrew/sbin/openvpn");
    if brew_path.exists() {
        return brew_path;
    }
    let local_path = PathBuf::from("/usr/local/sbin/openvpn");
    if local_path.exists() {
        return local_path;
    }
    if let Ok(output) = Command::new("which").arg("openvpn").output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                return PathBuf::from(path_str);
            }
        }
    }
    PathBuf::from("openvpn")
}

#[cfg(target_os = "macos")]
fn ensure_setuid_root(bin_path: &std::path::Path) -> Result<(), String> {
    let bin_str = bin_path.to_string_lossy();
    let script = format!(
        "do shell script \"chown root:wheel '{}' && chmod 4755 '{}'\" with administrator privileges",
        bin_str, bin_str
    );
    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute prompt command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!("Authorization failed: {}", stderr));
    }
    Ok(())
}

fn log(msg: &str) {
    let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{ts}] [VPN] {msg}");
    eprintln!("{line}");
}

#[tauri::command]
pub async fn start_vpn(
    app: AppHandle,
    state: State<'_, VpnState>,
    config_path: String,
    server: Option<String>,
    port: Option<u16>,
    protocol: Option<String>,
    access: Option<String>,
    username: Option<String>,
    password: Option<String>,
) -> Result<(), String> {
    let state_inner = state.inner().clone();

    // 1. Check if already running or connecting
    {
        let status = state_inner.status.lock().unwrap();
        if *status == "connecting" || *status == "connected" {
            return Err("VPN is already connecting or connected.".to_string());
        }
    }

    // 2. Clear old logs, set status to connecting
    {
        let mut logs = state_inner.logs.lock().unwrap();
        logs.clear();
        logs.push("Starting OpenVPN...".to_string());
        logs.push("NOTE: If OpenVPN exits with code 1, it may lack root privileges (necessary for TUN/TAP allocation).".to_string());
        logs.push("On macOS, you can solve this by running:".to_string());
        logs.push("  sudo chown root:wheel /opt/homebrew/sbin/openvpn && sudo chmod 4755 /opt/homebrew/sbin/openvpn".to_string());
        logs.push("--------------------------------------------------".to_string());

        let mut status = state_inner.status.lock().unwrap();
        *status = "connecting".to_string();
    }

    // Emit initial status
    let _ = app.emit("vpn:status", serde_json::json!({
        "status": "connecting",
        "error": null,
    }));

    // 3. Resolve OpenVPN path
    let openvpn_bin = find_openvpn_binary();
    if !openvpn_bin.exists() && openvpn_bin.to_string_lossy() != "openvpn" {
        let err_msg = "OpenVPN binary not found. Please install OpenVPN (e.g., brew install openvpn).".to_string();
        let mut status = state_inner.status.lock().unwrap();
        *status = "error".to_string();
        let _ = app.emit("vpn:status", serde_json::json!({
            "status": "error",
            "error": err_msg,
        }));
        return Err(err_msg);
    }

    // Grant setuid permissions if needed (only on macOS)
    #[cfg(target_os = "macos")]
    {
        if openvpn_bin.exists() {
            let needs_elevation = if let Ok(metadata) = std::fs::metadata(&openvpn_bin) {
                use std::os::unix::fs::MetadataExt;
                let uid = metadata.uid();
                let mode = metadata.mode();
                uid != 0 || (mode & 0o4000) == 0
            } else {
                true
            };

            if needs_elevation {
                {
                    let mut logs = state_inner.logs.lock().unwrap();
                    logs.push("OpenVPN lacks root permissions. Prompting for administrator authorization...".to_string());
                }
                let _ = app.emit("vpn:log", "OpenVPN lacks root permissions. Prompting for administrator authorization...".to_string());

                if let Err(e) = ensure_setuid_root(&openvpn_bin) {
                    {
                        let mut logs = state_inner.logs.lock().unwrap();
                        logs.push(format!("[ERROR] Authorization failed: {}", e));
                    }
                    let _ = app.emit("vpn:log", format!("[ERROR] Authorization failed: {}", e));

                    let mut status = state_inner.status.lock().unwrap();
                    *status = "error".to_string();
                    let _ = app.emit("vpn:status", serde_json::json!({
                        "status": "error",
                        "error": e.clone(),
                    }));
                    return Err(e);
                }

                {
                    let mut logs = state_inner.logs.lock().unwrap();
                    logs.push("Authorization successful! Root permissions granted.".to_string());
                }
                let _ = app.emit("vpn:log", "Authorization successful! Root permissions granted.".to_string());
            }
        }
    }

    // 4. Build arguments
    let mut args = vec!["--config".to_string(), config_path.clone()];

    if let Some(ref s) = server {
        if !s.is_empty() {
            let port_val = port.unwrap_or(1194);
            let proto_val = protocol.clone().unwrap_or_else(|| "udp".to_string());
            args.push("--remote".to_string());
            args.push(s.clone());
            args.push(port_val.to_string());
            args.push(proto_val);
        }
    } else {
        if let Some(ref proto) = protocol {
            if !proto.is_empty() {
                args.push("--proto".to_string());
                args.push(proto.clone());
            }
        }
        if let Some(p) = port {
            args.push("--port".to_string());
            args.push(p.to_string());
        }
    }

    // 5. Handle auth credentials via temp file to prevent CLI block
    let mut temp_auth_path = None;
    if let (Some(ref u), Some(ref p)) = (username, password) {
        if !u.is_empty() {
            let temp_dir = std::env::temp_dir();
            let file_path = temp_dir.join(format!("openvpn_auth_{}.tmp", uuid::Uuid::new_v4()));
            if std::fs::write(&file_path, format!("{}\n{}", u, p)).is_ok() {
                args.push("--auth-user-pass".to_string());
                args.push(file_path.to_string_lossy().to_string());
                temp_auth_path = Some(file_path);
            }
        }
    }

    // Store auth file path in state for cleanup
    {
        let mut auth_file = state_inner.auth_file.lock().unwrap();
        *auth_file = temp_auth_path;
    }

    // Log the initiation of OpenVPN
    log(&format!("Starting OpenVPN. Server: {:?}, Protocol: {:?}, Access Profile: {:?}", server, protocol, access));

    // 6. Spawn process
    let mut command = Command::new(openvpn_bin);
    command.args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // Create a new process group so we can kill all subprocesses atomically on disconnect
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }

    // Set working directory to the config folder so relative paths to certs/keys resolve correctly
    let config_path_buf = PathBuf::from(&config_path);
    if let Some(parent) = config_path_buf.parent() {
        if parent.exists() && parent.is_dir() {
            command.current_dir(parent);
        }
    }

    // Spawn openvpn process
    let mut child = match command.spawn() {
        Ok(c) => c,
        Err(e) => {
            let err_msg = format!("Failed to spawn OpenVPN: {e}");
            // Clean up temporary auth file if it exists
            let mut auth_file_guard = state_inner.auth_file.lock().unwrap();
            if let Some(path) = auth_file_guard.take() {
                let _ = std::fs::remove_file(path);
            }
            let mut status = state_inner.status.lock().unwrap();
            *status = "error".to_string();
            let _ = app.emit("vpn:status", serde_json::json!({
                "status": "error",
                "error": err_msg,
            }));
            return Err(err_msg);
        }
    };

    let stdout = child.stdout.take().ok_or_else(|| "Failed to open stdout".to_string())?;
    let stderr = child.stderr.take().ok_or_else(|| "Failed to open stderr".to_string())?;

    // Store child
    {
        let mut child_guard = state_inner.child.lock().unwrap();
        *child_guard = Some(child);
    }

    // 7. Spawn stdout reader
    let app_stdout = app.clone();
    let state_stdout = state_inner.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line_str) = line {
                {
                    let mut logs_guard = state_stdout.logs.lock().unwrap();
                    logs_guard.push(line_str.clone());
                }
                let _ = app_stdout.emit("vpn:log", line_str.clone());

                if line_str.contains("Initialization Sequence Completed") {
                    let mut status_guard = state_stdout.status.lock().unwrap();
                    *status_guard = "connected".to_string();
                    let _ = app_stdout.emit("vpn:status", serde_json::json!({
                        "status": "connected",
                        "error": null,
                    }));
                }
            }
        }
    });

    // 8. Spawn stderr reader
    let app_stderr = app.clone();
    let state_stderr = state_inner.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line_str) = line {
                let formatted = format!("[ERROR] {}", line_str);
                {
                    let mut logs_guard = state_stderr.logs.lock().unwrap();
                    logs_guard.push(formatted.clone());
                }
                let _ = app_stderr.emit("vpn:log", formatted);
            }
        }
    });

    // 9. Spawn exit monitor (briefly polls child status every 500ms to avoid blocking mutex)
    let app_monitor = app.clone();
    let state_monitor = state_inner.clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_millis(500));

            let mut status_to_emit = None;
            let mut auth_to_clean = None;

            {
                let mut child_guard = state_monitor.child.lock().unwrap();
                if let Some(ref mut child) = *child_guard {
                    match child.try_wait() {
                        Ok(Some(exit_status)) => {
                            // Process exited!
                            *child_guard = None;

                            let final_status = if exit_status.success() {
                                "disconnected".to_string()
                            } else {
                                "error".to_string()
                            };
                            let err_msg = if exit_status.success() {
                                None
                            } else {
                                Some(format!("OpenVPN exited with error code: {:?}", exit_status.code()))
                            };

                            let mut status_guard = state_monitor.status.lock().unwrap();
                            *status_guard = final_status.clone();

                            status_to_emit = Some((final_status, err_msg));

                            let mut auth_guard = state_monitor.auth_file.lock().unwrap();
                            auth_to_clean = auth_guard.take();
                        }
                        Ok(None) => {
                            // Still running
                        }
                        Err(e) => {
                            *child_guard = None;

                            let mut status_guard = state_monitor.status.lock().unwrap();
                            *status_guard = "error".to_string();

                            status_to_emit = Some(("error".to_string(), Some(format!("Failed to query process status: {}", e))));

                            let mut auth_guard = state_monitor.auth_file.lock().unwrap();
                            auth_to_clean = auth_guard.take();
                        }
                    }
                } else {
                    // Child was removed manually (e.g. stopped)
                    break;
                }
            }

            if let Some(path) = auth_to_clean {
                let _ = std::fs::remove_file(path);
            }

            if let Some((status, err)) = status_to_emit {
                let _ = app_monitor.emit("vpn:status", serde_json::json!({
                    "status": status,
                    "error": err,
                }));
                break;
            }
        }
    });

    Ok(())
}

#[cfg(target_os = "macos")]
fn clear_stale_vpn_routes() {
    let script_path = concat!(env!("CARGO_MANIFEST_DIR"), "/../scripts/clear_routes.sh");

    let osa = format!(
        "do shell script \"bash '{}'\" with administrator privileges",
        script_path
    );

    match std::process::Command::new("osascript")
        .arg("-e")
        .arg(&osa)
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                eprintln!("{}", stdout.trim());
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("Route cleanup skipped or failed: {}", stderr.trim());
            }
        }
        Err(e) => {
            eprintln!("Failed to spawn route cleanup: {}", e);
        }
    }
}

#[tauri::command]
pub async fn stop_vpn(app: AppHandle, state: State<'_, VpnState>) -> Result<(), String> {
    let state_inner = state.inner().clone();
    let mut child_guard = state_inner.child.lock().unwrap();
    if let Some(mut child) = child_guard.take() {
        // Kill the entire process group on Unix so no subprocess survives
        #[cfg(unix)]
        {
            let pgid = child.id();
            // killpg: sends SIGKILL to every process in the OpenVPN process group
            let _ = std::process::Command::new("kill")
                .args(["-KILL", "--", &format!("-{}", pgid)])
                .output();
        }
        #[cfg(not(unix))]
        {
            let _ = child.kill();
        }
        let _ = child.wait();
    }

    // Clear any stale routes left on utun virtual interfaces
    #[cfg(target_os = "macos")]
    clear_stale_vpn_routes();

    // Destroy the temporary auth file
    let mut auth_file_guard = state_inner.auth_file.lock().unwrap();
    if let Some(path) = auth_file_guard.take() {
        let _ = std::fs::remove_file(path);
    }

    // Wipe all logs so the next connect is a completely fresh start
    {
        let mut logs = state_inner.logs.lock().unwrap();
        logs.clear();
    }

    let mut status_guard = state_inner.status.lock().unwrap();
    *status_guard = "disconnected".to_string();

    let _ = app.emit("vpn:status", serde_json::json!({
        "status": "disconnected",
        "error": null,
    }));

    Ok(())
}

#[tauri::command]
pub async fn get_vpn_status(state: State<'_, VpnState>) -> Result<VpnStatusResponse, String> {
    let state_inner = state.inner().clone();
    let status = state_inner.status.lock().unwrap().clone();
    let logs = state_inner.logs.lock().unwrap().clone();
    Ok(VpnStatusResponse { status, logs })
}
