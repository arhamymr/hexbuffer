# Intercept

## Overview

The Intercept page provides request/response interception capabilities for the MITM proxy. It allows users to pause live HTTP traffic, inspect and modify requests or responses, then forward, drop, or re-intercept them. This is the core manual traffic manipulation feature of AppRecon.

The intercept workflow is tab-based: each tab defines a set of capture hosts, and only requests matching those hosts are paused for inspection. This enables targeting specific domains without disrupting other traffic.

---

## Architecture

### Page Entry

The [InterceptPage](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/index.tsx) renders a horizontal split layout:

- **Left panel** — [InterceptRequestPanel](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/components/request-panel.tsx): raw request/response editor with Monaco-based text editor.
- **Right panel** — [InterceptQueuePanel](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/components/queue-panel.tsx): paused request queue with bypass controls and per-request actions.

The page is wrapped in [TabbedPageLayout](file:///Users/arham/Desktop/project/apprecon/src/components/tabs-layout/tabbed-page-layout.tsx) with support for tab add, rename, close, and bulk close operations (close tabs to left/right).

Like the Browser Automation page, it shows a proxy status warning when the MITM proxy is not connected, with a "Start Proxy" action button.

### Page Hook

[useInterceptPage](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/hooks/use-intercept-page.ts) is a thin hook that initializes the page by calling `syncActiveScope` on mount to ensure the active tab's capture hosts are registered with the proxy.

---

## Zustand Store

The [useInterceptStore](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/state/intercept-store.ts) is a persisted Zustand store (key: `0xbuffer-intercept-tabs`) that manages all intercept state:

### State

| Field | Type | Description |
|---|---|---|
| `tabs` | `InterceptTab[]` | All intercept tabs, each with id, name, and `captureHosts` patterns |
| `activeTabId` | `string` | Currently selected tab |
| `nextTabNumber` | `number` | Auto-incrementing counter for new tab names |
| `status` | `InterceptStatus \| null` | Proxy intercept mode status (Enabled/Disabled) |
| `requests` | `PausedRequest[]` | All paused requests across all tabs |
| `selectedRequestId` | `string \| null` | Currently selected request in the queue |
| `rawRequest` | `string` | Editable raw HTTP message for the selected request |
| `selectedDirection` | `'request' \| 'response' \| null` | Whether the paused item is a request or response |
| `isBusy` | `boolean` | True during async operations (forward, drop, close tab) |
| `isRefreshing` | `boolean` | True during status/request polling |
| `loadedRequestId` | `string \| null` | Tracks which request's raw text is loaded in the editor |

### Actions

| Action | Description |
|---|---|
| `setActiveTabId` | Switches active tab and syncs its scope with the proxy |
| `addTab` | Creates a new empty tab, sets it as active |
| `addTabForHost` | Creates a new tab with a specific host pre-configured as a capture host |
| `renameTab` | Renames a tab |
| `closeTab` | Forwards all paused items in the tab, then removes the tab |
| `closeTabsToLeft` | Closes all tabs to the left of the given tab |
| `closeTabsToRight` | Closes all tabs to the right of the given tab |
| `addCaptureHost` | Adds a host pattern to the active tab's capture list |
| `removeCaptureHost` | Removes a host pattern from the active tab's capture list |
| `removeCaptureHostAndForward` | Removes a host pattern and forwards all paused requests for that host |
| `setRawRequest` | Updates the editable raw HTTP message |
| `setSelectedRequestId` | Selects a request, loading its raw message into the editor |
| `refresh` | Polls the backend for current intercept status and paused requests |
| `syncActiveScope` | Sends the active tab's capture hosts to the proxy backend |
| `toggleIntercept` | Enables or disables the intercept mode globally |
| `forwardSelectedRequest` | Parses and forwards the currently selected request/response |
| `forwardRequestAndInterceptResponse` | Forwards a request but marks its response for interception |
| `dropRequest` | Drops (discards) a paused request without forwarding |

### Persistence

The store persists `tabs`, `activeTabId`, and `nextTabNumber` to localStorage. On rehydration, it validates that the persisted active tab ID still exists in the tab list.

---

## Request Editor Panel

The [InterceptRequestPanel](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/components/request-panel.tsx) displays:

- **Header** — shows "Request" or "Response" label based on the selected item's direction, alongside an enable/disable toggle switch and a status badge.
- **Raw message editor** — a Monaco-based [TextEditor](file:///Users/arham/Desktop/project/apprecon/src/components/ui/text-editor.tsx) that displays the full raw HTTP message. The user can freely edit the raw text before forwarding.
- **Read-only when no selection** — the editor is set to read-only when no request is selected.

The raw message is constructed from the paused request/response data by [buildRawPausedMessage](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/lib.ts). When forwarding, the raw text is parsed back into structured request/response objects by [parseRawHttpRequest](file:///Users/arham/Desktop/project/apprecon/src/lib/http-message.ts) and [parseRawHttpResponse](file:///Users/arham/Desktop/project/apprecon/src/lib/http-message.ts).

---

## Intercept Queue Panel

The [InterceptQueuePanel](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/components/queue-panel.tsx) is the main interaction surface:

### Header

- **FORWARD button** — forwards the currently selected request/response. Disabled when nothing is selected or when busy.
- **Refresh button** — polls the backend for the latest intercept state.

### Statistics

Two stat cards show:
- **Paused** — total paused requests across all tabs, plus the count in the current tab.
- **Mode** — shows "Capture" when intercept is enabled and hosts are configured, or "Pass through" otherwise.

### Queue List

Each paused request is displayed as a clickable row showing:
- Direction indicator (`->` for request, `<-` for response)
- Status code or HTTP method badge
- Host and path
- Timestamp

Clicking a row selects it, loading its raw message into the left editor panel.

### Per-Request Context Menu

Right-clicking a paused request opens a context menu with:
- **Capture this host** — adds the request's host to the active tab's capture list.
- **Intercept response** — forwards the request but marks its response for interception (request direction only).
- **Drop** — discards the request without forwarding.
- **Don't capture this host** — removes the host from capture patterns and forwards all paused items for that host.

### Bypass Panel

The [InterceptBypassPanel](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/components/bypass-panel.tsx) provides controls for hosts that should bypass interception:

- **Add bypass host** — adds a host to the bypass list so its traffic passes through without being paused.
- **Remove bypass host** — removes a host from the bypass list.

---

## API Layer

The [api.ts](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/api.ts) file wraps Tauri `invoke` calls for:

| Function | Backend Command | Description |
|---|---|---|
| `getInterceptStatus` | `get_intercept_status` | Returns the current intercept mode and enabled state |
| `getPausedRequests` | `get_paused_requests` | Returns all currently paused requests/responses |
| `setInterceptEnabled` | `set_intercept_enabled` | Enables or disables intercept mode globally |
| `setInterceptScope` | `set_intercept_scope` | Sets the capture host patterns for a specific tab |
| `forwardInterceptedRequest` | `forward_intercepted_request` | Forwards a modified request to the target server |
| `forwardInterceptedResponse` | `forward_intercepted_response` | Forwards a modified response to the client |
| `forwardInterceptedTab` | `forward_intercepted_tab` | Forwards all paused items for a tab |
| `dropInterceptedRequest` | `drop_intercepted_request` | Drops a paused request without forwarding |

---

## Utility Functions

The [lib.ts](file:///Users/arham/Desktop/project/apprecon/src/pages/intercept/lib.ts) provides helper functions:

| Function | Description |
|---|---|
| `getRequestHost` | Extracts the host from a paused request |
| `getRequestPath` | Extracts the URL path from a paused request |
| `getPausedDirection` | Returns `'request'` or `'response'` based on which part is paused |
| `buildRawPausedMessage` | Builds the raw HTTP message string for the editor |
| `buildRawPausedRequest` | Builds just the raw HTTP request string |
| `formatRequestTime` | Formats a Unix timestamp for display |

---

## Capture Host Matching

The `capturePatternMatchesHost` function (in the store) supports wildcard matching:

- Exact match: `example.com` matches `example.com`
- Wildcard prefix: `*.example.com` matches `sub.example.com` and `deep.sub.example.com`
- Port-insensitive: host matching ignores port numbers

When the active tab changes or its capture hosts are modified, `syncActiveScope` is called to update the proxy backend with the new scope rules.

---

## Backend

The intercept backend (in `src-tauri/src/proxy/`) manages:

- **Intercept mode** — a global on/off toggle that determines whether the proxy pauses matching traffic.
- **Per-tab scopes** — each frontend tab has its own set of capture host patterns registered with the proxy.
- **Paused request queue** — requests matching a tab's capture hosts are paused and held in memory until the user acts on them.
- **Forward/drop mechanics** — when a request is forwarded, the proxy sends it to the target server; when dropped, the connection is closed without forwarding.

---

## Typical Workflow

1. **Start the proxy** if not already running.
2. **Enable Intercept** using the toggle switch in the request editor header.
3. **Add capture hosts** to the active tab's capture list (via context menu or manual configuration).
4. **Browse or use browser automation** — matching traffic is automatically paused.
5. **Inspect** paused requests in the queue panel.
6. **Edit** the raw request/response in the editor if modification is needed.
7. **Forward** to send the modified request/response, or **Drop** to discard it.
8. Use **Intercept response** to forward a request but pause its server response for inspection.
