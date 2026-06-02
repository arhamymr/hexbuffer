# Repeater Commands

<cite>
**Referenced Files in This Document**
- [src/pages/repeater/index.tsx](file://src/pages/repeater/index.tsx)
- [src/pages/repeater/hooks/use-repeater-page.ts](file://src/pages/repeater/hooks/use-repeater-page.ts)
- [src/pages/repeater/api.ts](file://src/pages/repeater/api.ts)
- [src/pages/repeater/types.ts](file://src/pages/repeater/types.ts)
- [src/pages/repeater/components/RepeaterRequestPanel.tsx](file://src/pages/repeater/components/RepeaterRequestPanel.tsx)
- [src/pages/repeater/components/RepeaterResponsePanel.tsx](file://src/pages/repeater/components/RepeaterResponsePanel.tsx)
- [src/pages/repeater/components/RepeaterWsPanel.tsx](file://src/pages/repeater/components/RepeaterWsPanel.tsx)
- [src/stores/repeater.ts](file://src/stores/repeater.ts)
- [src/lib/http-message.ts](file://src/lib/http-message.ts)
- [src-tauri/src/commands/repeater.rs](file://src-tauri/src/commands/repeater.rs)
- [src-tauri/src/proxy/websocket.rs](file://src-tauri/src/proxy/websocket.rs)
- [src-tauri/src/main.rs](file://src-tauri/src/main.rs)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains AppRecon’s Repeater command handlers and related UI flows. It covers:
- Request replay commands and templates
- Header editing and payload customization
- Repeater state management and sessions
- Response tracking and error handling
- WebSocket repeater functionality and real-time messaging
- Example workflows and best practices
- Performance and concurrency considerations

## Project Structure
The Repeater feature spans frontend React components and Zustand store, a thin API wrapper, and backend Tauri commands implemented in Rust. WebSocket handling integrates with both the repeater and the proxy pipeline.

```mermaid
graph TB
subgraph "Frontend"
UI["RepeaterPage<br/>index.tsx"]
Hook["useRepeaterPage<br/>hooks/use-repeater-page.ts"]
Store["Repeater Store<br/>stores/repeater.ts"]
ReqPanel["RepeaterRequestPanel<br/>components/RepeaterRequestPanel.tsx"]
RespPanel["RepeaterResponsePanel<br/>components/RepeaterResponsePanel.tsx"]
WSPanel["RepeaterWsPanel<br/>components/RepeaterWsPanel.tsx"]
Types["Types and Helpers<br/>pages/repeater/types.ts<br/>lib/http-message.ts"]
API["API Wrapper<br/>pages/repeater/api.ts"]
end
subgraph "Backend (Tauri)"
Main["Main App<br/>src-tauri/src/main.rs"]
Cmd["Repeater Commands<br/>src-tauri/src/commands/repeater.rs"]
WSUtil["WS Utility<br/>src-tauri/src/proxy/websocket.rs"]
end
UI --> Hook
Hook --> Store
Hook --> API
API --> Main
Main --> Cmd
Cmd --> WSUtil
UI --> ReqPanel
UI --> RespPanel
UI --> WSPanel
Types --> Hook
Types --> ReqPanel
Types --> RespPanel
Types --> WSPanel
```

**Diagram sources**
- [src/pages/repeater/index.tsx:14-74](file://src/pages/repeater/index.tsx#L14-L74)
- [src/pages/repeater/hooks/use-repeater-page.ts:7-102](file://src/pages/repeater/hooks/use-repeater-page.ts#L7-L102)
- [src/stores/repeater.ts:43-165](file://src/stores/repeater.ts#L43-L165)
- [src/pages/repeater/api.ts:1-8](file://src/pages/repeater/api.ts#L1-L8)
- [src/pages/repeater/types.ts:1-127](file://src/pages/repeater/types.ts#L1-L127)
- [src/pages/repeater/components/RepeaterRequestPanel.tsx:1-53](file://src/pages/repeater/components/RepeaterRequestPanel.tsx#L1-L53)
- [src/pages/repeater/components/RepeaterResponsePanel.tsx:1-115](file://src/pages/repeater/components/RepeaterResponsePanel.tsx#L1-L115)
- [src/pages/repeater/components/RepeaterWsPanel.tsx:1-267](file://src/pages/repeater/components/RepeaterWsPanel.tsx#L1-L267)
- [src-tauri/src/main.rs:71-139](file://src-tauri/src/main.rs#L71-L139)
- [src-tauri/src/commands/repeater.rs:30-259](file://src-tauri/src/commands/repeater.rs#L30-L259)
- [src-tauri/src/proxy/websocket.rs:1-187](file://src-tauri/src/proxy/websocket.rs#L1-L187)

**Section sources**
- [src/pages/repeater/index.tsx:14-74](file://src/pages/repeater/index.tsx#L14-L74)
- [src-tauri/src/main.rs:71-139](file://src-tauri/src/main.rs#L71-L139)

## Core Components
- Repeater store: Manages tabs, active tab, and persistence.
- Page hook: Orchestrates request parsing, sending, and response updates.
- API wrapper: Invokes backend commands via Tauri.
- UI panels: Request editor, response viewer, and WebSocket panel.
- Backend commands: HTTP request sender and WebSocket repeater controls.
- Utilities: HTTP message parsing/building helpers.

Key responsibilities:
- Frontend: Editable raw HTTP requests, send triggers, response rendering, and WebSocket messaging.
- Backend: HTTP request execution with redirects and timing, WebSocket connection lifecycle, and event emission.

**Section sources**
- [src/stores/repeater.ts:13-26](file://src/stores/repeater.ts#L13-L26)
- [src/pages/repeater/hooks/use-repeater-page.ts:7-102](file://src/pages/repeater/hooks/use-repeater-page.ts#L7-L102)
- [src/pages/repeater/api.ts:5-7](file://src/pages/repeater/api.ts#L5-L7)
- [src/pages/repeater/types.ts:3-53](file://src/pages/repeater/types.ts#L3-L53)
- [src-tauri/src/commands/repeater.rs:30-96](file://src-tauri/src/commands/repeater.rs#L30-L96)
- [src-tauri/src/commands/repeater.rs:117-259](file://src-tauri/src/commands/repeater.rs#L117-L259)

## Architecture Overview
The Repeater architecture separates concerns across UI, state, and backend command layers. Requests flow from the UI to the store and hook, then to the API wrapper and Tauri main process, where backend commands execute HTTP or WebSocket operations and emit events back to the UI.

```mermaid
sequenceDiagram
participant UI as "RepeaterRequestPanel"
participant Hook as "useRepeaterPage"
participant Store as "Repeater Store"
participant API as "sendRepeaterRequest"
participant Main as "Tauri Main"
participant Cmd as "send_repeater_request"
participant Net as "HTTP Client"
UI->>Hook : "User clicks SEND"
Hook->>Store : "Set loading and clear error"
Hook->>Hook : "Parse raw request"
Hook->>API : "Invoke send_repeater_request(parsed)"
API->>Main : "invoke('send_repeater_request', payload)"
Main->>Cmd : "Dispatch command"
Cmd->>Net : "Build and send HTTP request"
Net-->>Cmd : "Response metadata + body"
Cmd-->>Main : "RepeaterResponse"
Main-->>API : "RepeaterResponse"
API-->>Hook : "RepeaterResponse"
Hook->>Store : "Update tab with response"
```

**Diagram sources**
- [src/pages/repeater/components/RepeaterRequestPanel.tsx:25-32](file://src/pages/repeater/components/RepeaterRequestPanel.tsx#L25-L32)
- [src/pages/repeater/hooks/use-repeater-page.ts:51-86](file://src/pages/repeater/hooks/use-repeater-page.ts#L51-L86)
- [src/pages/repeater/api.ts:5-7](file://src/pages/repeater/api.ts#L5-L7)
- [src-tauri/src/commands/repeater.rs:30-96](file://src-tauri/src/commands/repeater.rs#L30-L96)

## Detailed Component Analysis

### HTTP Repeater Command Handlers
- Command: send_repeater_request
  - Parses method, URL, headers, and body from the frontend payload.
  - Builds a redirect-limited HTTP client.
  - Applies headers and optional body encoding based on Content-Encoding.
  - Sends the request and captures status, headers, final URL, and body.
  - Returns a structured response with timing metrics.

```mermaid
flowchart TD
Start(["Receive RepeaterRequest"]) --> ParseMethod["Validate HTTP method"]
ParseMethod --> BuildClient["Build HTTP client with redirect policy"]
BuildClient --> ApplyHeaders["Apply headers to request builder"]
ApplyHeaders --> HasBody{"Has non-empty body?"}
HasBody --> |Yes| EncodeBody["Re-encode body per Content-Encoding"]
EncodeBody --> AddBody["Attach body bytes"]
HasBody --> |No| SendReq["Send request"]
AddBody --> SendReq
SendReq --> CollectResp["Collect status, headers, body, final URL"]
CollectResp --> Return(["Return RepeaterResponse"])
```

**Diagram sources**
- [src-tauri/src/commands/repeater.rs:30-96](file://src-tauri/src/commands/repeater.rs#L30-L96)

**Section sources**
- [src-tauri/src/commands/repeater.rs:30-96](file://src-tauri/src/commands/repeater.rs#L30-L96)

### Repeater State Management and Templates
- Tabs and persistence:
  - The store maintains an array of tabs, active tab ID, and next tab numbering.
  - Persistence merges previous state and ensures active tab validity after reload.
- Template creation:
  - Default tab starts with a GET request to an example URL.
  - Tabs can be created from a raw request or WebSocket request.
  - Naming supports numeric HTTP tabs and “WS N” for WebSocket tabs.

```mermaid
classDiagram
class RepeaterTab {
+string id
+string name
+string mode
+RepeaterRequest request
+RepeaterWsRequest wsRequest
+string wsConnectionId
+boolean wsConnected
+WsRepeaterMessage[] wsMessages
+RepeaterResponse response
+boolean isLoading
+string error
}
class RepeaterState {
+RepeaterTab[] tabs
+string activeTabId
+number nextRequestTabNumber
+number nextWsTabNumber
+setActiveTabId(id)
+updateTab(id, updater)
+renameTab(id, name)
+addRequestTab(request)
+addWsTab(wsRequest)
+closeTab(id)
+closeTabsToLeft(id)
+closeTabsToRight(id)
}
RepeaterState --> RepeaterTab : "manages"
```

**Diagram sources**
- [src/pages/repeater/types.ts:41-53](file://src/pages/repeater/types.ts#L41-L53)
- [src/stores/repeater.ts:13-26](file://src/stores/repeater.ts#L13-L26)

**Section sources**
- [src/stores/repeater.ts:43-165](file://src/stores/repeater.ts#L43-L165)
- [src/pages/repeater/types.ts:61-126](file://src/pages/repeater/types.ts#L61-L126)

### Request Modification and Payload Customization
- Raw request editing:
  - The request panel exposes a text editor for raw HTTP requests.
  - Changes propagate to the active tab via the page hook.
- Parsing and building:
  - parseRawHttpRequest extracts method, URL, headers, and body with fallbacks.
  - buildRawHttpRequest composes a canonical raw request string.
- Header editing:
  - Headers are represented as a record keyed by header name.
  - The HTTP helper normalizes and formats headers consistently.

```mermaid
flowchart TD
Edit["User edits raw request"] --> UpdateTab["Update active tab raw"]
UpdateTab --> Parse["parseRawHttpRequest(raw, options)"]
Parse --> Parsed["ParsedRepeaterRequest"]
Parsed --> Send["send_repeater_request(parsed)"]
```

**Diagram sources**
- [src/pages/repeater/components/RepeaterRequestPanel.tsx:35-48](file://src/pages/repeater/components/RepeaterRequestPanel.tsx#L35-L48)
- [src/pages/repeater/hooks/use-repeater-page.ts:41-49](file://src/pages/repeater/hooks/use-repeater-page.ts#L41-L49)
- [src/lib/http-message.ts:176-228](file://src/lib/http-message.ts#L176-L228)
- [src/pages/repeater/api.ts:5-7](file://src/pages/repeater/api.ts#L5-L7)

**Section sources**
- [src/pages/repeater/components/RepeaterRequestPanel.tsx:15-52](file://src/pages/repeater/components/RepeaterRequestPanel.tsx#L15-L52)
- [src/pages/repeater/hooks/use-repeater-page.ts:31-49](file://src/pages/repeater/hooks/use-repeater-page.ts#L31-L49)
- [src/lib/http-message.ts:158-228](file://src/lib/http-message.ts#L158-L228)

### Response Tracking and Error Handling
- Loading and error states:
  - The hook toggles isLoading and clears previous errors before sending.
  - On success, the response replaces the tab’s response; on failure, an error message is stored.
- Response panel:
  - Renders status badges, timing, and formatted raw response.
  - Handles loading and error views.

```mermaid
sequenceDiagram
participant Hook as "useRepeaterPage"
participant Store as "Repeater Store"
participant Panel as "RepeaterResponsePanel"
Hook->>Store : "Set isLoading=true, error=null"
Hook->>Hook : "Await sendRepeaterRequest"
alt Success
Hook->>Store : "Set isLoading=false, response"
Store-->>Panel : "Render response"
else Failure
Hook->>Store : "Set isLoading=false, error=message"
Store-->>Panel : "Render error"
end
```

**Diagram sources**
- [src/pages/repeater/hooks/use-repeater-page.ts:51-86](file://src/pages/repeater/hooks/use-repeater-page.ts#L51-L86)
- [src/pages/repeater/components/RepeaterResponsePanel.tsx:38-85](file://src/pages/repeater/components/RepeaterResponsePanel.tsx#L38-L85)

**Section sources**
- [src/pages/repeater/hooks/use-repeater-page.ts:51-86](file://src/pages/repeater/hooks/use-repeater-page.ts#L51-L86)
- [src/pages/repeater/components/RepeaterResponsePanel.tsx:16-114](file://src/pages/repeater/components/RepeaterResponsePanel.tsx#L16-L114)

### WebSocket Repeater Functionality
- Connection lifecycle:
  - ws_repeater_connect upgrades URLs to ws/wss, establishes a stream, and spawns a task to handle inbound/outbound messages and cancellation.
  - ws_repeater_send enqueues a message to the connection’s outbound channel.
  - ws_repeater_disconnect removes the connection and signals cancellation.
- Real-time events:
  - Backend emits ws-repeater-message events with direction, type, payload, and timestamp.
  - The WS panel listens for these events and appends messages to the tab’s message list.
- UI controls:
  - Toggle switch manages connect/disconnect.
  - Message input sends text frames and logs outbound messages locally.

```mermaid
sequenceDiagram
participant UI as "RepeaterWsPanel"
participant Main as "Tauri Main"
participant Cmd as "ws_repeater_*"
participant WS as "WebSocket Stream"
UI->>Main : "invoke('ws_repeater_connect', {url, headers})"
Main->>Cmd : "ws_repeater_connect"
Cmd->>WS : "connect_async(url)"
WS-->>Cmd : "Split(read, write)"
Cmd-->>Main : "connection_id"
Main-->>UI : "connection_id"
UI->>Main : "invoke('ws_repeater_send', {connection_id, message})"
Main->>Cmd : "ws_repeater_send"
Cmd->>WS : "write.send(Message : : Text)"
WS-->>Cmd : "read.next()"
Cmd-->>Main : "emit('ws-repeater-message', event)"
Main-->>UI : "ws-repeater-message"
UI->>UI : "Append to wsMessages"
```

**Diagram sources**
- [src/pages/repeater/components/RepeaterWsPanel.tsx:81-118](file://src/pages/repeater/components/RepeaterWsPanel.tsx#L81-L118)
- [src-tauri/src/commands/repeater.rs:117-259](file://src-tauri/src/commands/repeater.rs#L117-L259)

**Section sources**
- [src-tauri/src/commands/repeater.rs:117-259](file://src-tauri/src/commands/repeater.rs#L117-L259)
- [src/pages/repeater/components/RepeaterWsPanel.tsx:40-267](file://src/pages/repeater/components/RepeaterWsPanel.tsx#L40-L267)

### Session Handling and History
- HTTP history:
  - The backend command returns final_url and timing, enabling downstream history storage and retrieval via the main process.
- WebSocket history:
  - WebSocket handshake and connection records are built and emitted by the proxy WebSocket utility, supporting history queries and persistence.

```mermaid
graph LR
Cmd["send_repeater_request"] --> Resp["RepeaterResponse<br/>final_url, time_ms"]
WSUtil["proxy/websocket.rs<br/>build_connection_record"] --> Hist["Emit 'websocket-connection'"]
```

**Diagram sources**
- [src-tauri/src/commands/repeater.rs:88-95](file://src-tauri/src/commands/repeater.rs#L88-L95)
- [src-tauri/src/proxy/websocket.rs:62-94](file://src-tauri/src/proxy/websocket.rs#L62-L94)

**Section sources**
- [src-tauri/src/commands/repeater.rs:88-95](file://src-tauri/src/commands/repeater.rs#L88-L95)
- [src-tauri/src/proxy/websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)

## Dependency Analysis
- Frontend-to-backend:
  - The API wrapper invokes Tauri commands registered in main.
  - The repeater commands module exports the HTTP and WebSocket handlers.
- Backend internals:
  - The WebSocket repeater state is managed globally and shared across commands.
  - The proxy WebSocket utility builds connection records and emits events consumed by the UI.

```mermaid
graph TB
API["pages/repeater/api.ts"] --> Main["src-tauri/src/main.rs"]
Main --> Cmd["src-tauri/src/commands/repeater.rs"]
Cmd --> State["WsRepeaterState (global)"]
Cmd --> WSUtil["src-tauri/src/proxy/websocket.rs"]
```

**Diagram sources**
- [src/pages/repeater/api.ts:5-7](file://src/pages/repeater/api.ts#L5-L7)
- [src-tauri/src/main.rs:100-103](file://src-tauri/src/main.rs#L100-L103)
- [src-tauri/src/commands/repeater.rs:104-106](file://src-tauri/src/commands/repeater.rs#L104-L106)
- [src-tauri/src/proxy/websocket.rs:1-187](file://src-tauri/src/proxy/websocket.rs#L1-187)

**Section sources**
- [src-tauri/src/main.rs:71-139](file://src-tauri/src/main.rs#L71-L139)
- [src-tauri/src/commands/mod.rs:1-9](file://src-tauri/src/commands/mod.rs#L1-L9)

## Performance Considerations
- HTTP request handling:
  - Redirect policy is limited to reduce excessive hops.
  - Body re-encoding respects Content-Encoding to avoid unnecessary transformations.
- WebSocket:
  - Separate tasks handle inbound reads and outbound writes with channels.
  - Cancellation tokens ensure cleanup on disconnect.
- UI rendering:
  - Minimal re-renders via callbacks and memoization in the page hook.
  - Large message lists are appended incrementally; autoscroll keeps the latest visible.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Common issues:
  - Invalid HTTP method: The backend validates the method and returns a descriptive error.
  - Failed to send request: Network or client build failures surface as errors.
  - WebSocket connection failed: URL scheme conversion and connection errors are reported.
  - Connection not found: Sending or disconnecting from a non-existent connection ID fails predictably.
- UI feedback:
  - Loading indicators during request send.
  - Error banners with messages for failures.
  - Close tab actions preserve at least one default tab.

**Section sources**
- [src-tauri/src/commands/repeater.rs:32-38](file://src-tauri/src/commands/repeater.rs#L32-L38)
- [src-tauri/src/commands/repeater.rs:124-134](file://src-tauri/src/commands/repeater.rs#L124-L134)
- [src-tauri/src/commands/repeater.rs:231-233](file://src-tauri/src/commands/repeater.rs#L231-L233)
- [src/pages/repeater/hooks/use-repeater-page.ts:72-85](file://src/pages/repeater/hooks/use-repeater-page.ts#L72-L85)
- [src/pages/repeater/components/RepeaterWsPanel.tsx:109-117](file://src/pages/repeater/components/RepeaterWsPanel.tsx#L109-L117)

## Conclusion
AppRecon’s Repeater provides a robust, modular system for replaying HTTP requests and interacting with WebSockets. The frontend offers flexible request editing and real-time message inspection, while the backend executes requests and manages WebSocket lifecycles with clear error reporting. State persistence and responsive UI ensure efficient workflows for testing and analysis.