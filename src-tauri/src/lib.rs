pub mod ai;
pub mod browser;
pub mod commands;
pub mod db;
pub mod history;
pub mod packet_capture;
#[path = "port-scanner/mod.rs"]
pub mod port_scanner;
pub mod proxy;
pub mod sqli;

pub use ai::{
    clear_ai_api_key, get_ai_key_status, get_ai_settings, get_mastra_status, save_ai_settings,
    send_ai_chat_message, set_ai_api_key, start_mastra, start_mastra_if_enabled, stop_mastra,
    AiSettings, MastraProcessState, MastraStatus,
};
pub use browser::{AIInsight, ActivityLog, AiBrowserState, CrawlConfig, CrawlPage, CrawlSession};
pub use commands::browser::{
    ai_browser_pause_crawl, ai_browser_resume_crawl, ai_browser_start_crawl, ai_browser_stop_crawl,
    browser_batch, browser_click, browser_close, browser_execute, browser_fill, browser_navigate,
    browser_open, browser_press, browser_screenshot, browser_snapshot, browser_type,
    delete_ai_browser_session, get_ai_browser_session, get_browser_status,
    list_ai_browser_insights, list_ai_browser_logs, list_ai_browser_pages,
    list_recent_ai_browser_sessions, BrowserProcessState,
};
pub use commands::packet_capture::{
    configure_capture_network, get_packet_capture_status, get_packets_paginated,
    list_capture_interfaces, prepare_packet_capture_permissions, start_packet_capture,
    stop_packet_capture,
};
pub use db::repository::{Database, DocumentRecord, PaginatedResponse, TreeNode, TreePath};
pub use history::{
    HistoryBridge, ProxyLogSummary, StoredPacketSummary, WebSocketConnectionDetail,
    WebSocketConnectionSummary,
};
pub use packet_capture::{
    CaptureInterface, CapturedPacketEvent, NetworkCaptureConfig, PacketCaptureErrorEvent,
    PacketCaptureRecord, PacketCaptureState, PacketCaptureStatus, PacketConnectionRecord,
    StoredPacketRecord,
};
pub use port_scanner::{scan_ports, stop_port_scan, PortScanState};
pub use proxy::https::cert::export_ca_cert_pem;
pub use proxy::state::{
    InterceptMode, InterceptStatus, PausedRequest, ProxyFilter, ProxyRecord, ProxyRequest,
    ProxyResponse, WebSocketConnectionRecord, WebSocketConnectionState, WebSocketFilter,
    WebSocketMessageDirection, WebSocketMessageRecord, WebSocketMessageType,
};
pub use proxy::utils::ensure_port_free;
pub use proxy::{active_proxy_port, default_proxy_port, run, stop, ProxyConfig, ProxyState};
pub use sqli::types::SqliScanState;
pub use sqli::{
    start_sqli_scan, stop_sqli_scan, SqliParam, SqliParamLocation, SqliRiskLevel, SqliScanResult,
    SqliSeverity, SqliTechnique, SqliVulnerability,
};
