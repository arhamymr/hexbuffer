# AppRecon Capabilities

This document outlines the capabilities and pages available in AppRecon, mapping their paths in the codebase to their features and structures.

---

## 1. Overview

**Path:** `src/pages/overview/`

The main landing page and command center of AppRecon.

### Features
- **Launchpad**: Desktop-like icon grid for opening and searching available features.
- **Clock Widget**: Real-time local clock display.
- **Collections Widget**: Status summary of active workspaces and collections.
- **Proxy Widget**: Real-time proxy status indicator with toggle controls.
- **Scratchpad Widget**: A quick, persistent notepad for security notes and snippets.

---

## 2. HTTP History

**Path:** `src/pages/http-history/` (shares core services with `src/pages/live-traffic/`)

A comprehensive log of all HTTP/HTTPS requests processed through the MITM proxy.

### Features
- **Traffic Grid**: Paginated table rendering Method, URL, Status, Size, Content-Type, and Timestamp.
- **Filters & Search**: Filter by HTTP methods, status code ranges, custom search text, and destination host scopes.
- **Control Bar**: Stream controls (Pause/Resume), Refresh logs, and Clear History.
- **Log Inspector**: Tabbed details drawer displaying:
  - Raw request/response data.
  - Parsed headers and query parameters.
  - Form-data, JSON, and multi-format body viewers.
- **Integrations**: Context menus to send requests directly to Repeater, Invoker, or Documents.

---

## 3. WebSocket History

**Path:** `src/pages/websocket-history/` (shares core services with `src/pages/live-traffic/`)

A dedicated history of all WebSocket connections and downstream/upstream frames.

### Features
- **Connections List**: Shows target WebSocket URLs, connection status (Active/Closed), message counts, and last activity timestamps.
- **Frame Log Viewer**: Streams live messages with inbound/outbound direction indicators, payload size, timing, and formatting controls.

---

## 4. Workflow / Automation

**Path:** `src/pages/workflow/`

A node-based automated testing workflow editor powered by `@xyflow/react`.

### Node Registry
- **Triggers**:
  - `Scan Completed` — fires when a browser crawl finishes.
  - `Scheduled` — triggers based on a cron schedule definition.
  - `Manual` — fires via manual run execution.
  - `Page Crawled` — triggers per page crawled in the browser.
  - `Intercept Request` — fires on request interception breakpoints.
  - `WebSocket Message` — triggers on live WebSocket traffic frames.
  - `Port Scan Result` — fires on open port detection.
  - `Live Traffic Captured` — triggers on new proxy requests.
- **Conditions**: Status Code, URL Contains, Body Contains, Header Exists, Severity, AI Confidence, HTTP Method, Content-Type, Response Size, Crawl Status, Grep Match, Port Open.
- **Actions**: Send to Repeater, AI Analyze, Create Finding, Add to Report, Send Webhook, Notification, Run Script (Shell), Start/Stop Crawl, Send to Intercept, Start Invoker, Port Scan, Encode/Decode, Hash Data, Export JSON, Create/Add Document, Connect CDP.

### Workspace Controls
- **Canvas Grid**: Drag, drop, link, and delete nodes and connection paths.
- **Execution Log**: Real-time console feedback on running workflows.
- **Templates**: Initialize canvas layout from saved security presets.

---

## 5. Browser Automation

**Path:** `src/pages/browser/`

BFS-based web crawler with integrated AI assessment capabilities.

### Features
- **Crawling Configuration**: Target URL input, max depth/pages, delays, exclusion scopes, and headless/visible browser options.
- **Crawl Tree Panel**: Visual tree tracking discovered pages and crawl state (queued, current, visited, error, blocked).
- **AI Insights**: Categorized security findings (Auth, hidden routes, forms) with severity labels (critical, high, medium, low, info).
- **Action Log**: Detailed execution events queue.

---

## 6. Intercept

**Path:** `src/pages/intercept/`

A request and response interception proxy with real-time modification.

### Features
- **State Control**: Global intercept toggle switch.
- **Monaco Editor**: View and live-edit raw HTTP requests/responses before forwarding.
- **Intercept Queue**: List of pending streams waiting for action (Forward/Drop).
- **Bypass Filters**: Scope exclusion rules using glob matches.

---

## 7. Invoker

**Path:** `src/pages/invoker/`

A high-speed security fuzzer and attack engine.

### Features
- **Monaco Request Editor**: Define injection points in raw requests using `§payload§` markers.
- **Attack Setup**: Sniper mode, concurrency, delay intervals, grepping matches, and regex extractions.
- **Payload Sources**: Simple Lists, Runtime Files (wordlists), and Number Ranges.
- **Processing Pipeline**: Chain transformations (UrlEncode, Base64Encode, SHA-256 Hash, etc.).
- **Attack Panel**: Visual progress status and a filterable grid showing fuzzed request details.

---

## 8. Repeater

**Path:** `src/pages/repeater/`

An interactive playground to manually craft, modify, and replay network requests.

### Features
- **HTTP Mode**: Edit raw HTTP requests, send, and examine status codes, response headers, and rendered body content.
- **WebSocket Mode**: Craft handshake HTTP requests, connect, and interactively send text or binary frames with connection logging.
- **Scripting Engine**: Supports sandboxed Javascript Pre-Request and Test/Assertion scripts for dynamic request signing, automated header injection, context variable chaining, and assertions. See [repeater-scripts.md](file:///Users/arham/Desktop/project/apprecon/docs/repeater-scripts.md) for full guide.

---

## 9. Documents

**Path:** `src/pages/documents/`

Markdown document and report builder for logging security findings.

### Features
- **Templates**: Blank, Developer, QA, and Security Researcher presets.
- **Workspace Explorer**: Browse sections and manage API entries (saved request/response evidence databases).
- **Milkdown Editor**: A rich WYSIWYG markdown editor with full preview toggles and PDF export capabilities.

---

## 10. Encoder

**Path:** `src/pages/encoder/`

A lightweight text encoder and decoder tool.

### Features
- **Codecs**: URL, Base64, and Hex encoding/decoding.
- **Controls**: Live conversions on keypress, swap input/output, clear, and clipboard copy.

---

## 11. Hash

**Path:** `src/pages/hash/`

A client-side cryptographic hashing utility.

### Features
- **Algorithms**: MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-224, SHA3-256, SHA3-384, SHA3-512, and RIPEMD-160.
- **Controls**: Live hashing updates, clear, and clipboard copy.

---

## 12. Comparer

**Path:** `src/pages/comparer/`

A visual diff editor to compare raw responses, headers, or general text.

### Features
- **Monaco Diff Engine**: Side-by-side highlighting showing added (green) and removed (red) diff blocks.
- **Controls**: Clipboard imports and copy-to-clipboard actions.

---

## 13. Port Scanner

**Path:** `src/pages/port-scanner/`

A multi-threaded TCP port scanner powered by the Rust backend.

### Features
- **Scan Settings**: Target hostname/CIDR inputs, timeout intervals, thread concurrency, and service banner grabbing.
- **Presets**: Quick, Web, Top 100, Full (1-65535), and Custom ranges.
- **Results & Exports**: Renders list of open ports, services, response latencies, and service banners. Exportable to JSON or CSV.

---

## 14. JWT

**Path:** `src/pages/jwt/`

A decoder and generator tool for JSON Web Tokens.

### Features
- **Decode**: Deconstructs JWT strings into header, payload, and signatures, and flags security issues (e.g. `none` algorithm, weak signatures).
- **Generate**: Customize and sign new JWT tokens using signature algorithms like HS256, RS256, etc.

---

## 15. XSS Generator

**Path:** `src/pages/xss-generator/`

An interactive XSS payload generator.

### Features
- **Payload Library**: Preconfigured database of payloads grouped by tags and execution vectors (e.g. SVG, Image, Script).
- **Payload Builder**: Configure context wrappers (HTML, HTML Attribute, JavaScript block) and chain encoders (URL encode, hex, html entities, base64).

---

## 16. SQL Injection

**Path:** `src/pages/sql-injection/`

An injection scanner for detecting SQL vulnerabilities.

### Features
- **Configuration**: HTTP URL, target parameters, risk levels, and injection techniques (Boolean-based blind, Error-based, Union query, Stacked queries, Time-based blind).
- **Results**: Live tracking of vulnerable points and a structural view for database schemas/extraction.

---

## 17. Debugger

**Path:** `src/pages/debugger/`

A timeline execution debugger for proxy operations and workflows.

### Features
- **Event Timeline**: A chronological list of intercepted events and internal workflow stages.
- **Payload Details**: Inspector showing event JSON contents, parameters, and results.

---

## 18. Regression

**Path:** `src/pages/regression/`

Visual test suite editor and regression runner for browser automation.

### Features
- **Step Kinds**: navigate, click, fill, wait, screenshot, assert-visible, assert-text, assert-url, and ai-verify.
- **Suite Editor**: Visual interface to construct and arrange test actions.
- **Test Runner**: Stream execution logs, step durations, screenshot attachments, and overall test results.

---

## 19. Listener

**Path:** `src/pages/listener/`

An out-of-band collaborator server listener (similar to Burp Collaborator).

### Features
- **Payload Domain**: Generate random lookup domains pointing to the listener server.
- **Interaction Log**: Capture incoming DNS, HTTP, and SMTP requests with full metadata dumps (headers, envelope logs, DNS types).

---

## 20. Settings

**Path:** `src/pages/settings/`

Application configuration and setup panel.

### Features
- **Root CA**: Certificate authority details, certificate regeneration, and trust installation status.
- **Installation Guides**: Integration instructions for macOS, Windows, Chrome, Safari, Firefox, iOS, and Android.
- **AI Settings**: API keys and models config (e.g., DeepSeek flash/pro models).

---

## Shared / Helper Directories

These directories exist under `src/pages/` but do not map directly to application sidebar navigation items:
- **`live-traffic`** (`src/pages/live-traffic/`) — core backend API integrations, hooks, and query stores shared by HTTP History and WebSocket History.
- **`inspector`** (`src/pages/inspector/`) — API hooks and CDP interaction constants.

---

## Cross-Cutting Patterns

### State Management
Zustand stores are utilized for centralized state management throughout features. These include:
- `app.ts` — main window layouts.
- `app-settings-store.ts` — proxy config, bypass list, theme settings.
- `browser-automation.ts` — crawler configuration and active states.
- `collections.ts` — target mappings, scopes, and workspaces.
- `documents.ts` — Markdown notes database.
- `debugger.ts` — timeline debugging records.
- `invoker.ts` — fuzzer attacks configuration.
- `listener.ts` — collaborator server parameters.
- `regression.ts` — regression test cases registry.
- `repeater.ts` — repeater HTTP and WS requests.

### Tab Management
The `useTabState` hook provides a standardized mechanism for creating, renaming, reordering, and closing multi-tab layouts across Repeater, Intercept, and HTTP History.

### Tauri Backend Integration
- **Tauri Commands**: Communicates with the Rust backend via `invoke` commands from `@tauri-apps/api/core`.
- **Event Listeners**: Listens to streaming channels using `listen` from `@tauri-apps/api/event` for real-time proxy traffic, socket messages, crawler events, and scanning status updates.
