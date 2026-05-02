# NetworkSpy-Tauri Feature Specification

> Comprehensive technical specification for the network proxy/sniffer application

## 1. Project Architecture

### 1.1 Overall Structure

```
NetworkSpy-Tauri/
├── src/                          # React Frontend (TypeScript/React)
│   ├── main.tsx                   # Application entry point
│   ├── routes/                   # Page routes
│   ├── packages/                 # Shared UI components
│   │   ├── header/              # Top header with controls
│   │   ├── sidebar/             # Left/Right sidebars
│   │   ├── bottom-pane/          # Request/Response viewer
│   │   ├── main-content/         # Traffic list/table
│   │   ├── filter-bar/           # Traffic filtering UI
│   │   └── ui/                   # Reusable UI components
│   ├── context/                  # React Context providers
│   ├── models/                   # TypeScript interfaces
│   └── utils/                    # Utility functions & atoms
│
├── src-tauri/                   # Rust Backend
│   ├── src/
│   │   ├── main.rs              # Application entry, Tauri setup
│   │   ├── commands.rs          # Tauri IPC command handlers
│   │   ├── proxy_handler.rs     # TrafficListener implementation
│   │   ├── ca_manager.rs        # CA certificate generation
│   │   ├── certificate_installer.rs  # OS certificate installation
│   │   ├── proxy_toggle.rs      # System proxy configuration
│   │   ├── settings.rs          # ProxySettings struct
│   │   ├── breakpoints.rs       # Breakpoint manager
│   │   ├── scripting.rs         # Script manager
│   │   ├── eval.rs              # JavaScript execution engine
│   │   ├── traffic/
│   │   │   ├── db.rs           # SQLite traffic database
│   │   │   ├── tags.rs         # Tag rule management
│   │   │   ├── sessions.rs     # Session management
│   │   │   ├── filter_engine.rs # Traffic filtering logic
│   │   │   ├── har_util.rs     # HAR export/import
│   │   │   └── schema/         # Database schema definitions
│   │   ├── proxy_handlers_functions/
│   │   │   ├── breakpoints.rs  # Breakpoint handling
│   │   │   ├── scripting.rs    # Script execution
│   │   │   └── traffic_updater.rs  # Traffic modification
│   │   ├── mcp/                # MCP server for LLM integration
│   │   └── utils.rs            # Utility functions
│   └── Cargo.toml
│
└── package.json                 # Frontend dependencies
```

### 1.2 Key Files and Responsibilities

| File | Responsibility |
|------|----------------|
| `src-tauri/src/main.rs` | App initialization, proxy startup, tray menu, menu events |
| `src-tauri/src/commands.rs` | All Tauri IPC commands (56 commands) |
| `src-tauri/src/proxy_handler.rs` | TrafficListener - intercepts HTTP requests/responses |
| `src-tauri/src/traffic/db.rs` | SQLite database for traffic storage |
| `src-tauri/src/ca_manager.rs` | Generates root CA certificates |
| `src-tauri/src/certificate_installer.rs` | Installs CA to OS trust store |
| `src-tauri/src/proxy_toggle.rs` | Configures system proxy settings |

### 1.3 Frontend-Backend Communication (Tauri IPC)

**Tauri Events (Backend -> Frontend):**

```rust
// src-tauri/src/utils.rs (lines 76-94)
#[derive(Clone, Serialize)]
pub struct PayloadTraffic {
    pub uri: Option<String>,
    pub method: Option<String>,
    pub version: Option<String>,
    pub body_size: usize,
    pub headers: HashMap<String, String>,
    pub intercepted: bool,
    pub status_code: Option<u16>,
    pub client: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Clone, Serialize)]
pub struct Payload {
    pub id: String,
    pub is_request: bool,
    pub data: PayloadTraffic,
}
```

**Key Events Emitted:**
- `traffic_event` - New request/response captured (line 120 in proxy_handler.rs)
- `tags_updated` - Tags modified by async rules (line 177 in tags.rs)
- `breakpoint_hit` - Breakpoint triggered (line 62 in breakpoints.rs)
- `proxy-status` - Proxy toggle changed

**Frontend Listens via:**
```typescript
// src/routes/home/index.tsx (line 174)
provider.listenTraffic((traffic) => { ... })
```

---

## 2. Proxy/Interception System

### 2.1 Proxy Initialization

**Proxy creation and startup** (`src-tauri/src/main.rs` lines 237-254):
```rust
let mut proxy = Proxy::new(key_pair, ca_cert, current_port.into());
let listener = Arc::new(MyTrafficListener {
    app_handle: app_handle_inner,
    traffic_db: traffic_db_inner,
    tag_manager: tag_manager_inner,
    proxy_settings: proxy_settings_inner,
    request_times: Mutex::new(HashMap::new()),
    tray_stats: tray_stats_deep,
    session_id: uuid::Uuid::new_v4().to_string(),
    breakpoint_manager: breakpoint_manager_outer.clone(),
    script_manager: script_manager_outer.clone(),
});

let listener_task = tauri::async_runtime::spawn(async move {
    proxy.run_proxy(listener, proxy_intercept_list_inner).await;
});
```

**Proxy Port Selection** (lines 204-208):
```rust
let actual_port = (9090..65535)
    .find(|port| std::net::TcpListener::bind(("127.0.0.1", *port)).is_ok())
    .unwrap_or(9090);
```

### 2.2 Traffic Interception Hooks

**MyTrafficListener Implementation** (`src-tauri/src/proxy_handler.rs`):

```rust
// Lines 17-26: TrafficListener trait
#[async_trait]
impl TrafficListener for MyTrafficListener {
    async fn get_client_name(&self, client_addr: &str) -> String {
        let info = traffic::process_info::get_client_info(client_addr);
        // ... returns process name
    }

    // Lines 28-186: Request interception
    async fn request(&self, id: u64, mut request: Request<Bytes>, intercepted: bool, client_addr: String) -> Request<Bytes> {
        // 1. Check if proxy is toggled on
        // 2. Update tray stats (tx_bytes, total_requests)
        // 3. Clean URI (remove redundant ports)
        // 4. Extract headers, body, content-type
        // 5. Sync tagging via TagManager
        // 6. Insert to DB and emit to frontend
        // 7. Run request scripts
        // 8. Handle request breakpoints
        // 9. Apply modifications if any
        // 10. Return (possibly modified) request
    }

    // Lines 188-309: Response interception
    async fn response(&self, id: u64, mut response: Response<Bytes>, intercepted: bool, client_addr: String) -> Response<Bytes> {
        // 1. Check if proxy is toggled on
        // 2. Update tray stats (rx_bytes)
        // 3. Get start time and metadata from request_times
        // 4. Calculate duration
        // 5. Extract headers, body, content-type
        // 6. Async tagging
        // 7. Insert to DB and emit to frontend
        // 8. Run response scripts
        // 9. Handle response breakpoints
        // 10. Apply modifications if any
        // 11. Return (possibly modified) response
    }
}
```

### 2.3 Certificate/CA Management

**CA Generation** (`src-tauri/src/ca_manager.rs` lines 12-67):
```rust
pub fn load_or_generate_ca(app_data_dir: PathBuf) -> Result<CaKeys, String> {
    let ca_dir = app_data_dir.join("ca");

    // Generate with ECDSA P-256 (high compatibility)
    let mut params = CertificateParams::default();
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    params.key_usages = vec![
        KeyUsagePurpose::KeyCertSign,
        KeyUsagePurpose::DigitalSignature,
        KeyUsagePurpose::CrlSign
    ];
    params.not_after = now + TimeDuration::days(3650); // 10 years
    params.alg = &PKCS_ECDSA_P256_SHA256;

    // Name format: "Network Spy CA ({date}, {host}, {uid})"
}
```

**Certificate Installation** (`src-tauri/src/certificate_installer.rs`):
- **macOS**: Uses `security` commands to add to Keychain (lines 291-343)
- **Linux**: Custom scripts via `install_certificate_linux.sh` (lines 345-399)
- **Windows**: PowerShell scripts to add to Certificate Store (lines 401-457)

### 2.4 Key Proxy Files

| File | Lines | Purpose |
|------|-------|---------|
| `proxy_handler.rs` | 310 | TrafficListener implementation |
| `ca_manager.rs` | 68 | CA certificate generation |
| `certificate_installer.rs` | 489 | OS-specific certificate installation |
| `proxy_toggle.rs` | 156 | System proxy configuration |
| `proxy_handlers_functions/breakpoints.rs` | 133 | Breakpoint pause/resume logic |
| `proxy_handlers_functions/scripting.rs` | 96 | Script execution |
| `proxy_handlers_functions/traffic_updater.rs` | 208 | Apply modifications to traffic |

---

## 3. Traffic Data Model

### 3.1 Core Data Structures

**TrafficEvent** (`src-tauri/src/traffic/db.rs` lines 13-40):
```rust
pub enum TrafficEvent {
    Request {
        id: String,
        uri: String,
        method: String,
        version: String,
        headers: HashMap<String, String>,
        body: Vec<u8>,
        content_type: Option<String>,
        content_encoding: Option<String>,
        intercepted: bool,
        client: String,
        tags: Vec<String>,
    },
    Response {
        id: String,
        headers: HashMap<String, String>,
        body: Vec<u8>,
        content_type: Option<String>,
        content_encoding: Option<String>,
        status_code: u16,
    },
    UpdateTags {
        id: String,
        tags: Vec<String>,
    },
    Exit,
}
```

**TrafficMetadata** (lines 520-535):
```rust
pub struct TrafficMetadata {
    pub id: String,
    pub uri: Option<String>,
    pub method: Option<String>,
    pub version: Option<String>,
    pub req_headers: Option<String>,  // JSON serialized
    pub res_headers: Option<String>, // JSON serialized
    pub status_code: Option<i32>,
    pub intercepted: bool,
    pub timestamp: String,
    pub req_body_size: usize,
    pub res_body_size: usize,
    pub client: Option<String>,
    pub tags: Vec<String>,
}
```

**RequestResponseData** (lines 537-557):
```rust
pub struct RequestResponseData {
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
    pub content_type: String,
    pub content_encoding: Option<String>,
    pub status_code: Option<i32>,
}
```

**BreakpointData** (`src-tauri/src/breakpoints.rs` lines 7-15):
```rust
pub struct BreakpointData {
    pub id: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
    pub method: Option<String>,
    pub uri: Option<String>,
    pub status_code: Option<u16>,
}
```

### 3.2 Database Schema

**SQLite Tables** (`src-tauri/src/traffic/schema/traffic.rs` lines 3-61):

```sql
-- Main traffic metadata
CREATE TABLE traffic (
    id TEXT PRIMARY KEY,
    uri TEXT,
    method TEXT,
    version TEXT,
    client TEXT,
    req_headers TEXT,    -- JSON
    res_headers TEXT,    -- JSON
    status_code INTEGER,
    intercepted INTEGER DEFAULT 1,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Body storage (compressed with ZSTD)
CREATE TABLE body (
    traffic_id TEXT PRIMARY KEY,
    req_body BLOB,
    res_body BLOB,
    req_content_type TEXT,
    req_content_encoding TEXT,
    res_content_type TEXT,
    res_content_encoding TEXT
);

-- Proxy intercept rules
CREATE TABLE proxy_rules (
    id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    name TEXT,
    pattern TEXT,
    client TEXT,
    action TEXT  -- 'INTERCEPT' or 'TUNNEL'
);

-- Indexes
CREATE INDEX idx_traffic_timestamp ON traffic(timestamp);
CREATE INDEX idx_traffic_uri ON traffic(uri);
CREATE INDEX idx_traffic_method ON traffic(method);
```

### 3.3 Body Compression

**ZSTD Compression** (`src-tauri/src/traffic/db.rs` lines 324-335):
```rust
let body_data = if !body.is_empty() {
    match zstd::encode_all(&body[..], 3) {
        Ok(compressed) => {
            let mut final_data = b"ZSTD".to_vec();
            final_data.extend_from_slice(&compressed);
            Some(final_data)  // Prefixed with "ZSTD" magic bytes
        }
        Err(_) => Some(body),
    }
} else {
    None
};
```

**Decompression** (lines 106-112 in schema/traffic.rs):
```rust
let bytes = data.map(|bytes| {
    if bytes.starts_with(b"ZSTD") {
        zstd::decode_all(&bytes[4..]).unwrap_or(bytes)
    } else {
        bytes
    }
}).unwrap_or_default();
```

### 3.4 Traffic Storage/Retrieval

**Background Writer Thread** (`src-tauri/src/traffic/db.rs` lines 78-119):
```rust
// Batched writes every 200 items or 100ms
thread::spawn(move || {
    let mut buffer = Vec::with_capacity(200);
    let mut last_flush = Instant::now();

    loop {
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(event) => {
                update_memory_cache(&recent_traffic_clone, &event);
                buffer.push(event);
                if buffer.len() >= 200 {
                    flush_buffer(&mut conn, &mut buffer);
                }
            }
            Err(_) => {  // timeout
                if !buffer.is_empty() && last_flush.elapsed() >= Duration::from_millis(100) {
                    flush_buffer(&mut conn, &mut buffer);
                }
            }
        }
    }
});
```

**Memory Cache Update** (lines 480-518):
- Requests added to front of deque (most recent first)
- Responses update matching request in cache
- Tags update when `UpdateTags` event received
- Max 10,000 entries

---

## 4. Frontend Components

### 4.1 Traffic List/Table View

**MainContent** (`src/packages/main-content/MainContent.tsx`):
- Virtual scrolling table via `@tanstack/react-virtual`
- Columns: URL, Method, Status, Size, Time, Duration, Tags
- Row selection (single & multi-select via checkboxes)

**TrafficItemMap** (`src/packages/main-content/model/TrafficItemMap.ts`):
```typescript
export interface TrafficItemMap {
    id: string;
    tags: string[];
    url: string;
    client: string;
    method: string | null;
    code: string;
    time: string;
    duration: string;
    request: string;
    response: string;
    performance: any;
    intercepted: boolean;
    timestamp: number;
}
```

### 4.2 Filter Bar System

**FilterProvider** (`src/context/FilterContext.tsx`):
- **FilterNode** structure supports AND/OR groups
- **FilterRule** has: type, operator, value, enabled
- Supported filter types: URL, METHOD, STATUS, CLIENT, CODE, TIME, DURATION, REQUEST_SIZE, RESPONSE_SIZE, PERFORMANCE, SSL, TAGS, ID
- Supported operators: CONTAINS, NOT_CONTAINS, EQUALS, NOT_EQUALS, STARTS_WITH, ENDS_WITH, MATCHES_REGEX, GREATER_THAN, LESS_THAN, AFTER, BEFORE
- Unit-aware parsing for sizes (kb, mb, gb), durations (ms, s, m, h), timestamps

### 4.3 Bottom Pane (Request/Response Tabs)

**BottomPane** (`src/packages/bottom-pane/BottomPane.tsx`):
- Horizontal or vertical split layout
- Tab bar for Request/Response/Headers/Info views
- Action bar for interception controls

**Tab Renderers** (`src/packages/bottom-pane/TabRenderer/`):
- `CodeView.tsx` - Syntax highlighted code
- `JSONView.tsx` - JSON tree view with expansion
- `XMLView.tsx` - XML syntax highlighting
- `ImageView.tsx` - Image preview
- `HexView.tsx` - Hex dump viewer
- `TreeView.tsx` - Hierarchical tree view
- `HTMLView.tsx` / `HTMLWebView.tsx` - HTML rendering
- `FormURLEncodedView.tsx` - URL form parameters
- `MultipartFormDataView.tsx` - Multipart form data
- `CMLView.tsx` - Custom language viewer
- `M3U8View.tsx` - M3U8 playlist viewer
- `ProtobufView.tsx` - Protocol buffers
- `MessagePackView.tsx` - MessagePack format

### 4.4 Body Viewers (Single Traffic)

Multiple viewer modes in `src/packages/bottom-pane/BottomPaneComponents/Single/`:
- `RequestResponseMode.tsx` - Standard request/response view
- `JSONTreeMode.tsx` - JSON tree with search
- `LLMViewer/` - LLM-specific views (prompt, response, streaming, token analyzer)
- `GraphQLMode/` - GraphQL request/response/variables/docs
- `ImageViewerMode.tsx` - Image preview
- `VideoViewerMode.tsx` - Video playback
- `HexViewerMode.tsx` - Hex dump
- `JWTDecoderMode.tsx` - JWT decode
- `SourceViewerMode.tsx` - Raw source code
- `HeaderExplainerMode.tsx` - HTTP header explanations
- `SensitiveDataMode.tsx` - PII detection
- `OWASPMode.tsx` - Security analysis
- `ReplayMode.tsx` - Request replay
- `CurlMode.tsx` - cURL command generation

### 4.5 Context Providers and State Management

**Provider Hierarchy** (`src/main.tsx` lines 142-169):
```tsx
<AnalyticsProvider>
  <TauriProvider>
    <UpgradeProvider>
      <TagProvider>
        <SessionProvider>
          <ViewerProvider>
            <SettingsProvider>
              <FilterPresetProvider>
                <TrafficListProvider>
                  <TauriEnvProvider>
                    <PaneProvider>
                      <DndProvider>
                        <RouterProvider router={router} />
                      </DndProvider>
                    </PaneProvider>
                  </TauriEnvProvider>
                </TrafficListProvider>
              </FilterPresetProvider>
            </SettingsProvider>
          </ViewerProvider>
        </SessionProvider>
      </TagProvider>
    </UpgradeProvider>
  </TauriProvider>
</AnalyticsProvider>
```

**Key Contexts:**
- `TrafficListContext` - Traffic items and selections
- `FilterContext` - Active filters and filtering logic
- `BottomPaneContext` - Bottom pane mode and selection type
- `SettingsContext` - UI settings and pane sizes
- `SessionContext` - Current session state
- `TagContext` - Tag rule management
- `ViewerContext` - Custom viewer builder state

---

## 5. Key Features

### 5.1 Traffic Filtering

**FilterEngine** (`src-tauri/src/traffic/filter_engine.rs`):
```rust
impl FilterEngine {
    pub fn matches_preset(metadata: &TrafficMetadata, filters: &Value) -> bool {
        // Top-level nodes joined with AND
        for node in nodes {
            if !Self::matches_node(metadata, node) {
                return false;
            }
        }
        true
    }

    fn matches_node(metadata: &TrafficMetadata, node: &Value) -> bool {
        // Group: evaluate children with AND/OR logic
        // Non-group: call matches_rule
    }

    fn matches_rule(metadata: &TrafficMetadata, rule: &Value) -> bool {
        // Extract type, operator, value
        // Get target value from metadata
        // Apply operator comparison
    }
}
```

### 5.2 Traffic Tagging

**TagManager** (`src-tauri/src/traffic/tags.rs`):

**TagRule Structure** (lines 9-23):
```rust
pub struct TagRule {
    pub id: String,
    pub enabled: bool,
    pub name: String,
    pub method: String,           // "ALL" or specific method
    pub matching_rule: String,    // Glob pattern (comma-separated)
    pub tag: String,
    pub is_sync: bool,            // true=sync, false=async (body content)
    pub scope: String,            // "metadata" or "body"
    pub color: Option<String>,
    pub bg_color: Option<String>,
    pub folder_id: Option<String>,
}
```

**Sync vs Async Tagging:**
- **Sync**: Applied immediately in `sync_tagging()` using glob patterns
- **Async**: Applied in background via `async_tagging()` with `tokio::task::spawn_blocking`
- Tags stored in `tag_rules` table, rules reloaded on changes

### 5.3 Session Management

**SessionManager** (`src-tauri/src/traffic/sessions.rs`):

**Session Structure** (lines 10-18):
```rust
pub struct Session {
    pub id: String,
    pub name: String,
    pub folder_id: Option<String>,
    pub created_at: String,
    pub db_file: String,  // Path to .db file
}
```

**Operations:**
- `save_capture()` - Copy live traffic.db to sessions folder
- `import_har()` - Create new DB from HAR file
- `export_session_data()` - Export to HAR/CSV/SQLite
- `get_session_traffic()` - Load traffic from saved session DB

### 5.4 Breakpoints

**BreakpointManager** (`src-tauri/src/breakpoints.rs`):
```rust
pub struct BreakpointManager {
    pub is_enabled: Arc<AtomicBool>,
    pub paused_tasks: Arc<RwLock<HashMap<String, PausedTask>>>,
}

pub struct PausedTask {
    pub sender: tokio::sync::oneshot::Sender<Option<BreakpointData>>,
    pub name: String,
    pub data: BreakpointData,
}
```

**Breakpoint Hit Flow** (`proxy_handlers_functions/breakpoints.rs` lines 36-66):
1. Match rule's glob pattern and method
2. Create oneshot channel
3. Store task in `paused_tasks` map
4. Emit `breakpoint_hit` event to frontend
5. Await response via channel
6. Return modified data (or original if no modification)

### 5.5 Scripting

**JavaScript Execution** (`src-tauri/src/eval.rs`):

```rust
pub fn run_script(script: &str, mut data: BreakpointData) -> Result<BreakpointData, String> {
    // 1. Create boa Engine context
    let mut context = Context::default();

    // 2. Register console.log/warn/error
    let console = ObjectInitializer::new(&mut context)...
    context.register_global_property(JsString::from("console"), console, ...);

    // 3. Create request/response objects
    let request_json = serde_json::json!({
        "headers": data.headers,
        "body": body_str,
        "method": data.method,
        "uri": data.uri
    });

    // 4. Execute script with wrapper
    let script_wrapper = format!(
        "var request = {}; var response = {}; \n{}\n \
         if (typeof script === 'function') {{ ... }}",
        request_json, response_json, script
    );

    // 5. Parse result and extract modifications
}
```

**Script Matching** (`eval.rs` lines 121-143):
```rust
pub fn matches_breakpoint(uri: &str, method: &str, rule_pattern: &str, rule_method: &str) -> bool {
    // Check method (ALL matches any)
    // Check URI via glob pattern matching
}
```

### 5.6 HAR Export/Import

**HAR Structures** (`src-tauri/src/traffic/har_util.rs`):
```rust
pub struct HarLog {
    pub log: HarContent,
}

pub struct HarContent {
    pub version: String,
    pub creator: HarCreator,
    pub entries: Vec<HarEntry>,
}

pub struct HarEntry {
    pub started_date_time: String,
    pub time: f64,
    pub request: HarRequest,
    pub response: HarResponse,
    pub cache: HashMap<String, String>,
    pub timings: HarTimings,
}
```

**Export** (lines 123-203):
- Converts traffic tuples to HAR format
- Response body base64 encoded if binary
- POST data preserved

**Import** (`commands.rs` lines 438-554):
- Parse HAR JSON
- Create `TrafficEvent::Request` and `TrafficEvent::Response` for each entry
- Emit `traffic_event` for each item

### 5.7 MCP Server Integration

**MCP Server** (`src-tauri/src/mcp/mod.rs`):

**HTTP Server** (lines 82-132):
```rust
pub fn spawn_mcp_server(app_handle: AppHandle) {
    // HTTP server on configurable port (default 3001)
    // Routes:
    //   GET  /mcp - NDJSON streaming endpoint
    //   POST /mcp - Direct JSON-RPC
    //   POST /messages?session_id={id} - Session-bound POST
}
```

**Stdio Transport** (lines 134-159):
- Reads JSON-RPC from stdin
- Writes responses to stdout
- Enabled via `mcp_stdio_enabled` setting

**Tool Handlers** (lines 272-289):
- `get_traffic_list` - List traffic with filtering
- `get_traffic_details` - Full request/response data
- `list_filter_presets` / `save_filter_preset` / `delete_filter_preset`
- `list_scripts` / `save_script` / `delete_script`
- `list_breakpoints` / `save_breakpoint` / `delete_breakpoint`

---

## 6. Command API

### 6.1 All Tauri Commands

**From `src-tauri/src/commands.rs`:**

| Command | Signature | Purpose |
|---------|-----------|---------|
| `get_proxy_settings` | `() -> ProxySettings` | Get current proxy settings |
| `update_proxy_settings` | `(new_settings: ProxySettings) -> ()` | Update proxy settings |
| `update_intercept_proxy_intercept_list` | `(new_list: Vec<ProxyRule>) -> ()` | Update intercept rules |
| `greet` | `(name: &str) -> String` | Test command |
| `set_breakpoint_enabled` | `(enabled: bool) -> ()` | Enable/disable breakpoints |
| `get_breakpoint_enabled` | `() -> bool` | Get breakpoint state |
| `set_script_enabled` | `(enabled: bool) -> ()` | Enable/disable scripts |
| `get_script_enabled` | `() -> bool` | Get script state |
| `resume_breakpoint` | `(traffic_id: String, modified_data: Option<BreakpointData>) -> ()` | Resume paused traffic |
| `get_paused_data` | `(id: String) -> BreakpointData` | Get paused breakpoint data |
| `get_paused_breakpoints` | `() -> Vec<BreakpointHit>` | List active breakpoints |
| `get_breakpoints` | `() -> Vec<BreakpointRule>` | Get all breakpoint rules |
| `save_breakpoint` | `(rule: BreakpointRule) -> ()` | Save breakpoint rule |
| `delete_breakpoint` | `(id: String) -> ()` | Delete breakpoint rule |
| `get_scripts` | `() -> Vec<ScriptRule>` | Get all script rules |
| `save_script` | `(rule: ScriptRule) -> ()` | Save script rule |
| `delete_script` | `(id: String) -> ()` | Delete script rule |
| `get_proxy_rules` | `() -> Vec<ProxyRule>` | Get proxy intercept rules |
| `save_proxy_rule` | `(rule: ProxyRule) -> ()` | Save proxy rule |
| `delete_proxy_rule` | `(id: String) -> ()` | Delete proxy rule |
| `turn_on_proxy` | `() -> u16` | Enable system proxy |
| `turn_off_proxy` | `()` | Disable system proxy |
| `change_proxy_port` | `(port: u16) -> u16` | Change proxy port |
| `get_app_data_dir` | `() -> PathBuf` | Get app data directory |
| `install_certificate` | `(cert_path: String) -> String` | Install certificate from file |
| `auto_install_certificate` | `() -> String` | Auto-install from default CA |
| `uninstall_certificate` | `() -> String` | Remove certificate |
| `open_new_window` | `(context: String, title: String) -> ()` | Open new window |
| `get_recent_traffic` | `(limit: usize) -> Vec<TrafficMetadata>` | Get recent traffic |
| `get_all_metadata` | `(limit: Option<usize>) -> Vec<TrafficMetadata>` | Get all traffic metadata |
| `get_filter_presets` | `() -> Vec<FilterPreset>` | Get filter presets |
| `add_filter_preset` | `(preset: FilterPreset) -> ()` | Add filter preset |
| `update_filter_preset` | `(id, name?, desc?, filters?) -> ()` | Update preset |
| `delete_filter_preset` | `(id: String) -> ()` | Delete preset |
| `save_session` | `(path: String) -> ()` | Save current traffic to HAR |
| `export_selected_to_har` | `(path: String, ids: Vec<String>) -> ()` | Export selected to HAR |
| `export_selected_to_csv` | `(path: String, ids: Vec<String>) -> ()` | Export to CSV |
| `export_selected_to_sqlite` | `(path: String, ids: Vec<String>) -> ()` | Export to SQLite |
| `load_session` | `(path: String) -> ()` | Import HAR file |
| `validate_filter_preset_command` | `(preset: Value) -> ()` | Validate filter preset JSON |

### 6.2 Session Commands

**From `src-tauri/src/traffic/sessions.rs` lines 278-470:**

| Command | Purpose |
|---------|---------|
| `get_saved_sessions` | List all saved sessions |
| `get_session_folders` | List session folders |
| `create_session_folder` | Create new folder |
| `delete_session_folder` | Delete folder |
| `rename_session_folder` | Rename folder |
| `move_session_to_folder` | Move session between folders |
| `delete_saved_session` | Delete session and DB file |
| `save_current_capture` | Save live traffic as session |
| `save_capture_to_folder` | Save to specific folder |
| `import_session_from_har` | Import HAR as new session |
| `import_session_to_folder` | Import HAR to folder |
| `get_session_traffic` | Get traffic from saved session |
| `export_session_data` | Export session to HAR/CSV/SQLite |
| `get_session_request_data` | Get request body for session |
| `get_session_response_data` | Get response body for session |

### 6.3 Tag Commands

**From `src-tauri/src/traffic/tags.rs` lines 196-400:**

| Command | Purpose |
|---------|---------|
| `get_tags_from_db` | Get all tag rules |
| `add_tag_to_db` | Create new tag rule |
| `update_tag_in_db` | Update tag rule |
| `delete_tag_from_db` | Delete tag rule |
| `toggle_tag_in_db` | Enable/disable single tag |
| `toggle_folder_in_db` | Enable/disable all tags in folder |
| `move_tag_to_folder` | Move tag to different folder |
| `get_tag_folders` | List tag folders |
| `add_tag_folder` | Create tag folder |
| `rename_tag_folder` | Rename folder |
| `delete_tag_folder_from_db` | Delete folder |

---

## 7. Settings & Configuration

### 7.1 ProxySettings

**Structure** (`src-tauri/src/settings.rs` lines 6-18):
```rust
pub struct ProxySettings {
    pub stream_certificate_logs: bool,  // Show cert install logs
    pub mcp_stdio_enabled: bool,         // Enable MCP stdio
    pub mcp_http_enabled: bool,          // Enable MCP HTTP server
    pub mcp_http_port: u16,              // MCP HTTP port (default 3001)
    pub device_id: String,               // Unique device ID
}
```

**Managed State** (lines 34-35):
```rust
pub struct ManagedProxySettings(pub Arc<StdRwLock<ProxySettings>>);
pub struct InterceptAllowList(pub Arc<AsyncRwLock<Vec<network_spy_proxy::ProxyRule>>>);
```

### 7.2 UI State Management

**Settings Context** (`src/context/SettingsProvider.tsx`):
- Stores pane sizes in localStorage
- Theme preferences
- Proxy port display
- Window sizes (main, bottom pane, sidebars)

**PaneProvider** (`src/context/PaneProvider.tsx`):
```typescript
interface PaneContextState {
  isDisplayPane: {
    bottom: boolean;
    right: boolean;
    centerLayout: "horizontal" | "vertical";
  };
  setIsDisplayPane: ...
}
```

---

## 8. Code Index

### 8.1 Rust Backend Files

| File | Lines | Key Contents |
|------|-------|--------------|
| `src-tauri/src/main.rs` | ~300 | App entry, proxy init, tray, menu events |
| `src-tauri/src/commands.rs` | ~600 | 56 Tauri commands |
| `src-tauri/src/proxy_handler.rs` | 310 | MyTrafficListener impl |
| `src-tauri/src/traffic/db.rs` | 600+ | TrafficDb, background writer |
| `src-tauri/src/traffic/schema/traffic.rs` | 150+ | SQL schema, CRUD |
| `src-tauri/src/traffic/filter_engine.rs` | 150+ | Filter matching logic |
| `src-tauri/src/traffic/tags.rs` | 400+ | TagManager, tag rules |
| `src-tauri/src/traffic/sessions.rs` | 500+ | SessionManager |
| `src-tauri/src/traffic/har_util.rs` | 300+ | HAR export/import |
| `src-tauri/src/breakpoints.rs` | 150+ | BreakpointManager |
| `src-tauri/src/scripting.rs` | 100+ | ScriptManager |
| `src-tauri/src/eval.rs` | 200+ | JavaScript execution |
| `src-tauri/src/ca_manager.rs` | 68 | CA generation |
| `src-tauri/src/certificate_installer.rs` | 489 | OS cert installation |
| `src-tauri/src/proxy_toggle.rs` | 156 | System proxy toggle |
| `src-tauri/src/settings.rs` | 50+ | ProxySettings |
| `src-tauri/src/mcp/mod.rs` | 300+ | MCP server |
| `src-tauri/src/mcp/traffic.rs` | 200+ | MCP traffic tools |

### 8.2 Frontend Files

| File/Directory | Purpose |
|------|---------|
| `src/main.tsx` | App entry, provider hierarchy |
| `src/routes/` | Page components |
| `src/packages/main-content/` | Traffic list table |
| `src/packages/filter-bar/` | Filter UI |
| `src/packages/bottom-pane/` | Request/response viewer |
| `src/packages/ui/TableView/` | Virtualized table |
| `src/context/` | React context providers |
| `src/models/` | TypeScript interfaces |

---

## Summary

This specification covers all major architectural aspects of NetworkSpy-Tauri:

1. **Architecture**: Rust backend (Tauri) + React frontend with TypeScript, using SQLite for persistence and async Rust for concurrency

2. **Proxy System**: Custom `TrafficListener` implementation captures HTTP traffic, with support for HTTPS MITM via generated CA certificates, decompression of encoded bodies, and modification hooks

3. **Data Model**: Event-driven traffic storage with ZSTD compression, in-memory caching, background writer thread, and comprehensive metadata

4. **Frontend**: Multi-pane layout with virtual scrolling traffic list, complex filter system with tree-based filter nodes, multiple body viewers for different content types

5. **Features**: Traffic filtering, tagging rules (sync/async), session save/load, breakpoints with pause/resume, JavaScript scripting via Boa engine, HAR export/import, MCP server for LLM integration

6. **Commands**: 50+ Tauri IPC commands covering all functionality

7. **Settings**: Persisted proxy settings, UI state, and system proxy toggle for macOS/Linux/Windows
