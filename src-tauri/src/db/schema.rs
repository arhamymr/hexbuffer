pub const CREATE_HTTP_LOGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS http_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    request_headers TEXT,
    request_body BLOB,
    response_status INTEGER,
    response_status_text TEXT,
    response_headers TEXT,
    response_body BLOB,
    client_addr TEXT,
    server_addr TEXT,
    duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_http_logs_timestamp ON http_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_http_logs_method ON http_logs(method);
CREATE INDEX IF NOT EXISTS idx_http_logs_url ON http_logs(url);
CREATE INDEX IF NOT EXISTS idx_http_logs_response_status ON http_logs(response_status);
"#;

pub const CREATE_WEBSOCKET_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS websocket_connections (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    url TEXT NOT NULL,
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    handshake_request_headers TEXT,
    handshake_response_status INTEGER,
    handshake_response_headers TEXT,
    client_addr TEXT,
    server_addr TEXT,
    state TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    last_activity_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS websocket_messages (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    direction TEXT NOT NULL,
    message_type TEXT NOT NULL,
    payload BLOB,
    payload_size INTEGER NOT NULL,
    FOREIGN KEY(connection_id) REFERENCES websocket_connections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_websocket_connections_timestamp ON websocket_connections(timestamp);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_host ON websocket_connections(host);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_url ON websocket_connections(url);
CREATE INDEX IF NOT EXISTS idx_websocket_messages_connection_id ON websocket_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_websocket_messages_timestamp ON websocket_messages(timestamp);
"#;

pub const CREATE_DOCUMENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    sections TEXT NOT NULL,
    custom_sections TEXT NOT NULL DEFAULT '[]',
    removed_built_in_sections TEXT NOT NULL DEFAULT '[]',
    api_entries TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
"#;

pub const CREATE_THREAT_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS threat_samples (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    original_path TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS threat_analysis_runs (
    id TEXT PRIMARY KEY,
    sample_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    error TEXT,
    logs TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY(sample_id) REFERENCES threat_samples(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS threat_artifacts (
    sample_id TEXT PRIMARY KEY,
    metadata_json TEXT,
    hashes_json TEXT,
    strings_json TEXT NOT NULL DEFAULT '[]',
    imports_json TEXT NOT NULL DEFAULT '[]',
    exports_json TEXT NOT NULL DEFAULT '[]',
    entropy_json TEXT,
    yara_json TEXT NOT NULL DEFAULT '[]',
    functions_json TEXT NOT NULL DEFAULT '[]',
    decompiled_json TEXT NOT NULL DEFAULT '[]',
    call_graph_json TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(sample_id) REFERENCES threat_samples(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS threat_findings (
    id TEXT PRIMARY KEY,
    sample_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(sample_id) REFERENCES threat_samples(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_threat_samples_updated_at ON threat_samples(updated_at);
CREATE INDEX IF NOT EXISTS idx_threat_samples_sha256 ON threat_samples(sha256);
CREATE INDEX IF NOT EXISTS idx_threat_runs_sample_id ON threat_analysis_runs(sample_id);
CREATE INDEX IF NOT EXISTS idx_threat_findings_sample_id ON threat_findings(sample_id);
"#;

pub const CREATE_AI_BROWSER_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS ai_browser_sessions (
    id TEXT PRIMARY KEY,
    target_url TEXT NOT NULL,
    strategy TEXT NOT NULL,
    status TEXT NOT NULL,
    max_depth INTEGER NOT NULL,
    max_pages INTEGER NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_browser_pages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    status TEXT NOT NULL,
    depth INTEGER NOT NULL,
    parent_url TEXT,
    http_status INTEGER,
    links_found INTEGER NOT NULL DEFAULT 0,
    forms_found INTEGER NOT NULL DEFAULT 0,
    ai_summary TEXT,
    ai_used_for_analysis INTEGER,
    interesting INTEGER NOT NULL DEFAULT 0,
    screenshot_path TEXT,
    rendered_html_path TEXT,
    discovered_at TEXT NOT NULL,
    visited_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES ai_browser_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_browser_edges (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    from_url TEXT NOT NULL,
    to_url TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES ai_browser_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_browser_insights (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    page_id TEXT,
    url TEXT,
    severity TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    ai_used_for_analysis INTEGER,
    analysis_source TEXT,
    analysis_tool_id TEXT,
    analysis_tool_name TEXT,
    reviewed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES ai_browser_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(page_id) REFERENCES ai_browser_pages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_browser_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    level TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    url TEXT,
    ai_used_for_analysis INTEGER,
    extra_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES ai_browser_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_browser_sessions_status ON ai_browser_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_browser_sessions_started_at ON ai_browser_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_ai_browser_pages_session_id ON ai_browser_pages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_browser_pages_url ON ai_browser_pages(url);
CREATE INDEX IF NOT EXISTS idx_ai_browser_edges_session_id ON ai_browser_edges(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_browser_insights_session_id ON ai_browser_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_browser_logs_session_id ON ai_browser_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_browser_logs_created_at ON ai_browser_logs(created_at);
"#;

pub const CREATE_COLLABORATOR_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS collaborator_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collaborator_payloads (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    identifier TEXT NOT NULL,
    payload_url TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    interaction_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    last_seen_at TEXT,
    FOREIGN KEY(server_id) REFERENCES collaborator_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collaborator_interactions (
    id TEXT PRIMARY KEY,
    payload_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    source_ip TEXT NOT NULL,
    method TEXT,
    path TEXT,
    headers TEXT,
    raw_request TEXT,
    request_body TEXT,
    server_response TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(payload_id) REFERENCES collaborator_payloads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collab_payloads_server ON collaborator_payloads(server_id);
CREATE INDEX IF NOT EXISTS idx_collab_payloads_status ON collaborator_payloads(status);
CREATE INDEX IF NOT EXISTS idx_collab_payloads_identifier ON collaborator_payloads(identifier);
CREATE INDEX IF NOT EXISTS idx_collab_interactions_payload ON collaborator_interactions(payload_id);
CREATE INDEX IF NOT EXISTS idx_collab_interactions_type ON collaborator_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_collab_interactions_ts ON collaborator_interactions(timestamp);
"#;

pub const CREATE_AI_CHAT_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created ON ai_chat_messages(created_at);
"#;

pub const CREATE_REGRESSION_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS regression_test_cases (
    id TEXT PRIMARY KEY,
    test_name TEXT NOT NULL DEFAULT 'Default Test',
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    target_url TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regression_runs (
    id TEXT PRIMARY KEY,
    test_case_id TEXT NOT NULL,
    status TEXT NOT NULL,
    step_results_json TEXT NOT NULL DEFAULT '[]',
    ai_verdict TEXT,
    started_at TEXT,
    finished_at TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(test_case_id) REFERENCES regression_test_cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_regression_runs_test_case ON regression_runs(test_case_id);
CREATE INDEX IF NOT EXISTS idx_regression_runs_created ON regression_runs(created_at);
"#;

pub const CREATE_STASHES_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS stashes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stash_endpoints (
    id TEXT PRIMARY KEY,
    stash_id TEXT NOT NULL,
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT,
    body TEXT,
    body_type TEXT,
    pre_script TEXT,
    test_script TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(stash_id) REFERENCES stashes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stashes_parent ON stashes(parent_id);
CREATE INDEX IF NOT EXISTS idx_stash_endpoints_stash ON stash_endpoints(stash_id);
"#;

pub const CREATE_CONTEXTS_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS contexts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    variables TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"#;

pub const CREATE_CHRONICLE_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS chronicle_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    request_headers TEXT,
    request_body TEXT,
    response_status INTEGER,
    response_status_text TEXT,
    response_headers TEXT,
    response_body TEXT,
    duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_chronicle_timestamp ON chronicle_logs(timestamp);
"#;

