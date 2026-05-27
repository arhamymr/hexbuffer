use std::process::Command;

pub fn ensure_port_free(port: u16, reuse: bool) -> Result<(), String> {
    let output = Command::new("lsof")
        .args(["-ti", &format!(":{}", port)])
        .output()
        .map_err(|e| format!("Failed to run lsof: {}", e))?;

    if !output.stdout.is_empty() {
        let pids: Vec<String> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(str::trim)
            .filter(|pid| !pid.is_empty())
            .map(str::to_string)
            .collect();

        if reuse {
            let current_pid = std::process::id().to_string();
            for pid in pids {
                if pid == current_pid {
                    println!("Skipping self (PID {}) on port {}", pid, port);
                    continue;
                }

                println!("Killing process {} on port {}", pid, port);
                Command::new("kill")
                    .args(["-9", &pid])
                    .output()
                    .map_err(|e| format!("Failed to kill process: {}", e))?;
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
