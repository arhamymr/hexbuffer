pub mod ai;
pub mod browser;
pub mod db;
pub mod history;
#[path = "port-scanner/mod.rs"]
pub mod port_scanner;
pub mod proxy;
pub mod sqli;

pub use ai::{
    clear_ai_api_key, get_ai_settings, get_mastra_status, has_ai_api_key, save_ai_settings,
    start_mastra, start_mastra_if_enabled, stop_mastra, AiSettings, MastraProcessState,
    MastraStatus,
};
pub use browser::{
    browser_batch, browser_click, browser_close, browser_execute, browser_fill, browser_navigate,
    browser_open, browser_press, browser_screenshot, browser_snapshot, browser_type,
    get_browser_status, BrowserProcessState,
};
pub use db::repository::{Database, DocumentRecord, PaginatedResponse, TreeNode, TreePath};
pub use history::{
    HistoryBridge, ProxyLogSummary, WebSocketConnectionDetail, WebSocketConnectionSummary,
};
pub use port_scanner::{scan_ports, stop_port_scan, PortScanState};
pub use proxy::https::cert::export_ca_cert_pem;
pub use proxy::state::{
    InterceptMode, InterceptStatus, PausedRequest, ProxyFilter, ProxyRecord, ProxyRequest,
    ProxyResponse, WebSocketConnectionRecord, WebSocketConnectionState, WebSocketFilter,
    WebSocketMessageDirection, WebSocketMessageRecord, WebSocketMessageType,
};
pub use proxy::utils::ensure_port_free;
pub use proxy::{active_proxy_port, default_proxy_port, run, ProxyConfig, ProxyState};
pub use sqli::types::SqliScanState;
pub use sqli::{
    start_sqli_scan, stop_sqli_scan, SqliParam, SqliParamLocation, SqliRiskLevel, SqliScanResult,
    SqliSeverity, SqliTechnique, SqliVulnerability,
};
