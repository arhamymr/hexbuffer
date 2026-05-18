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
