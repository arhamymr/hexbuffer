pub mod ai;
pub mod db;
pub mod history;
#[path = "port-scanner/mod.rs"]
pub mod port_scanner;
pub mod proxy;

pub use ai::{
    clear_ai_api_key, get_ai_settings, get_mastra_status, save_ai_settings, start_mastra,
    start_mastra_if_enabled, stop_mastra, AiSettings, MastraProcessState, MastraStatus,
};
pub use db::repository::{Database, DocumentRecord, PaginatedResponse, TreeNode, TreePath};
pub use history::{
    HistoryBridge, ProxyLogSummary, WebSocketConnectionDetail, WebSocketConnectionSummary,
};
pub use port_scanner::{scan_ports, stop_port_scan, PortScanState};
pub use proxy::https::cert::export_ca_cert_pem;
pub use proxy::state::{
    InterceptMode, PausedRequest, ProxyFilter, ProxyRecord, ProxyRequest, ProxyResponse,
    WebSocketConnectionRecord, WebSocketConnectionState, WebSocketFilter,
    WebSocketMessageDirection, WebSocketMessageRecord, WebSocketMessageType,
};
pub use proxy::utils::ensure_port_free;
pub use proxy::{run, ProxyConfig, ProxyState};
