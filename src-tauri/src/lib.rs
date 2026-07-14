pub mod ai;
pub mod automation;
pub mod browser;
pub mod collaborator;
pub mod commands;
pub mod db;
pub mod history;
#[path = "port-scanner/mod.rs"]
pub mod port_scanner;
pub mod proxy;
pub mod sqli;

pub use ai::{
    clear_ai_api_key, generate_pixel_matrix, get_ai_key_status, get_ai_settings, save_ai_settings,
    send_ai_chat_message, set_ai_api_key, suggest_invoker_markers, AiSettings, ChatMessageRecord,
    ChatSessionRecord, InvokerMarkerSuggestionRequest, InvokerMarkerSuggestionResponse,
    PixelGenerationRequest, PixelGenerationResponse,
};
pub use browser::{AIInsight, ActivityLog, AiBrowserState, CrawlConfig, CrawlPage, CrawlSession};
pub use collaborator::{
    CollaboratorDashboardStats, CollaboratorInteraction, CollaboratorPayload,
    CollaboratorPollingState, CollaboratorServer,
};
pub use commands::browser::{
    ai_browser_pause_crawl, ai_browser_resume_crawl, ai_browser_start_crawl, ai_browser_stop_crawl,
    ai_browser_submit_human_input, browser_batch, browser_click, browser_close, browser_execute,
    browser_fill, browser_navigate, browser_open, browser_press, browser_screenshot,
    browser_snapshot, browser_type, delete_ai_browser_session, get_ai_browser_session,
    get_browser_status, has_any_active_crawl, list_ai_browser_insights, list_ai_browser_logs,
    list_ai_browser_pages, list_recent_ai_browser_sessions, stop_all_active_crawls,
    stop_browser_process, BrowserProcessState,
};
pub use db::repository::{
    Database, DocumentRecord, PaginatedResponse, TreeNode, TreePath, StashRecord,
    StashEndpointRecord, ContextRecord, ChronicleLogRecord,
};
pub use history::{
    HistoryBridge, ProxyLogSummary, WebSocketConnectionDetail,
    WebSocketConnectionSummary,
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

