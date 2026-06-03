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
    api_entries TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
"#;

pub const CREATE_PACKET_CAPTURE_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS captures (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    interface_id TEXT NOT NULL,
    interface_label TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT NOT NULL,
    packet_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS packets (
    id TEXT PRIMARY KEY,
    capture_id TEXT NOT NULL,
    packet_number INTEGER NOT NULL,
    timestamp REAL NOT NULL,
    relative_time REAL NOT NULL,
    source_ip TEXT NOT NULL,
    destination_ip TEXT NOT NULL,
    protocol TEXT NOT NULL,
    source_port INTEGER,
    destination_port INTEGER,
    packet_length INTEGER NOT NULL,
    info TEXT NOT NULL,
    raw_line TEXT NOT NULL,
    raw_data BLOB NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(capture_id) REFERENCES captures(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    capture_id TEXT NOT NULL,
    source_ip TEXT NOT NULL,
    source_port INTEGER,
    destination_ip TEXT NOT NULL,
    destination_port INTEGER,
    protocol TEXT NOT NULL,
    first_seen REAL NOT NULL,
    last_seen REAL NOT NULL,
    packet_count INTEGER NOT NULL DEFAULT 0,
    total_bytes INTEGER NOT NULL DEFAULT 0,
    incomplete INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(capture_id) REFERENCES captures(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS packet_http_requests (
    id TEXT PRIMARY KEY,
    capture_id TEXT NOT NULL,
    connection_id TEXT,
    packet_id TEXT,
    method TEXT NOT NULL,
    host TEXT,
    url TEXT NOT NULL,
    headers TEXT,
    body_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(capture_id) REFERENCES captures(id) ON DELETE CASCADE,
    FOREIGN KEY(connection_id) REFERENCES connections(id) ON DELETE SET NULL,
    FOREIGN KEY(packet_id) REFERENCES packets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS packet_http_responses (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    capture_id TEXT NOT NULL,
    connection_id TEXT,
    packet_id TEXT,
    status_code INTEGER NOT NULL,
    status_text TEXT,
    headers TEXT,
    body_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(request_id) REFERENCES packet_http_requests(id) ON DELETE SET NULL,
    FOREIGN KEY(capture_id) REFERENCES captures(id) ON DELETE CASCADE,
    FOREIGN KEY(connection_id) REFERENCES connections(id) ON DELETE SET NULL,
    FOREIGN KEY(packet_id) REFERENCES packets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS packet_bodies (
    id TEXT PRIMARY KEY,
    capture_id TEXT NOT NULL,
    packet_id TEXT,
    content_type TEXT,
    encoding TEXT,
    raw_body BLOB NOT NULL,
    decoded_body TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(capture_id) REFERENCES captures(id) ON DELETE CASCADE,
    FOREIGN KEY(packet_id) REFERENCES packets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_captures_started_at ON captures(started_at);
CREATE INDEX IF NOT EXISTS idx_packets_capture_number ON packets(capture_id, packet_number);
CREATE INDEX IF NOT EXISTS idx_packets_protocol ON packets(protocol);
CREATE INDEX IF NOT EXISTS idx_packets_source ON packets(source_ip, source_port);
CREATE INDEX IF NOT EXISTS idx_packets_destination ON packets(destination_ip, destination_port);
CREATE INDEX IF NOT EXISTS idx_connections_capture ON connections(capture_id);
CREATE INDEX IF NOT EXISTS idx_packet_http_requests_capture ON packet_http_requests(capture_id);
CREATE INDEX IF NOT EXISTS idx_packet_http_responses_capture ON packet_http_responses(capture_id);
CREATE INDEX IF NOT EXISTS idx_packet_bodies_capture ON packet_bodies(capture_id);
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
