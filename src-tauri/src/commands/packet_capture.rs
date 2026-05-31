use crate::history::{HistoryBridge, StoredPacketSummary};
use crate::packet_capture::parser;
use crate::packet_capture::types::*;
use chrono::Utc;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::thread;
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

#[cfg(target_os = "macos")]
fn run_osascript(script: &str) -> Result<String, String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|error| format!("Failed to request packet capture permissions: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "Packet capture permission request was cancelled or failed.".to_string()
        } else {
            stderr
        });
    }
    Ok("ok".to_string())
}

#[tauri::command]
pub async fn prepare_packet_capture_permissions() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"do shell script "chmod a+rw /dev/bpf*" with administrator privileges"#;
        run_osascript(script)?;
        Ok("Packet capture permissions updated. Start capture again.".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err(
            "Automatic packet capture permission setup is currently implemented for macOS only."
                .to_string(),
        )
    }
}

#[tauri::command]
pub async fn list_capture_interfaces() -> Result<Vec<CaptureInterface>, String> {
    let mut interfaces = list_tcpdump_interfaces().unwrap_or_default();
    let ip_addresses = list_interface_addresses().unwrap_or_default();
    let wifi_device = detect_wifi_device().ok();

    if interfaces.is_empty() {
        interfaces = vec![
            CaptureInterface {
                id: wifi_device.clone().unwrap_or_else(|| "en0".to_string()),
                name: wifi_device.clone().unwrap_or_else(|| "en0".to_string()),
                label: "Wi-Fi".to_string(),
                address: None,
                description: "Wireless capture interface".to_string(),
                is_wifi: true,
                is_loopback: false,
            },
            CaptureInterface {
                id: "lo0".to_string(),
                name: "lo0".to_string(),
                label: "Loopback".to_string(),
                address: Some("127.0.0.1".to_string()),
                description: "Localhost traffic".to_string(),
                is_wifi: false,
                is_loopback: true,
            },
        ];
    }

    for interface in &mut interfaces {
        interface.address = ip_addresses
            .iter()
            .find(|(name, _)| name == &interface.name)
            .map(|(_, address)| address.clone());
        interface.is_wifi = wifi_device
            .as_ref()
            .is_some_and(|device| device == &interface.name);
        interface.is_loopback = interface.name.starts_with("lo");

        if interface.is_wifi {
            interface.label = "Wi-Fi".to_string();
            interface.description = "Wireless capture with optional SSID credentials".to_string();
        } else if interface.is_loopback {
            interface.label = "Loopback".to_string();
            interface.description = "Localhost and app-to-app traffic".to_string();
        }
    }

    Ok(interfaces)
}

#[tauri::command]
pub async fn configure_capture_network(config: NetworkCaptureConfig) -> Result<String, String> {
    if config.interface_id.trim().is_empty() {
        return Err("Choose a capture interface.".to_string());
    }

    let interface = config.interface_id.trim();

    if config.ssid.trim().is_empty() {
        return Ok(format!("Interface {interface} configured for capture."));
    }

    if config.security_mode != "open" && config.password.trim().is_empty() {
        return Err("Wi-Fi password is required for secured networks.".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("networksetup");
        command
            .arg("-setairportnetwork")
            .arg(interface)
            .arg(config.ssid.trim());

        if config.security_mode != "open" {
            command.arg(config.password.trim());
        }

        let output = command
            .output()
            .map_err(|error| format!("Failed to run networksetup: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(if stderr.is_empty() {
                "Failed to configure Wi-Fi network.".to_string()
            } else {
                stderr
            });
        }

        Ok(format!("Connected {interface} to {}.", config.ssid.trim()))
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Wi-Fi credential configuration is currently implemented for macOS only.".to_string())
    }
}

#[tauri::command]
pub async fn start_packet_capture(
    app: AppHandle,
    state: State<'_, PacketCaptureState>,
    config: NetworkCaptureConfig,
) -> Result<PacketCaptureStatus, String> {
    if state.running.load(std::sync::atomic::Ordering::SeqCst) {
        return Err("Packet capture is already running.".to_string());
    }

    let tcpdump_path = find_command("tcpdump").ok_or_else(|| {
        "tcpdump was not found. Install tcpdump or run this app on a system that includes it."
            .to_string()
    })?;

    let mut command = Command::new(tcpdump_path);
    command
        .arg("-i")
        .arg(config.interface_id.trim())
        .arg("-n")
        .arg("-l")
        .arg("-tt")
        .arg("-vv")
        .arg("-s")
        .arg("0")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if config.monitor_mode {
        command.arg("-I");
    }

    if !config.promiscuous_mode {
        command.arg("-p");
    }

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to start tcpdump: {error}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to read tcpdump stdout.".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to read tcpdump stderr.".to_string())?;
    let capture_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let capture = PacketCaptureRecord {
        id: capture_id.clone(),
        name: format!("{} capture {}", config.interface_id.trim(), now),
        interface_id: config.interface_id.trim().to_string(),
        interface_label: None,
        started_at: now.clone(),
        ended_at: None,
        status: "running".to_string(),
        packet_count: 0,
        created_at: now,
    };

    app.state::<HistoryBridge>()
        .insert_packet_capture(&capture)
        .map_err(|error| format!("Failed to create capture record: {error}"))?;

    state
        .running
        .store(true, std::sync::atomic::Ordering::SeqCst);
    state
        .packet_number
        .store(0, std::sync::atomic::Ordering::SeqCst);
    *state
        .active_capture_id
        .lock()
        .map_err(|error| format!("Capture state lock failed: {error}"))? = Some(capture_id.clone());
    *state
        .child
        .lock()
        .map_err(|error| format!("Capture state lock failed: {error}"))? = Some(child);

    let running = state.running.clone();
    let packet_number = state.packet_number.clone();
    let app_for_stdout = app.clone();
    let capture_id_for_stdout = capture_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut first_timestamp: Option<f64> = None;

        for line in reader.lines().map_while(Result::ok) {
            if !running.load(std::sync::atomic::Ordering::SeqCst) {
                break;
            }

            if let Some(event) = parser::parse_tcpdump_line(&line, &packet_number) {
                let started_at = *first_timestamp.get_or_insert(event.timestamp);
                persist_packet_event(&app_for_stdout, &capture_id_for_stdout, &event, started_at);
                let _ = app_for_stdout.emit("packet-capture-event", event);
            }
        }
    });

    let running = state.running.clone();
    let app_for_stderr = app.clone();
    let capture_id_for_stderr = capture_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);

        for line in reader.lines().map_while(Result::ok) {
            let normalized = line.trim();

            if normalized.is_empty()
                || normalized.contains("listening on")
                || normalized.contains("verbose output suppressed")
            {
                continue;
            }

            let _ = app_for_stderr.emit(
                "packet-capture-error",
                PacketCaptureErrorEvent {
                    message: normalized.to_string(),
                },
            );
        }

        running.store(false, std::sync::atomic::Ordering::SeqCst);
        finish_capture(&app_for_stderr, &capture_id_for_stderr);
    });

    Ok(PacketCaptureStatus {
        running: true,
        interface_id: Some(config.interface_id),
        capture_id: Some(capture_id),
    })
}

#[tauri::command]
pub async fn stop_packet_capture(
    app: AppHandle,
    state: State<'_, PacketCaptureState>,
) -> Result<PacketCaptureStatus, String> {
    state
        .running
        .store(false, std::sync::atomic::Ordering::SeqCst);

    if let Some(mut child) = state
        .child
        .lock()
        .map_err(|error| format!("Capture state lock failed: {error}"))?
        .take()
    {
        let _ = child.kill();
        let _ = child.wait();
    }
    if let Some(capture_id) = state
        .active_capture_id
        .lock()
        .map_err(|error| format!("Capture state lock failed: {error}"))?
        .take()
    {
        finish_capture(&app, &capture_id);
    }

    Ok(PacketCaptureStatus {
        running: false,
        interface_id: None,
        capture_id: None,
    })
}

#[tauri::command]
pub async fn get_packet_capture_status(
    state: State<'_, PacketCaptureState>,
) -> Result<PacketCaptureStatus, String> {
    Ok(PacketCaptureStatus {
        running: state.running.load(std::sync::atomic::Ordering::SeqCst),
        interface_id: None,
        capture_id: state
            .active_capture_id
            .lock()
            .map_err(|error| format!("Capture state lock failed: {error}"))?
            .clone(),
    })
}

#[tauri::command]
pub async fn get_packets_paginated(
    history: State<'_, HistoryBridge>,
    capture_id: String,
    page: u32,
    per_page: u32,
) -> Result<crate::db::repository::PaginatedResponse<StoredPacketSummary>, String> {
    history.get_packets_paginated(&capture_id, page, per_page)
}

fn persist_packet_event(
    app: &AppHandle,
    capture_id: &str,
    event: &CapturedPacketEvent,
    capture_started_at: f64,
) {
    let relative_time = (event.timestamp - capture_started_at).max(0.0);
    let created_at = Utc::now().to_rfc3339();
    let packet = StoredPacketRecord {
        id: event.id.clone(),
        capture_id: capture_id.to_string(),
        packet_number: event.number,
        timestamp: event.timestamp,
        relative_time,
        source_ip: event.source_ip.clone(),
        destination_ip: event.destination_ip.clone(),
        protocol: event.protocol.clone(),
        source_port: event.source_port,
        destination_port: event.destination_port,
        packet_length: event.length,
        info: event.info.clone(),
        raw_line: event.raw_line.clone(),
        raw_data: event.raw_line.as_bytes().to_vec(),
        created_at,
    };
    let connection = PacketConnectionRecord {
        id: build_connection_id(capture_id, event),
        capture_id: capture_id.to_string(),
        source_ip: event.source_ip.clone(),
        source_port: event.source_port,
        destination_ip: event.destination_ip.clone(),
        destination_port: event.destination_port,
        protocol: event.protocol.clone(),
        first_seen: relative_time,
        last_seen: relative_time,
        total_bytes: event.length,
        incomplete: !event.info.contains("Flags [F") && !event.info.contains("Flags [R"),
    };

    if let Err(error) = app
        .state::<HistoryBridge>()
        .insert_captured_packet(&packet, &connection)
    {
        let _ = app.emit(
            "packet-capture-error",
            PacketCaptureErrorEvent {
                message: format!("Failed to persist packet: {error}"),
            },
        );
    }
}

fn finish_capture(app: &AppHandle, capture_id: &str) {
    let ended_at = Utc::now().to_rfc3339();
    if let Err(error) = app
        .state::<HistoryBridge>()
        .finish_packet_capture(capture_id, &ended_at)
    {
        let _ = app.emit(
            "packet-capture-error",
            PacketCaptureErrorEvent {
                message: format!("Failed to finish capture record: {error}"),
            },
        );
    }
}

fn build_connection_id(capture_id: &str, event: &CapturedPacketEvent) -> String {
    let left = format!("{}:{}", event.source_ip, event.source_port.unwrap_or(0));
    let right = format!(
        "{}:{}",
        event.destination_ip,
        event.destination_port.unwrap_or(0)
    );
    let (source, destination) = if left <= right {
        (left, right)
    } else {
        (right, left)
    };
    format!("{capture_id}:{source}:{destination}:{}", event.protocol)
}

fn list_tcpdump_interfaces() -> Result<Vec<CaptureInterface>, String> {
    let output = Command::new("tcpdump")
        .arg("-D")
        .output()
        .map_err(|error| format!("Failed to list tcpdump interfaces: {error}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let line_regex = regex::Regex::new(r"^\d+\.(?P<name>[^\s]+)(?:\s+\[(?P<label>[^\]]+)\])?.*$")
        .map_err(|error| error.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let captures = line_regex.captures(line.trim())?;
            let name = captures.name("name")?.as_str().to_string();
            let label = captures
                .name("label")
                .map(|value| value.as_str().to_string())
                .unwrap_or_else(|| name.clone());

            Some(CaptureInterface {
                id: name.clone(),
                name,
                label,
                address: None,
                description: "Packet capture interface".to_string(),
                is_wifi: false,
                is_loopback: false,
            })
        })
        .collect())
}

fn list_interface_addresses() -> Result<Vec<(String, String)>, String> {
    let output = Command::new("ifconfig")
        .output()
        .map_err(|error| format!("Failed to run ifconfig: {error}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let mut current_name: Option<String> = None;
    let mut addresses = Vec::new();

    for line in String::from_utf8_lossy(&output.stdout).lines() {
        if !line.starts_with('\t') && !line.starts_with(' ') {
            current_name = line.split(':').next().map(|value| value.to_string());
            continue;
        }

        let trimmed = line.trim();
        if let Some(address) = trimmed.strip_prefix("inet ") {
            if let Some(name) = &current_name {
                if let Some(ip) = address.split_whitespace().next() {
                    addresses.push((name.clone(), ip.to_string()));
                }
            }
        }
    }

    Ok(addresses)
}

fn detect_wifi_device() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("networksetup")
            .arg("-listallhardwareports")
            .output()
            .map_err(|error| format!("Failed to run networksetup: {error}"))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        let mut previous_was_wifi = false;

        for line in String::from_utf8_lossy(&output.stdout).lines() {
            let trimmed = line.trim();

            if trimmed.starts_with("Hardware Port:") {
                previous_was_wifi = trimmed.contains("Wi-Fi") || trimmed.contains("AirPort");
                continue;
            }

            if previous_was_wifi {
                if let Some(device) = trimmed.strip_prefix("Device:") {
                    return Ok(device.trim().to_string());
                }
            }
        }

        Err("Wi-Fi device not found.".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Wi-Fi detection is currently implemented for macOS only.".to_string())
    }
}

fn find_command(command: &str) -> Option<String> {
    let output = Command::new("which").arg(command).output().ok()?;

    if !output.status.success() {
        return None;
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if path.is_empty() {
        None
    } else {
        Some(path)
    }
}
