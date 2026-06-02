# WebSocket Traffic Analysis

<cite>
**Referenced Files in This Document**
- [websocket-table.tsx](file://src/pages/live-traffic/components/websocket-history-view/websocket-table.tsx)
- [websocket-entry-view.tsx](file://src/pages/live-traffic/components/websocket-history-view/websocket-entry-view.tsx)
- [websocket-context-menu.tsx](file://src/pages/live-traffic/components/websocket-history-view/websocket-context-menu.tsx)
- [use-websocket-table.ts](file://src/pages/live-traffic/hooks/use-websocket-table.ts)
- [use-websocket-detail.ts](file://src/pages/live-traffic/hooks/use-websocket-detail.ts)
- [use-websocket-query.ts](file://src/pages/live-traffic/hooks/use-websocket-query.ts)
- [history-query-store.ts](file://src/pages/live-traffic/state/history-query-store.ts)
- [history-service.ts](file://src/pages/live-traffic/services/history-service.ts)
- [api.ts](file://src/pages/live-traffic/api.ts)
- [websocket.rs](file://src-tauri/src/proxy/websocket.rs)
- [mod.rs](file://src-tauri/src/history/mod.rs)
- [repository.rs](file://src-tauri/src/db/repository.rs)
- [schema.rs](file://src-tauri/src/db/schema.rs)
- [mod.rs](file://src-tauri/src/proxy/lifecycle/mod.rs)
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
This document explains the WebSocket Traffic Analysis functionality, covering how WebSocket connections are captured, monitored, and inspected in real time. It details the WebSocket table interface, message detail viewing, connection state management, and the hook-based state management that powers live updates. It also covers the backend integration for MITM proxy capabilities, WebSocket protocol specifics, message formatting, and database persistence.

## Project Structure
The WebSocket Traffic Analysis spans frontend React components and hooks, a service layer, and a Tauri-backed Rust backend. The frontend emits and listens for events, queries paginated summaries, and renders connection and message details. The backend detects WebSocket upgrades, persists handshake and message data, and emits events for live updates.

```mermaid
graph TB
subgraph "Frontend"
WT["WebSocketTable<br/>websocket-table.tsx"]
WEV["WebSocketEntryView<br/>websocket-entry-view.tsx"]
WCM["WebSocketContextMenu<br/>websocket-context-menu.tsx"]
UWT["useWebSocketTable<br/>use-websocket-table.ts"]
UWD["useWebSocketDetail<br/>use-websocket-detail.ts"]
UWQ["useWebSocketQuery<br/>use-websocket-query.ts"]
HQS["HistoryQueryStore<br/>history-query-store.ts"]
HS["HistoryService<br/>history-service.ts"]
API["LiveTraffic API<br/>api.ts"]
end
subgraph "Backend (Tauri)"
LIFECYCLE["Lifecycle Handler<br/>proxy/lifecycle/mod.rs"]
WSUTIL["WS Helpers<br/>proxy/websocket.rs"]
HISTORY["HistoryBridge<br/>history/mod.rs"]
DBREPO["Repository<br/>db/repository.rs"]
SCHEMA["Schema<br/>db/schema.rs"]
end
WT --> UWT
WEV --> UWD
WCM --> HS
UWT --> HS
UWD --> HS
HS --> API
API --> LIFECYCLE
LIFECYCLE --> WSUTIL
WSUTIL --> HISTORY
HISTORY --> DBREPO
DBREPO --> SCHEMA
```

**Diagram sources**
- [websocket-table.tsx:40-165](file://src/pages/live-traffic/components/websocket-history-view/websocket-table.tsx#L40-L165)
- [websocket-entry-view.tsx:41-157](file://src/pages/live-traffic/components/websocket-history-view/websocket-entry-view.tsx#L41-L157)
- [websocket-context-menu.tsx:25-88](file://src/pages/live-traffic/components/websocket-history-view/websocket-context-menu.tsx#L25-L88)
- [use-websocket-table.ts:35-184](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L35-L184)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)
- [use-websocket-query.ts:14-38](file://src/pages/live-traffic/hooks/use-websocket-query.ts#L14-L38)
- [history-query-store.ts:40-140](file://src/pages/live-traffic/state/history-query-store.ts#L40-L140)
- [history-service.ts:34-57](file://src/pages/live-traffic/services/history-service.ts#L34-L57)
- [api.ts:173-189](file://src/pages/live-traffic/api.ts#L173-L189)
- [mod.rs:111-141](file://src-tauri/src/proxy/lifecycle/mod.rs#L111-L141)
- [websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)
- [mod.rs:193-260](file://src-tauri/src/history/mod.rs#L193-L260)
- [repository.rs:373-432](file://src-tauri/src/db/repository.rs#L373-L432)
- [schema.rs:23-56](file://src-tauri/src/db/schema.rs#L23-L56)

**Section sources**
- [websocket-table.tsx:40-165](file://src/pages/live-traffic/components/websocket-history-view/websocket-table.tsx#L40-L165)
- [use-websocket-table.ts:35-184](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L35-L184)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)
- [history-service.ts:34-57](file://src/pages/live-traffic/services/history-service.ts#L34-L57)
- [api.ts:173-189](file://src/pages/live-traffic/api.ts#L173-L189)
- [websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)
- [mod.rs:193-260](file://src-tauri/src/history/mod.rs#L193-L260)
- [repository.rs:373-432](file://src-tauri/src/db/repository.rs#L373-L432)
- [schema.rs:23-56](file://src-tauri/src/db/schema.rs#L23-L56)
- [mod.rs:111-141](file://src-tauri/src/proxy/lifecycle/mod.rs#L111-L141)

## Core Components
- WebSocketTable: Renders a paginated table of WebSocket connections with state, direction, message counts, and last activity. Supports loading more, refresh on new events, and context menu actions.
- WebSocketEntryView: Displays handshake details and a scrollable list of messages for a selected connection, including direction, type, size, and decoded payload.
- useWebSocketTable: Manages pagination, filtering, debounced fetching, and live updates via a Tauri event listener for new connections.
- useWebSocketDetail: Loads a single connection’s details and subscribes to real-time message events for that connection.
- useWebSocketQuery and HistoryQueryStore: Centralized query state for search, scope, and pagination, with refresh triggers.
- HistoryService and LiveTraffic API: Bridge between frontend hooks and backend commands for fetching summaries, details, and deleting connections.
- Backend WebSocket Utilities and Lifecycle: Detects WebSocket upgrade requests, builds connection records, persists to DB, and emits events.
- Database Schema and Repository: Defines tables for WebSocket connections and messages, and provides CRUD operations and paginated queries.

**Section sources**
- [websocket-table.tsx:40-165](file://src/pages/live-traffic/components/websocket-history-view/websocket-table.tsx#L40-L165)
- [websocket-entry-view.tsx:41-157](file://src/pages/live-traffic/components/websocket-history-view/websocket-entry-view.tsx#L41-L157)
- [use-websocket-table.ts:35-184](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L35-L184)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)
- [use-websocket-query.ts:14-38](file://src/pages/live-traffic/hooks/use-websocket-query.ts#L14-L38)
- [history-query-store.ts:40-140](file://src/pages/live-traffic/state/history-query-store.ts#L40-L140)
- [history-service.ts:34-57](file://src/pages/live-traffic/services/history-service.ts#L34-L57)
- [api.ts:173-189](file://src/pages/live-traffic/api.ts#L173-L189)
- [websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)
- [repository.rs:373-432](file://src-tauri/src/db/repository.rs#L373-L432)
- [schema.rs:23-56](file://src-tauri/src/db/schema.rs#L23-L56)

## Architecture Overview
The system integrates a proxy MITM layer with a persistent storage layer and a React UI. WebSocket upgrade detection triggers a handshake record creation and emission. Subsequent messages update counters and are stored with direction and payload metadata. Frontend hooks subscribe to events and fetch paginated data to keep the UI live and responsive.

```mermaid
sequenceDiagram
participant Client as "Browser/App"
participant Proxy as "Proxy Lifecycle<br/>proxy/lifecycle/mod.rs"
participant WSUtil as "WS Helpers<br/>proxy/websocket.rs"
participant History as "HistoryBridge<br/>history/mod.rs"
participant DB as "Repository<br/>db/repository.rs"
participant API as "LiveTraffic API<br/>api.ts"
participant Hooks as "Hooks<br/>use-websocket-table/use-websocket-detail"
participant UI as "Components<br/>WebSocketTable/WebSocketEntryView"
Client->>Proxy : "HTTP request with WebSocket upgrade"
Proxy->>WSUtil : "Detect upgrade and parse target"
WSUtil->>History : "Insert WebSocket connection"
History->>DB : "Persist connection"
WSUtil-->>Proxy : "Emit 'websocket-connection'"
Proxy-->>API : "Command invocation"
API-->>Hooks : "Expose get_websocket_* commands"
Hooks-->>UI : "Fetch summaries and details"
UI-->>Client : "Render table and message list"
```

**Diagram sources**
- [mod.rs:111-141](file://src-tauri/src/proxy/lifecycle/mod.rs#L111-L141)
- [websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)
- [mod.rs:193-260](file://src-tauri/src/history/mod.rs#L193-L260)
- [repository.rs:373-432](file://src-tauri/src/db/repository.rs#L373-L432)
- [api.ts:173-189](file://src/pages/live-traffic/api.ts#L173-L189)
- [use-websocket-table.ts:35-184](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L35-L184)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)
- [websocket-table.tsx:40-165](file://src/pages/live-traffic/components/websocket-history-view/websocket-table.tsx#L40-L165)
- [websocket-entry-view.tsx:41-157](file://src/pages/live-traffic/components/websocket-history-view/websocket-entry-view.tsx#L41-L157)

## Detailed Component Analysis

### WebSocket Table Interface
The table displays a paginated list of WebSocket connections with:
- Timestamp, host, path, state badges, direction, message count, and last activity.
- Context menu actions: “Send to Repeater” and “Delete.”
- Real-time updates: A “new connections” banner appears when new events arrive and can trigger a refresh.

```mermaid
flowchart TD
Start(["Render WebSocketTable"]) --> CheckError{"Has load error?"}
CheckError --> |Yes| ShowError["Show Alert with error"]
CheckError --> |No| CheckLoading{"Is loading and empty?"}
CheckLoading --> |Yes| ShowLoading["Show loading state"]
CheckLoading --> |No| CheckEmpty{"No connections?"}
CheckEmpty --> |Yes| ShowEmpty["Show empty state with guidance"]
CheckEmpty --> |No| RenderTable["Render table rows with context menu"]
RenderTable --> NewEvents{"New events banner?"}
NewEvents --> |Yes| Banner["Show refresh button"]
NewEvents --> |No| Done
Banner --> Done(["Done"])
ShowError --> Done
ShowLoading --> Done
ShowEmpty --> Done
```

**Diagram sources**
- [websocket-table.tsx:40-165](file://src/pages/live-traffic/components/websocket-history-view/websocket-table.tsx#L40-L165)

**Section sources**
- [websocket-table.tsx:40-165](file://src/pages/live-traffic/components/websocket-history-view/websocket-table.tsx#L40-L165)
- [websocket-context-menu.tsx:25-88](file://src/pages/live-traffic/components/websocket-history-view/websocket-context-menu.tsx#L25-L88)

### Message Detail Viewing
The detail view shows:
- Connection state badge and URL with timestamps and addresses.
- Handshake request/response headers.
- A list of messages with direction, type, size, timestamp, and decoded payload.

```mermaid
sequenceDiagram
participant UI as "WebSocketEntryView"
participant Hook as "useWebSocketDetail"
participant API as "LiveTraffic API"
participant DB as "Repository"
participant Event as "Tauri Event"
UI->>Hook : "Select connection ID"
Hook->>API : "get_websocket_detail(connectionId)"
API->>DB : "Query connection and messages"
DB-->>API : "Connection + messages"
API-->>Hook : "Return detail"
Hook-->>UI : "Render headers and messages"
Event-->>Hook : "websocket-message (live)"
Hook-->>UI : "Append new message"
```

**Diagram sources**
- [websocket-entry-view.tsx:41-157](file://src/pages/live-traffic/components/websocket-history-view/websocket-entry-view.tsx#L41-L157)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)
- [api.ts:185-189](file://src/pages/live-traffic/api.ts#L185-L189)
- [repository.rs:518-533](file://src-tauri/src/db/repository.rs#L518-L533)

**Section sources**
- [websocket-entry-view.tsx:41-157](file://src/pages/live-traffic/components/websocket-history-view/websocket-entry-view.tsx#L41-L157)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)
- [api.ts:185-189](file://src/pages/live-traffic/api.ts#L185-L189)
- [repository.rs:518-533](file://src-tauri/src/db/repository.rs#L518-L533)

### Hook-Based State Management
- useWebSocketTable manages:
  - Pagination and perPage controls.
  - Debounced query execution and base query key tracking.
  - Real-time updates via a Tauri event listener for new connections.
  - Refresh and “load more” actions.
- useWebSocketDetail manages:
  - Loading connection and messages.
  - Decoding payloads (text vs binary).
  - Subscribing to live message events scoped to the selected connection.

```mermaid
flowchart TD
Init(["useWebSocketTable init"]) --> BuildQuery["Build base query key from filter + perPage"]
BuildQuery --> Debounce["Debounce fetch (300ms)"]
Debounce --> Fetch["fetchWebSocketSummaries(page)"]
Fetch --> UpdateState["Set pagination + connections"]
UpdateState --> Listen["Listen 'websocket-connection' (500ms debounce)"]
Listen --> RefreshOrCount["If page 1: refetch<br/>Else: increment newEventsCount"]
RefreshOrCount --> Render(["Render table"])
Init2(["useWebSocketDetail init"]) --> LoadDetail["fetchWebSocketDetail(selectedId)"]
LoadDetail --> Decode["Decode payload (text/binary)"]
Decode --> RenderDetail(["Render detail"])
RenderDetail --> LiveMsg["Listen 'websocket-message'"]
LiveMsg --> AppendMsg(["Append to messages"])
```

**Diagram sources**
- [use-websocket-table.ts:35-184](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L35-L184)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)

**Section sources**
- [use-websocket-table.ts:35-184](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L35-L184)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)

### Connection State Management and Lifecycle
- Detection: The backend checks for WebSocket upgrade headers and constructs a connection record with state derived from response status.
- Persistence: Connection and message inserts update counters and timestamps.
- Emission: Events are emitted to inform the frontend of new connections and messages.

```mermaid
flowchart TD
Detect["Detect upgrade headers"] --> Build["Build connection record"]
Build --> Persist["Insert into DB"]
Persist --> Emit["Emit 'websocket-connection'"]
Emit --> Frontend["Frontend receives and updates UI"]
MsgArrive["Message arrives"] --> InsertMsg["Insert message + update counters"]
InsertMsg --> EmitMsg["Emit 'websocket-message'"]
EmitMsg --> Detail["Detail view appends message"]
```

**Diagram sources**
- [websocket.rs:9-25](file://src-tauri/src/proxy/websocket.rs#L9-L25)
- [websocket.rs:62-94](file://src-tauri/src/proxy/websocket.rs#L62-L94)
- [websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)
- [repository.rs:405-432](file://src-tauri/src/db/repository.rs#L405-L432)
- [mod.rs:218-260](file://src-tauri/src/history/mod.rs#L218-L260)

**Section sources**
- [websocket.rs:9-25](file://src-tauri/src/proxy/websocket.rs#L9-L25)
- [websocket.rs:62-94](file://src-tauri/src/proxy/websocket.rs#L62-L94)
- [websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)
- [repository.rs:405-432](file://src-tauri/src/db/repository.rs#L405-L432)
- [mod.rs:218-260](file://src-tauri/src/history/mod.rs#L218-L260)

### WebSocket Protocol Specifics and Message Formatting
- Upgrade detection supports standard headers and token lists.
- Target parsing handles absolute URLs and relative URIs with Host header fallback.
- Message decoding:
  - Text messages are decoded using UTF-8.
  - Binary messages are formatted as space-separated hex bytes.
- Direction and type normalization ensures consistent rendering.

**Section sources**
- [websocket.rs:96-149](file://src-tauri/src/proxy/websocket.rs#L96-L149)
- [use-websocket-detail.ts:25-53](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L25-L53)

### Integration with Proxy System for MITM Capabilities
- The lifecycle handler inspects requests for WebSocket upgrade and, upon detection, builds and persists a connection record, emits an event, and tracks the connection key for future message routing.
- The API exposes commands for paginated logs, details, and deletion, enabling the UI to operate against the persisted dataset.

**Section sources**
- [mod.rs:111-141](file://src-tauri/src/proxy/lifecycle/mod.rs#L111-L141)
- [api.ts:173-189](file://src/pages/live-traffic/api.ts#L173-L189)
- [history-service.ts:34-57](file://src/pages/live-traffic/services/history-service.ts#L34-L57)

## Dependency Analysis
The frontend depends on:
- HistoryQueryStore for centralized query state.
- useWebSocketQuery to derive WebSocket-specific filters.
- HistoryService and LiveTraffic API to invoke backend commands.
- Tauri event listeners for real-time updates.

The backend depends on:
- WebSocket utilities for detection and record building.
- HistoryBridge for database operations.
- Repository for SQL queries and schema-driven tables.
- Schema for table definitions and indexes.

```mermaid
graph LR
HQS["HistoryQueryStore"] --> UWQ["useWebSocketQuery"]
UWQ --> UWT["useWebSocketTable"]
UWQ --> UWD["useWebSocketDetail"]
UWT --> HS["HistoryService"]
UWD --> HS
HS --> API["LiveTraffic API"]
API --> LIFECYCLE["Lifecycle Handler"]
LIFECYCLE --> WSUTIL["WS Helpers"]
WSUTIL --> HISTORY["HistoryBridge"]
HISTORY --> DBREPO["Repository"]
DBREPO --> SCHEMA["Schema"]
```

**Diagram sources**
- [history-query-store.ts:40-140](file://src/pages/live-traffic/state/history-query-store.ts#L40-L140)
- [use-websocket-query.ts:14-38](file://src/pages/live-traffic/hooks/use-websocket-query.ts#L14-L38)
- [use-websocket-table.ts:35-184](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L35-L184)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)
- [history-service.ts:34-57](file://src/pages/live-traffic/services/history-service.ts#L34-L57)
- [api.ts:173-189](file://src/pages/live-traffic/api.ts#L173-L189)
- [mod.rs:111-141](file://src-tauri/src/proxy/lifecycle/mod.rs#L111-L141)
- [websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)
- [mod.rs:193-260](file://src-tauri/src/history/mod.rs#L193-L260)
- [repository.rs:373-432](file://src-tauri/src/db/repository.rs#L373-L432)
- [schema.rs:23-56](file://src-tauri/src/db/schema.rs#L23-L56)

**Section sources**
- [history-query-store.ts:40-140](file://src/pages/live-traffic/state/history-query-store.ts#L40-L140)
- [use-websocket-query.ts:14-38](file://src/pages/live-traffic/hooks/use-websocket-query.ts#L14-L38)
- [use-websocket-table.ts:35-184](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L35-L184)
- [use-websocket-detail.ts:55-136](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L55-L136)
- [history-service.ts:34-57](file://src/pages/live-traffic/services/history-service.ts#L34-L57)
- [api.ts:173-189](file://src/pages/live-traffic/api.ts#L173-L189)
- [websocket.rs:27-60](file://src-tauri/src/proxy/websocket.rs#L27-L60)
- [mod.rs:193-260](file://src-tauri/src/history/mod.rs#L193-L260)
- [repository.rs:373-432](file://src-tauri/src/db/repository.rs#L373-L432)
- [schema.rs:23-56](file://src-tauri/src/db/schema.rs#L23-L56)

## Performance Considerations
- Debouncing: Queries are debounced to reduce redundant network calls and UI thrashing.
- Pagination: Large datasets are fetched in pages with “Load More” support.
- Real-time updates: Event listeners debounce incoming updates to batch UI re-renders.
- Payload decoding: Text decoding is attempted; otherwise binary payloads are rendered as hex to avoid expensive conversions.
- Indexes: Database indexes on timestamps and connection identifiers optimize queries for summaries and messages.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and remedies:
- WebSocket history not appearing:
  - Ensure the proxy is active and MITM is configured so WebSocket upgrade requests pass through.
  - Verify the backend emits the “websocket-connection” event and the frontend listens for it.
- Empty message list:
  - Confirm the selected connection exists and messages were inserted into the database.
  - Check that the event listener for “websocket-message” is scoped to the selected connection ID.
- UI not refreshing:
  - Trigger a refresh or check the “new connections” banner behavior.
  - Verify the base query key change resets pagination to page 1.
- Deleting a connection:
  - Use the context menu action to delete; confirm the local removal and backend deletion via the service.

**Section sources**
- [use-websocket-table.ts:99-152](file://src/pages/live-traffic/hooks/use-websocket-table.ts#L99-L152)
- [use-websocket-detail.ts:105-123](file://src/pages/live-traffic/hooks/use-websocket-detail.ts#L105-L123)
- [websocket-context-menu.tsx:62-70](file://src/pages/live-traffic/components/websocket-history-view/websocket-context-menu.tsx#L62-L70)
- [history-service.ts:54-56](file://src/pages/live-traffic/services/history-service.ts#L54-L56)

## Conclusion
The WebSocket Traffic Analysis system combines a robust backend MITM pipeline with a reactive frontend to deliver real-time visibility into WebSocket connections and messages. The hook-based state management, paginated summaries, and event-driven updates provide a responsive and efficient user experience. The database schema and repository operations ensure reliable persistence and fast queries, while the UI components offer actionable insights for debugging and performance monitoring.