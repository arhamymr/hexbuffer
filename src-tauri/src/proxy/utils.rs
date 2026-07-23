use std::process::Command;
use std::thread;
use std::time::Duration;

pub fn listening_pids(port: u16) -> Result<Vec<String>, String> {
    let output = Command::new("lsof")
        .args(["-nP", &format!("-tiTCP:{}", port), "-sTCP:LISTEN"])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|pid| !pid.is_empty())
        .map(str::to_string)
        .collect())
}

pub fn ensure_port_free(port: u16, reuse: bool) -> Result<(), String> {
    let pids = listening_pids(port)?;

    if !pids.is_empty() {
        if reuse {
            let current_pid = std::process::id().to_string();
            for pid in pids {
                if pid == current_pid {
                    println!("Skipping self (PID {}) on port {}", pid, port);
                    continue;
                }

                println!("Killing process {} on port {}", pid, port);
                let output = Command::new("kill")
                    .arg(&pid)
                    .output()
                    .map_err(|e| format!("Failed to kill process: {}", e))?;

                if !output.status.success() {
                    return Err(format!(
                        "Failed to kill process {} on port {}: {}",
                        pid,
                        port,
                        String::from_utf8_lossy(&output.stderr).trim()
                    ));
                }
            }

            for _ in 0..20 {
                let remaining = listening_pids(port)?
                    .into_iter()
                    .filter(|pid| pid != &current_pid)
                    .collect::<Vec<_>>();

                if remaining.is_empty() {
                    return Ok(());
                }

                thread::sleep(Duration::from_millis(100));
            }

            let remaining = listening_pids(port)?
                .into_iter()
                .filter(|pid| pid != &current_pid)
                .collect::<Vec<_>>();

            for pid in &remaining {
                println!("Force killing process {} on port {}", pid, port);
                let output = Command::new("kill")
                    .args(["-9", pid])
                    .output()
                    .map_err(|e| format!("Failed to force kill process: {}", e))?;

                if !output.status.success() {
                    return Err(format!(
                        "Failed to force kill process {} on port {}: {}",
                        pid,
                        port,
                        String::from_utf8_lossy(&output.stderr).trim()
                    ));
                }
            }

            if !remaining.is_empty() {
                thread::sleep(Duration::from_millis(100));
            }

            let remaining = listening_pids(port)?
                .into_iter()
                .filter(|pid| pid != &current_pid)
                .collect::<Vec<_>>();

            if !remaining.is_empty() {
                return Err(format!(
                    "Port {} is still in use by process {} after kill attempts.",
                    port,
                    remaining.join(", ")
                ));
            }
        } else {
            return Err(format!(
                "Port {} is already in use by process {}.\nUse --reuse to auto-kill it.",
                port,
                pids.join(", ")
            ));
        }
    }
    Ok(())
}

// ponytail: delegate body re-compression to hexbuffer_proxy::decoder
pub fn encode_body(encoding: &str, body: &[u8]) -> Result<Vec<u8>, String> {
    let full = hexbuffer_proxy::Body::Full(bytes::Bytes::copy_from_slice(body));
    match hexbuffer_proxy::decoder::encode_body(full, encoding, None) {
        Ok(hexbuffer_proxy::Body::Full(bytes)) => Ok(bytes.to_vec()),
        Ok(_) => Err("expected Body::Full from encoder".to_string()),
        Err(e) => Err(format!("{e}")),
    }
}

pub fn is_captive_portal(uri: &str) -> bool {
    let lower = uri.to_lowercase();
    lower.contains("generate_204")
        || lower.contains("canonical.html")
        || lower.contains("connecttest.txt")
        || lower.contains("ncsi.txt")
        || lower.contains("captive.apple.com")
        || lower.contains("connectivitycheck.gstatic.com")
        || lower.contains("msftconnecttest.com")
}


