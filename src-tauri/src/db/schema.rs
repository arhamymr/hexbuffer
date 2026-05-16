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