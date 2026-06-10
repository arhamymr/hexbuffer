# AppRecon Capabilities


## 3. Browser

**Path:** `src/pages/browser/`

4-panel resizable layout: Crawl Tree | Page Detail | AI Insights | Action Log

### Setup & Configuration
- Target URL input; strategy (BFS); max depth; max pages; same-domain toggle; exclude paths; request delay; timeout
- AI insights toggle; network settle time; capture screenshots; capture rendered HTML; headless toggle
- Save config

### Crawl Controls
- Start (Headless) / Start Visible dropdown; Pause; Resume; Stop
- Safety alert (dismissable) warning about unauthorized scanning
- Proxy status check: shows alert if proxy not connected

### Crawl Tree Panel
- Hierarchical tree of crawled pages with status markers (queued, current, visited, error, blocked)

### AI Insights Panel
- AI-generated findings with severity levels: info, low, medium, high, critical
- Insight types: authentication, login-form, upload-form, admin-route, hidden-route, and more

### Action Log Panel
- Chronological log with types: session, navigation, extraction, ai, human, policy, error, queue
- Clearable; searchable globally across pages, logs, and insights

### Data Operations
- Session statistics overview; JSON export via `downloadJson`
- Real-time Tauri event streaming for all crawl events

---

## 5. Documents

**Path:** `src/pages/documents/`

Tabbed layout with toolbar + workspace (explorer sidebar + editor pane)

### Document Templates
- 4 templates: Blank, Developer, QA, Security Researcher
- Each has predefined sections (scope, targetsDiscovered, dnsData, etc.) plus custom sections

### Tab Management
- Create, rename, close documents; add new document via template dialog

### Toolbar
- Document title editing; markdown mode toggle (edit/preview); export PDF; new document

### Workspace
- **Explorer**: file tree with API folder, custom sections, built-in sections
- **API Entries**: saved API request/response entries with method, URL, host, headers, body, status; add/delete/edit; fetch API response
- **Custom Sections**: create, rename, reorder, remove
- **Document Editor**: Milkdown rich markdown editor + markdown preview

### Built-in Sections
scope, targetsDiscovered, dnsData, hostsAndServices, webObservations, endpoints, authenticationDetails, usersAndOrgInfo, potentialVulnerabilities, evidence

---

## 6. Inspector

**Path:** `src/pages/inspector/`

3-panel resizable layout: Pages Sidebar | Console/Network/Storage | Detail Panel

### Connection Management
- Start Listening (connect CDP), Stop (disconnect), Reset browser
- Connection status indicator (green dot)

### Pages Sidebar
- List of browser tab pages

### Console Panel
- Log entries with level filters: All, Log, Info, Warn, Error, Page Error
- Color-coded log levels

### Network Panel
- List of network requests: method, URL, status, resource type, size, time

### Storage Panel
- Browser cookies and localStorage entries

### Detail Panel
- Full detail of selected console log or network entry

### Export
- Export console logs and network data

---

## 7. Intercept

**Path:** `src/pages/intercept/`

2-panel resizable layout: Request Panel | Intercept Queue

### Tab Management
- Create tabs, rename, close, close tabs to left/right
- Each tab has its own capture hosts scope

### Request Panel
- Intercept toggle switch (enable/disable)
- Monaco-based raw request editor (editable when a request is selected)
- Toggle between "Raw Request" and "Raw Response" views

### Intercept Queue
- List of paused requests with method badge, URL, timestamp, client/server addresses
- **Actions**: FORWARD (selected), Refresh
- **Context menu per request**: Intercept Response, Forward (this item), Drop, Don't Capture (adds host to exclusion)
- Stats: request count and response count

### Bypass Panel
- Manage bypass patterns (glob/host patterns to skip interception)

### Proxy Status
- Alert to start proxy if disconnected

---

## 8. Invoker

**Path:** `src/pages/invoker/`

2-panel resizable layout: Config Panel | Results Panel

### Attack Configuration
- **Request Tab**: Monaco raw HTTP request editor; payload position marking with `§...§`
- **Attack Tab**: attack mode (Sniper); concurrency; delay (ms); retries; grep match keywords; grep extract regex; session handling
- **Payloads Tab**: payload type (SimpleList, RuntimeFile, NumberRange); file loading; number range config; processing pipeline (UrlEncode, UrlDecode, Base64Encode, Base64Decode, Md5Hash, Sha1Hash, Sha256Hash)

### Controls
- Start button with validation (URL required, positions marked, payloads loaded)
- Stop button with running indicator
- Progress badge (current/total); visual progress bar

### Results Panel
- Filterable table: payload values, status, response length, response time, error, comment, grep match
- Click row to open detail drawer with full request/response (raw and rendered views)

### Payload Management
- Load from file (.txt, .lst, .wordlist) via Tauri file dialog
- Dedicated payload dialog for managing lists

---

## 10. Live Traffic

**Path:** `src/pages/live-traffic/`

Tabbed layout with target-scoped tabs + filter bar + history/websocket view toggle

### Target Tabs
- "All History" tab + per-target tabs; scope-based filtering
- Context menu: "Send scope to Documents"

### Mode Toggle
- Switch between HTTP History and WebSocket History

### HTTP History View
- **Traffic Table**: paginated list of HTTP requests (method, URL, status, size, content type, timestamp); sortable; column visibility; context menu per row (copy URL, copy as cURL, delete, add to intercept, send to repeater, etc.)
- **Log Entry Detail**: Burp-style request/response inspector with raw, headers, body tabs; JSON detail drawer
- **Filters**: search input; method toggles (GET, POST, PUT, etc.); status code toggles (2xx, 3xx, 4xx, 5xx); target selector dialog; pause/resume stream; refresh; clear history

### WebSocket History View
- **Connections Table**: URL, state, message count, last activity
- **WebSocket Entry View**: connection detail with handshake info + message list; real-time message streaming

### Streaming
Real-time event listening via Tauri `proxy-record` and `websocket-connection` events with debounced refresh

---

## 12. Repeater

**Path:** `src/pages/repeater/`

2-panel resizable layout: Request Panel | Response Panel (HTTP mode)

### Tab Management
Create, rename, close tabs; close tabs to left/right

### HTTP Mode
- **Request Panel**: Monaco-based raw HTTP request editor; method/URL display; Send button with loading state
- **Response Panel**: status code/text, response time, final URL; rendered response with tabs (raw, headers, body)

### WebSocket Mode
- WebSocket handshake request editor; connect/disconnect
- Send messages; message log with direction indicators

### Send Flow
Parses raw request, sends via backend, displays response (status, headers, body, time, final URL)

---

## 14. Tools

**Path:** `src/pages/tools/`

Tabbed layout with 5 tool tabs

### Encoder / Decoder
- Encode/decode mode toggle; codec type selection (URL, Base64, Hex)
- Input textarea; live output with error display; copy output; clear; swap input/output

### Hash
- 11 hash algorithms: MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-224, SHA3-256, SHA3-384, SHA3-512, RIPEMD-160
- Input textarea; live hash output; copy hash; clear

### Comparer
- Two text inputs (A and B); diff modes: Lines, Words, Chars
- Side-by-side diff view with added/removed highlighting (green/red)
- Swap inputs; copy diff as unified text; clear

### Port Scanner
- Target input; port presets (Quick, Web, Top 100, Full 1-65535, Custom)
- Configurable timeout, concurrency; banner grabbing toggle
- Start/Stop scan; results table (host, port, state, service, banner, response time)
- Copy results; export to CSV/JSON; real-time progress via Tauri events

### Script Analyzer
- Paste shell script; analyze button
- Results: meta (shebang, total lines, functions, variables, pipes, heredocs)
- Insights categorized by severity (critical, high, medium, low, info) across 22 categories (network, filesystem, privilege-escalation, code-execution, hardcoded-secret, unsafe-pattern, etc.)
- Command usage statistics; variable analysis; URL extraction
- Expandable insight cards with evidence and line numbers

---

## Cross-Cutting Patterns

### State Management
Zustand stores used throughout: `useAutomationStore`, `useBrowserAutomationStore`, `useDebuggerStore`, `useInspectorStore`, `useInterceptStore` (with `persist` middleware to localStorage), `useInvokerStore`, `useListenerStore`, `usePacketCaptureStore`, `useRepeaterStore`, `useHistoryQueryStore`, `useDocumentsStore`, `useAppStore`, `useTargetStore`, `useToolsStore`

### Tab Management
`useTabState` hook provides reusable tab creation, renaming, closing, and close-left/close-right across multiple pages

### Tauri Backend Integration
- `invoke` from `@tauri-apps/api/core` for backend commands
- `listen` from `@tauri-apps/api/event` for real-time streaming (proxy records, WebSocket messages, crawl events, packet capture, port scanning, CDP events)
- `@tauri-apps/plugin-dialog` for file dialogs; `@tauri-apps/plugin-fs` for file reads
