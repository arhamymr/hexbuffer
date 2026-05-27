use serde::{Deserialize, Serialize};

#[derive(Default)]
pub struct PacketCaptureState {
    pub child: std::sync::Arc<std::sync::Mutex<Option<std::process::Child>>>,
    pub running: std::sync::Arc<std::sync::atomic::AtomicBool>,
    pub packet_number: std::sync::Arc<std::sync::atomic::AtomicU64>,
    pub active_capture_id: std::sync::Arc<std::sync::Mutex<Option<String>>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureInterface {
    pub id: String,
    pub name: String,
    pub label: String,
    pub address: Option<String>,
    pub description: String,
    pub is_wifi: bool,
    pub is_loopback: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkCaptureConfig {
    pub interface_id: String,
    pub monitor_mode: bool,
    pub promiscuous_mode: bool,
    pub channel: String,
    pub ssid: String,
    pub security_mode: String,
    pub username: String,
    pub password: String,
    pub bssid: String,
    pub device_ip: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PacketCaptureStatus {
    pub running: bool,
    pub interface_id: Option<String>,
    pub capture_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PacketCaptureRecord {
    pub id: String,
    pub name: String,
    pub interface_id: String,
    pub interface_label: Option<String>,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub status: String,
    pub packet_count: usize,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct StoredPacketRecord {
    pub id: String,
    pub capture_id: String,
    pub packet_number: u64,
    pub timestamp: f64,
    pub relative_time: f64,
    pub source_ip: String,
    pub destination_ip: String,
    pub protocol: String,
    pub source_port: Option<u16>,
    pub destination_port: Option<u16>,
    pub packet_length: usize,
    pub info: String,
    pub raw_line: String,
    pub raw_data: Vec<u8>,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct PacketConnectionRecord {
    pub id: String,
    pub capture_id: String,
    pub source_ip: String,
    pub source_port: Option<u16>,
    pub destination_ip: String,
    pub destination_port: Option<u16>,
    pub protocol: String,
    pub first_seen: f64,
    pub last_seen: f64,
    pub total_bytes: usize,
    pub incomplete: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CapturedPacketEvent {
    pub id: String,
    pub number: u64,
    pub timestamp: f64,
    pub source_ip: String,
    pub destination_ip: String,
    pub protocol: String,
    pub source_port: Option<u16>,
    pub destination_port: Option<u16>,
    pub length: usize,
    pub info: String,
    pub raw_line: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PacketCaptureErrorEvent {
    pub message: String,
}
