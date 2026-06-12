# AppRecon Automation System

## Overview

The automation system is a visual workflow builder where users create automations by connecting **trigger → condition → action** nodes on a React Flow canvas. Workflows are stored in a Zustand store with `localStorage` persistence and executed by a BFS-based runtime engine.

### Architecture

```
automation/
├── types.ts                  # TriggerType, ConditionType, ActionType, NodeConfig, WorkflowDef
├── constants.ts              # NODE_TYPE_REGISTRY, categories, styling
├── templates.ts              # 7 pre-built workflow templates
├── index.tsx                 # Page entry: ReactFlowProvider, tabs, layout, TemplatesDialog
├── hooks/
│   ├── use-automation-page.ts  # Tab orchestration, templates dialog state
│   └── use-workflow-canvas.ts  # React Flow nodes/edges state, context menu, persist
├── components/
│   ├── workflow-canvas.tsx      # ReactFlow wrapper
│   ├── workflow-toolbar.tsx     # Run/stop/save controls + node palette trigger
│   ├── workflow-list-panel.tsx  # Sidebar workflow list
│   ├── node-palette.tsx         # "Add Node" flyout grouped by category
│   ├── node-config-panel.tsx    # Right panel: Config / Queue / Captured / Properties tabs
│   ├── canvas-context-menu.tsx  # Right-click → add node
│   ├── execution-log-panel.tsx  # Bottom log panel
│   └── templates-dialog.tsx     # "New Workflow" dialog with blank + 7 templates
├── nodes/
│   ├── trigger-node.tsx         # Blue-bordered canvas node
│   ├── condition-node.tsx       # Amber-bordered canvas node
│   ├── action-node.tsx          # Green-bordered canvas node
│   ├── node-capability-badge.tsx
│   ├── node-delete-button.tsx
│   ├── node-runtime-status.tsx
│   ├── index.ts
│   └── nodes-config/
│       ├── trigger-config.tsx   # Config forms for all 12 triggers
│       ├── condition-config.tsx # Operator + value form for 12 conditions
│       └── action-config.tsx    # Param forms for all 19 actions
├── lib/
│   ├── edges.ts                 # Edge building, markers, default options
│   ├── workflow-readiness.ts    # Pre-flight validation
│   ├── workflow-runtime.ts
│   ├── node-capabilities.ts
│   └── node-warnings.ts         # Live-traffic setup warning
└── triggers/
    └── documents/               # Document I/O used by action:add-to-report
```

---

## Node Type System

### Triggers (12)

| Type                              | Label                 | Config Fields                         |
| --------------------------------- | --------------------- | ------------------------------------- |
| `trigger:new-request`             | New Request           | method, host, operator, value         |
| `trigger:new-response`            | New Response          | host, operator, value                 |
| `trigger:finding-created`         | Finding Created       | severity (info/critical)              |
| `trigger:scan-completed`          | Scan Completed        | info-only (no config)                 |
| `trigger:scheduled`               | Scheduled             | cron schedule                         |
| `trigger:manual`                  | Manual                | Run button                            |
| `trigger:browser-page-crawled`    | Page Crawled          | operator, value (URL pattern)         |
| `trigger:intercept-request`       | Intercept Request     | method, host, operator, value         |
| `trigger:websocket-message`       | WebSocket Message     | direction (sent/received/both), operator, value |
| `trigger:port-scan-result`        | Port Scan Result      | port(s), host whitelist               |
| `trigger:inspector-connected`     | Inspector Connected   | info-only (no config)                 |
| `trigger:live-traffic-captured`   | Live Traffic Captured | method, host, operator, value         |

Each trigger's configuration is defined by the `TriggerConfig` interface:

```ts
interface TriggerConfig {
  triggerType: TriggerType;
  schedule?: string;
  host?: string;
  method?: string;
  operator?: 'equals' | 'contains' | 'regex';
  value?: string;
  severity?: string;
  port?: string;
  direction?: 'sent' | 'received';
}
```

### Conditions (12)

| Type                       | Label          | Operator Options                               |
| -------------------------- | -------------- | ---------------------------------------------- |
| `condition:status-code`    | Status Code    | equals, not_equals, contains, gt, lt, regex    |
| `condition:url-contains`   | URL Contains   | equals, not_equals, contains, gt, lt, regex    |
| `condition:body-contains`  | Body Contains  | equals, not_equals, contains, gt, lt, regex    |
| `condition:header-exists`  | Header Exists  | equals (no value input)                        |
| `condition:severity`       | Severity       | equals, not_equals, contains, gt, lt, regex    |
| `condition:ai-confidence`  | AI Confidence  | equals, not_equals, contains, gt, lt, regex    |
| `condition:method`         | HTTP Method    | equals, not_equals, contains, gt, lt, regex    |
| `condition:content-type`   | Content-Type   | equals, not_equals, contains, gt, lt, regex    |
| `condition:response-size`  | Response Size  | equals, not_equals, contains, gt, lt, regex    |
| `condition:crawl-status`   | Crawl Status   | equals, not_equals, contains, gt, lt, regex    |
| `condition:grep-match`     | Grep Match     | equals, not_equals, contains, gt, lt, regex    |
| `condition:port-open`      | Port Open      | equals, not_equals, contains, gt, lt, regex    |

Operator labels: Equals, Not equals, Contains, Greater than, Less than, Regex. Each condition has context-sensitive placeholder text.

### Actions (19)

| Type                      | Label              | Config Params                                    |
| ------------------------- | ------------------ | ------------------------------------------------ |
| `action:send-to-repeater` | Send to Repeater   | (none)                                           |
| `action:ai-analyze`       | AI Analyze         | (none)                                           |
| `action:create-finding`   | Create Finding     | severity (critical/info)                         |
| `action:add-to-report`    | Add to Report      | documentId, section, title, content, mode        |
| `action:send-webhook`     | Send Webhook       | method (GET/POST/...), url                       |
| `action:show-notification`| Notification       | title, body                                      |
| `action:run-script`       | Run Script         | command                                          |
| `action:start-crawl`      | Start Crawl        | url, maxDepth                                    |
| `action:stop-crawl`       | Stop Crawl         | (none)                                           |
| `action:send-to-intercept`| Send to Intercept  | (none)                                           |
| `action:start-invoker`    | Start Invoker      | mode (sniper/battering-ram/pitchfork/cluster-bomb)|
| `action:port-scan`        | Port Scan          | target, preset (quick/web/top-100/full/custom)   |
| `action:encode-decode`    | Encode / Decode    | mode (encode/decode), codec (url/base64/hex)     |
| `action:hash-data`        | Hash Data          | algorithm (md5/sha1/sha256/sha512/sha3-256)      |
| `action:export-json`      | Export JSON        | filename                                         |
| `action:create-document`  | Create Document    | template (blank/developer/qa/security-researcher)|
| `action:add-to-document`  | Add to Document    | section                                          |
| `action:connect-cdp`      | Connect Inspector  | (none)                                           |
| `action:script-analyze`   | Script Analyzer    | (none)                                           |

Actions with no params display a "needs no extra configuration" message. Each action has its own dedicated form component registered in `ACTION_CONFIG_MAP`.

---

## Store Architecture

The Zustand store (`useAutomationStore`) is split into 4 slices with `localStorage` persist middleware:

```
src/stores/automation/
├── index.ts              # Combined store with persist merge logic
├── types.ts              # ExecutionLog, NodeRuntimeState, LiveTrafficHostInsight, AutomationState
├── constants.ts          # Log caps, insight limits, abort controller registry
└── slices/
    ├── workflows-slice.ts    # CRUD, template creation, dirty tracking
    ├── execution-slice.ts    # runWorkflow BFS engine, abort, stop
    ├── logs-slice.ts         # executionLogs, nodeRuntimeById
    ├── runtime-slice.ts      # nodeRuntimeById operators
    └── live-traffic-slice.ts # Host insights, queue stats, settings
```

**Persist strategy**: Only `workflows`, `activeWorkflowId`, and `automationSettings` are persisted. Runtime state (logs, node status, live traffic queue) is re-initialized on reload.

### Key Store Methods

| Method                             | Description                                              |
| ---------------------------------- | -------------------------------------------------------- |
| `createWorkflow()`                 | Creates blank workflow with UUID                         |
| `createWorkflowFromTemplate(id)`   | Creates workflow from template + pre-built nodes/edges   |
| `saveWorkflow(nodes, edges)`       | Saves active workflow                                    |
| `saveWorkflowById(id, nodes, edges)`| Saves specific workflow                                  |
| `deleteWorkflow(id)`               | Deletes workflow + cleans up runtime state               |
| `deleteWorkflows(ids)`             | Bulk delete + cleanup                                    |
| `toggleWorkflowEnabled(id)`        | Toggles enabled flag                                     |
| `runWorkflow(id, context?)`        | BFS execution with abort support                         |
| `abortWorkflow(id, reason?)`       | Aborts with reason, marks running nodes as skipped       |
| `stopWorkflow()`                   | Aborts active run workflow                               |
| `appendExecutionLog(log)`          | Adds log entry + updates node runtime status             |

---

## Workflow Canvas (React Flow)

The canvas uses `@xyflow/react` with:

- **Single trigger enforcement**: Only one trigger node per workflow. Adding a second trigger from palette or context menu is silently blocked.
- **Right-click context menu**: Opens categorized node palette at cursor position.
- **Node selection**: Click a node to open its configuration in the right panel.
- **Edge styling**: Arrow-closed markers, primary-colored lines.
- **Auto-persist**: Saves on every change (node add/move/connect), on tab switch (cleanup effect), and on Ctrl/Cmd+S.
- **Node type registry**: All 43 node types (12 triggers + 12 conditions + 19 actions) are registered with their respective node components.

---

## Node Configuration Panels

### Trigger Config (`trigger-config.tsx`)

Reusable widget components serve all 12 triggers:

- **`HttpMethodFilter`** — Dropdown for HTTP method (ANY/GET/POST/.../OPTIONS)
- **`HostWhitelistFilter`** — Textarea for host/URL whitelist with wildcard support
- **`UrlPatternFilter`** — Operator dropdown + value input for URL matching
- **`TriggerInfoPanel`** — Info display for config-free triggers (scan-completed, inspector-connected)

Each trigger group renders a bordered section with the appropriate widgets and help text.

### Condition Config (`condition-config.tsx`)

Simple form with operator dropdown (context-dependent labels) and value input. The `header-exists` condition hides the value field since it only needs the header name. Each condition type has a context-sensitive placeholder (e.g., "e.g. 500" for status codes, "e.g. application/json" for content-type).

### Action Config (`action-config.tsx`)

Uses an `ACTION_CONFIG_MAP` to render the correct form component for each action type. The `useActionParams` hook normalizes `params` access. Unconfigured actions show a "no extra configuration" message.

### Node Config Panel Tabs

The right panel has 4 tabs:

1. **Config** — The node's configuration form (trigger/condition/action)
2. **Queue** — Live traffic queued hosts (only for `live-traffic-captured` triggers)
3. **Captured** — Recently captured hosts (only for `live-traffic-captured` triggers)
4. **Properties** — Node type, ID, capabilities

---

## Workflow Execution Engine

### BFS Topological Walk

The engine finds all nodes with no incoming edges (triggers), then walks them in topological (BFS) order:

1. **Readiness check** — Validates workflow has nodes, a trigger, and no missing required config
2. **Abort controller** — Creates an `AbortController` per run; superseded runs are aborted
3. **Template resolution** — `{{key}}` placeholders in action params are resolved from `WorkflowContext.data`
4. **Step execution** — Each node is processed:
   - **`action:add-to-report`** — Actually writes to the document store via `writeDocument()`
   - **Trigger nodes** — Log trigger data (host) from context
   - **Other actions/conditions** — Simulated with 300–700ms delay
5. **Abort handling** — Checks `signal.aborted` before every step; marks remaining nodes as skipped
6. **Completion** — Logs summary with visited/unreachable node counts

### Runtime Status Tracking

Each node gets a `NodeRuntimeState` during execution:
- `running` → `success` / `error` / `skipped`
- Displayed on canvas nodes as colored status indicators
- Timing tracked via `updatedAt` timestamps

---

## Workflow Templates

7 pre-built templates across 4 categories, available in the "New Workflow" dialog:

### Monitoring
1. **Live Traffic Alert** — `live-traffic-captured` → `status-code=500` → notification + repeater
2. **API Request Analyzer** — `new-request` → `method=POST` → AI analyze + export JSON

### Security
3. **Auto-Triage Findings** — `finding-created` → `severity=high` ∧ `ai-confidence>80` → create-finding(critical) + add-to-report
4. **Port Scan Alert** — `port-scan-result` → `port-open=443` ∨ `port-open=80` → notification + webhook

### Crawl
5. **Scheduled Crawl** — `scheduled(0 */6 * * *)` → start-crawl + connect-cdp + notification

### General
6. **Smart Intercept Review** — `intercept-request` → `url-contains=/api` → repeater + AI analyze
7. **Response Content Triage** — `new-response` → `content-type=json` ∧ `response-size>512` → AI analyze + add-to-document

Templates use `crypto.randomUUID()` for node/edge IDs and merge template config overrides with `NODE_TYPE_REGISTRY` defaults.

---

## Live Traffic Integration

The `live-traffic-captured` trigger connects to the proxy's real-time traffic capture:

- **`liveTrafficHostInsights`** — Queue of matched hosts pending execution
- **`liveTrafficCapturedHosts`** — Recently captured hosts (display only)
- **`liveTrafficQueueStatsByTriggerId`** — Per-trigger queue stats (pending/dropped/cap)
- **`AutomationRuntimeSettings`** — Concurrency, queue caps, dedupe TTL
- **Deduplication** — Recent match dedup via configurable TTL
- **Queue overflow** — Logs warnings when `dropped > 0`

---

## Workflow Readiness Validation

`getWorkflowReadiness()` performs pre-flight checks:

1. Workflow exists
2. At least one node
3. At least one trigger node
4. At least one node with no incoming edges (starting node)
5. Required config fields are non-blank:
   - Scheduled trigger needs a cron schedule
   - Webhook action needs a URL
   - Notification action needs a title
   - Run Script action needs a command
   - Start Crawl action needs a target URL
   - Port Scan action needs a target host
   - Add to Report action needs content
   - Add to Document action needs a section key

Returns `{ ready: boolean, reason: string | null }`.

---

## UI Components

| Component              | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `TabbedPageLayout`     | Shared tab bar from `src/pages/shared/` for workflow tabs      |
| `WorkflowCanvas`       | `ReactFlow` wrapper passing `addNodeRef` and `persistRef`      |
| `WorkflowToolbar`      | Run/Stop/Save buttons + trigger palette + left panel toggle    |
| `WorkflowListPanel`    | Sidebar with workflow list, "+" opens templates dialog         |
| `NodePalette`          | Flyout panel showing nodes grouped by category                 |
| `NodeConfigPanel`      | Right panel with 4-tab layout for node configuration           |
| `CanvasContextMenu`    | Right-click menu showing categorized node palette at position  |
| `ExecutionLogPanel`    | Bottom panel with auto-scrolling log, collapsible              |
| `TemplatesDialog`      | Modal with blank option + 7 templates, category icons          |
| `TriggerNode`          | Canvas node with blue border, icon badge, delete button        |
| `ConditionNode`        | Canvas node with amber border, icon badge, delete button       |
| `ActionNode`           | Canvas node with green border, icon badge, delete button       |

---

## Design Principles

1. **Trigger config vs Condition config**: Trigger configuration filters at the event-source level (HTTP method, host, URL pattern, severity, port, direction). Conditions handle semantic/derived filtering (status code, response size, AI confidence, etc.). This avoids duplicating filter logic.

2. **Reusable widget components**: `HttpMethodFilter`, `HostWhitelistFilter`, `UrlPatternFilter`, and `TriggerInfoPanel` are shared across trigger forms.

3. **Action → Component map**: Each action has a dedicated `React.FC<ActionParams>` registered in `ACTION_CONFIG_MAP`, making it easy to add new actions without touching existing code.

4. **Single trigger per workflow**: Enforced at canvas level — the context menu and palette both check for existing triggers before adding.

5. **Persist as you go**: Every mutation (add/remove/connect/move nodes) immediately persists to the store, which is `localStorage`-backed. No explicit save button needed (but available for user confidence).

6. **Abort-safe execution**: Every `await` point checks `signal.aborted`. Superseded runs (new run while previous is active) abort the old controller cleanly.

7. **Template build from registry**: Templates define node types, positions, and config overrides. The `buildFromTemplate()` function resolves them against `NODE_TYPE_REGISTRY` defaults with fresh UUIDs.
