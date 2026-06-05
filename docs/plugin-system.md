# AppRecon Plugin System — Polished Implementation Plan

## 1. Overview

AppRecon needs a plugin system that allows third-party and user-authored extensions to add functionality without bloating the core application.

The plugin system should support:

- Passive traffic analysis
- On-demand security tools
- Plugin panels inside the UI
- Future request/response interception
- Future WASM sandboxed plugins

Because AppRecon is an offline-first desktop security tool, the plugin system should be designed with a **local threat model**. Offline does not mean risk-free. Plugins still run on the user’s machine and may access sensitive proxy traffic, credentials, tokens, local files, or the AppRecon database if not controlled properly.

The safest approach is:

```txt
Subprocess-first MVP
        ↓
Permission-gated plugins
        ↓
Redacted proxy data by default
        ↓
Passive + tool plugins first
        ↓
Interceptor plugins later
        ↓
Schema-driven UI first
        ↓
WASM sandbox in Phase 2
        ↓
Signed plugin packages in Phase 3
```

---

## 2. Goals

### Primary Goals

- Allow AppRecon to be extended without changing core code.
- Support simple plugin development using Python, Node.js, or compiled binaries.
- Keep plugins isolated from the main AppRecon process.
- Protect sensitive proxy data by default.
- Give users clear control over plugin permissions.
- Keep the first implementation realistic for an offline desktop app.

### Non-Goals for MVP

The first version should not include:

- Plugin marketplace
- Auto-updating plugins
- Arbitrary React/JavaScript UI injection
- Full filesystem access
- Unrestricted network access
- AI access from plugins
- Interceptor plugins modifying live traffic by default
- WASM runtime

These can be added later after the core plugin model is stable.

---

## 3. Threat Model

Even though AppRecon is offline-first, plugins are still risky because they execute local code.

### Main Risks

| Risk | Description |
|---|---|
| Local data access | A plugin may try to read SSH keys, browser profiles, environment variables, or local documents. |
| Proxy data exposure | Proxy traffic may contain cookies, JWTs, API keys, passwords, and private API responses. |
| Network exfiltration | A plugin could send captured data to the internet if it has network access. |
| Dependency supply-chain attack | A Python or Node plugin may install malicious dependencies. |
| App corruption | A plugin may corrupt AppRecon’s SQLite database or plugin registry. |
| Denial of service | A plugin may consume too much CPU, memory, logs, or event queue capacity. |
| Permission abuse | A plugin may request broad permissions and silently misuse them. |
| UI injection | Arbitrary plugin UI may introduce XSS-like behavior inside the desktop app. |

### Security Principle

Treat every plugin as **untrusted local code** unless it is official or explicitly verified.

---

## 4. Plugin Types

### MVP Plugin Types

| Type | Description | Example |
|---|---|---|
| Passive | Observes redacted completed proxy records without modifying traffic. | Security header analyzer |
| Tool | Runs on-demand actions triggered from UI. | JWT decoder, hash generator |
| UI Schema | Adds a panel rendered by AppRecon’s trusted UI components. | Findings dashboard |

### Future Plugin Types

| Type | Description | Reason to Delay |
|---|---|---|
| Interceptor | Can modify, block, or inject HTTP requests/responses. | High risk; can break traffic or abuse sessions. |
| Full UI | Custom web UI loaded from plugin. | Risky if plugin can run arbitrary frontend code. |
| WASM | Sandboxed plugin runtime. | Better security, but more implementation complexity. |

---

## 5. Runtime Strategy

### Phase 1 Runtime: Subprocess

MVP should use subprocess plugins with JSON-RPC over `stdin`/`stdout`.

Supported runtimes:

| Runtime | Implementation | MVP Support |
|---|---|---|
| Python | Subprocess + JSON-RPC | Yes |
| Node.js | Subprocess + JSON-RPC | Yes |
| Binary | Subprocess + JSON-RPC | Yes |
| WASM | `wasmtime` + WASI | Later |

### Why Subprocess First?

- Easier for plugin authors.
- Works with many languages.
- Keeps plugin crashes separate from AppRecon.
- Easier to implement than embedded interpreters.
- Fits desktop/offline distribution well.

### Important Limitation

Subprocess isolation is **not true sandboxing**.

A Python, Node.js, or binary plugin may still access local files, spawn child processes, or open network connections unless OS-level sandboxing is added. For MVP, AppRecon should control what data and APIs it gives to plugins, but it cannot fully control what a subprocess does outside AppRecon.

---

## 6. Communication Protocol

Use JSON-RPC 2.0 over line-delimited JSON.

### Host to Plugin

```json
{ "jsonrpc": "2.0", "method": "on_activate", "params": {}, "id": 1 }
```

```json
{
  "jsonrpc": "2.0",
  "method": "on_proxy_record",
  "params": {
    "record": {
      "id": "rec_123",
      "request": {
        "method": "GET",
        "url": "https://example.com",
        "headers": {
          "user-agent": "Mozilla/5.0"
        },
        "body": null
      },
      "response": {
        "status": 200,
        "headers": {
          "content-type": "text/html"
        },
        "body": null
      },
      "security": {
        "redacted": true,
        "bodyIncluded": false
      }
    }
  },
  "id": 2
}
```

### Plugin to Host

```json
{
  "jsonrpc": "2.0",
  "method": "ui.show_notification",
  "params": {
    "level": "info",
    "message": "Missing Content-Security-Policy header"
  },
  "id": 10
}
```

### JSON-RPC Rules

- One JSON object per line.
- Reject batch requests in MVP.
- Reject unknown methods.
- Validate method parameters.
- Limit maximum message size.
- Limit pending requests per plugin.
- Timeout every request.
- Log sensitive plugin actions.

Recommended limits:

```txt
Max message size: 1 MB
Max pending requests per plugin: 32
Startup timeout: 5 seconds
Request timeout: 30 seconds
Max plugin events per second: 50
Max log bytes per minute: 1 MB
```

---

## 7. Plugin Manifest

Each plugin must include a `plugin.json` file.

### Recommended Manifest v1

```json
{
  "manifestVersion": 1,
  "id": "header-inspector",
  "name": "Header Inspector",
  "version": "1.0.0",
  "description": "Analyzes security headers in HTTP responses",
  "author": "Security Team",
  "runtime": {
    "kind": "python",
    "entry": "main.py",
    "args": []
  },
  "pluginTypes": ["passive", "tool"],
  "permissions": {
    "proxy": {
      "read": true,
      "write": false,
      "intercept": false,
      "scope": {
        "hosts": ["*"],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE"],
        "includeRequestHeaders": true,
        "includeResponseHeaders": true,
        "includeBodies": false,
        "redactSecrets": true
      }
    },
    "network": {
      "enabled": false,
      "allowedHosts": []
    },
    "filesystem": {
      "read": [],
      "write": []
    },
    "storage": {
      "enabled": true,
      "quotaMb": 20
    },
    "ui": {
      "notifications": true,
      "panels": true
    },
    "ai": {
      "enabled": false
    }
  },
  "ui": {
    "label": "Headers",
    "icon": "shield",
    "route": "/plugins/header-inspector",
    "description": "View security header analysis"
  },
  "limits": {
    "startupTimeoutMs": 5000,
    "requestTimeoutMs": 30000,
    "maxPayloadBytes": 1048576,
    "maxEventsPerSecond": 50
  }
}
```

---

## 8. Manifest Fields

| Field | Required | Description |
|---|---:|---|
| `manifestVersion` | Yes | Manifest schema version. Start with `1`. |
| `id` | Yes | Unique plugin ID. Lowercase letters, numbers, hyphens, underscores. |
| `name` | Yes | Human-readable plugin name. |
| `version` | Yes | Semantic version. |
| `description` | No | Short description. |
| `author` | No | Author name. |
| `runtime` | Yes | Runtime kind, entry file, and optional args. |
| `pluginTypes` | Yes | One or more plugin types. |
| `permissions` | Yes | Capability-based permissions. |
| `ui` | No | UI route metadata. |
| `limits` | No | Plugin-specific runtime limits. |

---

## 9. Permission Model

Use capability-based permissions instead of broad permissions.

### Why?

A permission like `proxy_read` is too broad. A passive plugin does not always need full request bodies, cookies, authorization headers, or response bodies.

### Permission Categories

| Category | Purpose |
|---|---|
| `proxy` | Read, write, or intercept proxy traffic. |
| `network` | Make outbound network requests through AppRecon host API. |
| `filesystem` | Read/write allowed file scopes. |
| `storage` | Use plugin-specific persistent key-value storage. |
| `ui` | Show notifications and render panels. |
| `ai` | Use AppRecon AI features. Disabled for MVP. |

### Recommended Defaults

| Capability | Default |
|---|---|
| Proxy metadata | Allowed only if requested |
| Request headers | Allowed only if requested |
| Response headers | Allowed only if requested |
| Request body | Denied |
| Response body | Denied |
| Secrets | Redacted |
| Network access | Denied |
| Filesystem read | Denied |
| Filesystem write | Denied |
| Storage | Denied unless requested |
| UI notifications | Denied unless requested |
| AI access | Denied |

---

## 10. Sensitive Data Redaction

Before proxy records are sent to plugins, AppRecon must pass them through a redaction layer.

### Always Redact by Default

Headers:

- `Authorization`
- `Cookie`
- `Set-Cookie`
- `Proxy-Authorization`
- `X-API-Key`
- `X-Auth-Token`
- `X-CSRF-Token`

Body fields:

- `password`
- `token`
- `access_token`
- `refresh_token`
- `secret`
- `api_key`
- `session`
- `csrf`
- `private_key`

### Example Redacted Headers

```json
{
  "authorization": "[REDACTED]",
  "cookie": "[REDACTED]",
  "set-cookie": "[REDACTED]",
  "content-type": "application/json"
}
```

### Body Handling

For MVP:

```txt
Do not send request or response bodies to passive plugins by default.
```

Later, allow body access only with explicit approval:

```json
{
  "proxy": {
    "scope": {
      "includeBodies": true,
      "maxBodyBytes": 65536,
      "redactSecrets": true
    }
  }
}
```

---

## 11. Plugin Trust Levels

Trust level should be stored in the AppRecon registry, not declared by the plugin author.

```ts
type PluginTrustLevel =
  | "local_dev"
  | "user_installed"
  | "verified"
  | "official";
```

| Trust Level | Meaning |
|---|---|
| `local_dev` | Plugin is being developed locally by the user. |
| `user_installed` | Plugin was manually installed from an unknown source. |
| `verified` | Plugin was signed or reviewed. |
| `official` | Plugin is shipped by AppRecon. |

MVP can start with:

```txt
local_dev
user_installed
official
```

---

## 12. Plugin Registry

Store installed plugin state in:

```txt
~/.apprecon/plugins.json
```

### Recommended Registry Format

```json
{
  "plugins": {
    "header-inspector": {
      "id": "header-inspector",
      "path": "/Users/arham/.apprecon/plugins/header-inspector",
      "enabled": true,
      "trustLevel": "user_installed",
      "installedAt": "2026-06-05T00:00:00Z",
      "manifestHash": "sha256:...",
      "packageHash": "sha256:...",
      "approvedPermissionsHash": "sha256:...",
      "lastStartedAt": "2026-06-05T00:10:00Z",
      "lastError": null
    }
  }
}
```

### Registry Responsibilities

- Track installed plugins.
- Track enabled/disabled status.
- Track approved permissions.
- Track plugin trust level.
- Track plugin file hashes.
- Detect manifest changes.
- Detect permission changes.
- Store runtime health metadata.

---

## 13. Directory Structure

```txt
~/.apprecon/
├── 0xbuffer.db
├── plugins.json
├── plugin-storage/
│   └── header-inspector/
│       └── storage.json
├── plugin-logs/
│   └── header-inspector.log
└── plugins/
    ├── header-inspector/
    │   ├── plugin.json
    │   ├── main.py
    │   └── requirements.txt
    ├── jwt-toolkit/
    │   ├── plugin.json
    │   └── index.js
    └── custom-binary-tool/
        ├── plugin.json
        └── tool
```

---

## 14. Plugin Installation Flow

### Install Steps

1. User selects plugin folder or plugin package.
2. AppRecon copies the plugin into `~/.apprecon/plugins/{plugin_id}`.
3. AppRecon rejects symlinks.
4. AppRecon validates `plugin.json`.
5. AppRecon validates plugin ID format.
6. AppRecon validates runtime kind.
7. AppRecon validates entry path.
8. AppRecon checks that entry path stays inside plugin directory.
9. AppRecon calculates manifest hash.
10. AppRecon calculates package hash.
11. AppRecon displays permission approval screen.
12. User approves or cancels.
13. AppRecon stores approved permissions.
14. Plugin is installed as disabled by default.
15. User manually enables the plugin.

### Entry Path Safety

Reject this:

```json
{
  "entry": "../../malware"
}
```

Rust check:

```rust
let plugin_root = plugin_dir.canonicalize()?;
let entry_path = plugin_dir.join(&manifest.runtime.entry).canonicalize()?;

if !entry_path.starts_with(&plugin_root) {
    return Err("Invalid plugin entry path".into());
}
```

---

## 15. Permission Approval UI

When installing or enabling a plugin, show clear permission information.

Example:

```txt
Header Inspector wants to:

✓ Read response headers
✓ Read request metadata
✓ Use plugin storage up to 20 MB
✓ Show notifications

It cannot:

✕ Read request bodies
✕ Read response bodies
✕ Read cookies or authorization headers
✕ Modify traffic
✕ Access local files
✕ Access the internet
✕ Use AI features
```

### Dangerous Permission Warning

| Permission | Warning |
|---|---|
| Request/response body access | Can expose passwords, tokens, private API data. |
| Network access | Can send captured data outside your machine. |
| Filesystem read | Can read local files. |
| Filesystem write | Can modify local files. |
| Proxy write/intercept | Can modify live traffic. |
| AI access | May send selected data to an AI provider. |

If a plugin update changes permissions, require approval again.

---

## 16. Runtime Process Security

### Start Plugin with Minimal Environment

Avoid inheriting the full user environment.

Bad:

```rust
Command::new("python")
    .arg("main.py")
    .spawn()
```

Better:

```rust
Command::new("python")
    .arg("main.py")
    .current_dir(plugin_dir)
    .env_clear()
    .env("APPRECON_PLUGIN_ID", &manifest.id)
    .env("APPRECON_PLUGIN_MODE", "subprocess")
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
```

### Runtime Rules

- Do not expose AppRecon database path.
- Do not expose API keys.
- Do not expose full environment variables.
- Capture stderr separately.
- Limit plugin log size.
- Kill plugin when disabled.
- Kill plugin when unresponsive.
- Restart only with backoff.
- Stop restarting after repeated crashes.

---

## 17. Host API Firewall

Every plugin-to-host call must go through a central permission firewall.

### Required Checks

For every API call:

1. Identify plugin ID.
2. Check plugin is installed.
3. Check plugin is enabled.
4. Check plugin process is valid.
5. Check method is allowed.
6. Check permission exists.
7. Check scope matches.
8. Validate params.
9. Enforce rate limit.
10. Write audit log.
11. Dispatch API call.

### Example Structure

```rust
pub async fn handle_plugin_host_call(
    plugin_id: &str,
    method: &str,
    params: serde_json::Value,
) -> Result<serde_json::Value, PluginError> {
    let plugin = registry.get(plugin_id)?;

    permission_guard.check(&plugin, method, &params)?;
    schema_validator.validate(method, &params)?;
    rate_limiter.check(plugin_id, method)?;
    audit_log.record(plugin_id, method, &params).await?;

    dispatch_host_api(plugin_id, method, params).await
}
```

---

## 18. Host APIs

### MVP Host APIs

| Method | Permission | Description |
|---|---|---|
| `storage.get` | `storage` | Read plugin-specific storage. |
| `storage.set` | `storage` | Write plugin-specific storage. |
| `ui.show_notification` | `ui.notifications` | Show a toast notification. |
| `ui.emit_finding` | `ui.panels` | Add a finding to plugin panel. |
| `proxy.get_record` | `proxy.read` | Read one redacted proxy record by ID. |
| `proxy.search_history` | `proxy.read` | Search redacted proxy history. |

### Future Host APIs

| Method | Permission | Description |
|---|---|---|
| `proxy.send_request` | `proxy.write` | Send a new HTTP request. |
| `proxy.modify_request` | `proxy.intercept` | Modify intercepted request. |
| `proxy.modify_response` | `proxy.intercept` | Modify intercepted response. |
| `network.request` | `network` | Make outbound request through host API. |
| `fs.read` | `filesystem.read` | Read approved file scope. |
| `fs.write` | `filesystem.write` | Write approved file scope. |
| `ai.chat` | `ai` | Use AppRecon AI capability. |

---

## 19. Proxy Hook Design

### MVP Hook

```txt
on_proxy_record
```

This runs after the request/response is completed and saved to the database.

Flow:

```txt
Proxy request completed
        ↓
Save record to database
        ↓
Build redacted plugin-safe record
        ↓
Push event into plugin queue
        ↓
Plugin processes event asynchronously
```

This avoids blocking live proxy traffic.

### Future Interceptor Hooks

```txt
on_before_request
on_before_response
```

Interceptor plugins should be added later because they can modify or block live traffic.

### Interceptor Failure Policy

When interceptor support is added, the user should choose:

```txt
If interceptor plugin fails:
- Allow request
- Block request
- Ask user
```

Recommended default:

```txt
Allow request and show warning
```

---

## 20. Event Queue

Each enabled plugin should have its own event queue.

### Queue Rules

- Passive events are async.
- Slow plugins should not block proxy traffic.
- Queue size must be limited.
- Drop or skip events when queue is full.
- Show plugin warning if events are dropped.
- Record dropped event count in plugin status.

Recommended:

```txt
Max queue size per plugin: 500 events
On queue full: drop oldest event
```

---

## 21. Audit Log

AppRecon should log sensitive plugin activity.

### Log Examples

```txt
[2026-06-05T14:20:00Z] plugin=header-inspector action=proxy.read scope=response_headers
[2026-06-05T14:20:04Z] plugin=jwt-toolkit action=storage.set key=recent_tokens
[2026-06-05T14:20:10Z] plugin=custom-tool action=ui.show_notification level=warning
```

### UI Location

```txt
Settings → Plugins → Activity Log
```

### Audit Log Should Include

- Plugin ID
- Action/method
- Timestamp
- Result: success/error/denied
- Permission used
- Target host if applicable
- Error message if failed

Do not log full sensitive payloads.

---

## 22. UI Plugin Strategy

Do not allow arbitrary React/JavaScript UI execution in MVP.

### Recommended MVP: Schema-Driven UI

Plugin returns a UI schema:

```json
{
  "type": "panel",
  "title": "Header Inspector",
  "components": [
    {
      "type": "table",
      "title": "Missing Security Headers",
      "columns": [
        { "key": "url", "label": "URL" },
        { "key": "missing", "label": "Missing Headers" },
        { "key": "risk", "label": "Risk" }
      ],
      "data": [
        {
          "url": "https://example.com",
          "missing": "content-security-policy",
          "risk": "medium"
        }
      ]
    }
  ]
}
```

AppRecon renders this using trusted native components.

### Supported Components for MVP

- Text
- Badge
- Table
- Key-value list
- Finding card
- Button action
- Empty state

### Delay Full Custom UI

Avoid this in MVP:

```txt
Plugin ships arbitrary React bundle and AppRecon loads it directly.
```

This creates a much larger attack surface.

---

## 23. Backend Module Structure

Recommended Rust/Tauri modules:

```txt
src-tauri/src/plugins/
├── mod.rs
├── manifest.rs              # Manifest structs + validation
├── registry.rs              # Installed plugin registry
├── install.rs               # Install/uninstall/hash/path safety
├── state.rs                 # PluginManager central state
├── commands.rs              # Tauri commands
├── permissions.rs           # Permission/capability checks
├── redaction.rs             # Proxy record redaction
├── audit.rs                 # Plugin activity audit logs
├── limits.rs                # Timeout, payload, queue limits
├── storage.rs               # Plugin-specific storage
├── ui_schema.rs             # Plugin UI schema validation
├── errors.rs
└── runtime/
    ├── mod.rs               # PluginRuntime trait
    ├── subprocess.rs        # Subprocess runtime
    └── jsonrpc.rs           # JSON-RPC protocol handling
```

### `mod.rs`

```rust
pub mod audit;
pub mod commands;
pub mod errors;
pub mod install;
pub mod limits;
pub mod manifest;
pub mod permissions;
pub mod redaction;
pub mod registry;
pub mod runtime;
pub mod state;
pub mod storage;
pub mod ui_schema;

pub use manifest::{PluginManifest, PluginType, PluginRuntimeKind};
pub use registry::PluginRegistry;
pub use state::{PluginInfo, PluginManager, PluginStatus, PluginUiRoute};
```

---

## 24. Runtime Trait

```rust
#[async_trait::async_trait]
pub trait PluginRuntime: Send + Sync {
    async fn start(
        &mut self,
        manifest: &PluginManifest,
        plugin_dir: &std::path::Path,
    ) -> Result<(), PluginError>;

    async fn stop(&mut self) -> Result<(), PluginError>;

    async fn invoke(
        &self,
        method: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value, PluginError>;

    async fn notify(
        &self,
        method: &str,
        params: serde_json::Value,
    ) -> Result<(), PluginError>;

    fn is_running(&self) -> bool;
}
```

---

## 25. Tauri Commands

```rust
#[tauri::command]
pub async fn list_plugins(
    app: tauri::AppHandle,
) -> Result<Vec<PluginInfo>, String>;

#[tauri::command]
pub async fn install_plugin(
    app: tauri::AppHandle,
    path: String,
) -> Result<String, String>;

#[tauri::command]
pub async fn uninstall_plugin(
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String>;

#[tauri::command]
pub async fn enable_plugin(
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String>;

#[tauri::command]
pub async fn disable_plugin(
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String>;

#[tauri::command]
pub async fn get_plugin_details(
    app: tauri::AppHandle,
    id: String,
) -> Result<PluginManifest, String>;

#[tauri::command]
pub async fn get_plugin_activity_log(
    app: tauri::AppHandle,
    id: Option<String>,
) -> Result<Vec<PluginAuditEntry>, String>;

#[tauri::command]
pub async fn invoke_plugin_action(
    app: tauri::AppHandle,
    id: String,
    action: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String>;

#[tauri::command]
pub async fn get_plugin_ui_routes(
    app: tauri::AppHandle,
) -> Result<Vec<(String, PluginUiRoute)>, String>;
```

---

## 26. Frontend Structure

```txt
src/stores/
└── plugins.ts

src/pages/plugins/
├── index.tsx
├── hooks/
│   └── use-plugins-page.ts
└── components/
    ├── plugin-card.tsx
    ├── plugin-list.tsx
    ├── plugin-permission-dialog.tsx
    ├── plugin-activity-log.tsx
    ├── plugin-status-badge.tsx
    └── plugin-danger-zone.tsx

src/pages/plugin-runtime/
└── plugin-panel.tsx
```

### Navigation

Add:

```ts
{ label: "Plugins", icon: Plug, href: "/plugins" }
```

### Frontend Pages

| Page | Purpose |
|---|---|
| `/plugins` | List installed plugins. |
| `/plugins/:pluginId` | Render schema-driven plugin panel. |
| `/plugins/:pluginId/activity` | Show audit log for selected plugin. |
| `/plugins/:pluginId/settings` | Enable/disable and permissions overview. |

---

## 27. Plugin Store

```ts
interface PluginStore {
  plugins: PluginInfo[];
  loading: boolean;
  error: string | null;

  fetchPlugins: () => Promise<void>;
  installPlugin: (path: string) => Promise<string>;
  uninstallPlugin: (id: string) => Promise<void>;
  enablePlugin: (id: string) => Promise<void>;
  disablePlugin: (id: string) => Promise<void>;

  getPluginDetails: (id: string) => Promise<PluginManifest>;
  getActivityLog: (id?: string) => Promise<PluginAuditEntry[]>;
  invokeAction: (
    id: string,
    action: string,
    params: unknown
  ) => Promise<unknown>;

  getUiRoutes: () => Promise<[string, PluginUiRoute][]>;
}
```

---

## 28. Database Tables

If you want plugin metadata in SQLite instead of only `plugins.json`, use these tables.

### `plugins`

```sql
CREATE TABLE plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  path TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  trust_level TEXT NOT NULL DEFAULT 'user_installed',
  manifest_hash TEXT NOT NULL,
  package_hash TEXT,
  approved_permissions_hash TEXT,
  installed_at TEXT NOT NULL,
  last_started_at TEXT,
  last_error TEXT
);
```

### `plugin_audit_logs`

```sql
CREATE TABLE plugin_audit_logs (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  permission TEXT,
  status TEXT NOT NULL,
  target TEXT,
  message TEXT,
  created_at TEXT NOT NULL
);
```

### `plugin_storage`

```sql
CREATE TABLE plugin_storage (
  plugin_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (plugin_id, key)
);
```

For MVP, either SQLite or file-based registry is acceptable. Since AppRecon already uses SQLite, storing plugin state in SQLite is cleaner.

---

## 29. Proxy Integration

In proxy completion flow:

```rust
// After saving proxy record to DB
if let Some(plugin_manager) = app_handle.try_state::<PluginManager>() {
    let manager = plugin_manager.inner().clone();
    let record_id = saved_record.id.clone();

    tokio::spawn(async move {
        if let Err(err) = manager.notify_proxy_record_completed(record_id).await {
            tracing::warn!("failed to notify plugins: {err}");
        }
    });
}
```

Inside `PluginManager`:

```rust
pub async fn notify_proxy_record_completed(
    &self,
    record_id: String,
) -> Result<(), PluginError> {
    let record = self.proxy_store.get_record(&record_id).await?;

    for plugin in self.enabled_passive_plugins().await? {
        let safe_record = self.redactor.redact_for_plugin(&plugin, &record)?;
        self.event_queue.push(plugin.id.clone(), PluginEvent::ProxyRecord(safe_record)).await?;
    }

    Ok(())
}
```

---

## 30. MVP Plugin Examples

### 1. Security Header Analyzer

Permissions:

```json
{
  "proxy": {
    "read": true,
    "scope": {
      "includeRequestHeaders": false,
      "includeResponseHeaders": true,
      "includeBodies": false,
      "redactSecrets": true
    }
  },
  "ui": {
    "notifications": true,
    "panels": true
  }
}
```

### 2. JWT Decoder

Permissions:

```json
{
  "ui": {
    "notifications": true,
    "panels": true
  },
  "storage": {
    "enabled": false
  }
}
```

### 3. Response Size Monitor

Permissions:

```json
{
  "proxy": {
    "read": true,
    "scope": {
      "includeRequestHeaders": false,
      "includeResponseHeaders": true,
      "includeBodies": false,
      "redactSecrets": true
    }
  }
}
```

### 4. Notes and Tagging Plugin

Permissions:

```json
{
  "storage": {
    "enabled": true,
    "quotaMb": 20
  },
  "ui": {
    "panels": true
  }
}
```

---

## 31. Implementation Phases

### Phase 1 — Plugin Registry and Manifest

Build:

- Manifest structs
- Manifest validation
- Plugin discovery
- Install/uninstall
- Enable/disable
- Plugin registry
- Hash tracking
- Permission approval UI

Do not execute plugins yet.

Estimated effort: **3–5 days**

---

### Phase 2 — Subprocess Runtime

Build:

- JSON-RPC handler
- Start/stop plugin process
- Timeout handling
- Crash detection
- Stderr/stdout log capture
- Message size limits
- Plugin health status

Estimated effort: **4–6 days**

---

### Phase 3 — Permission Firewall and Security Layer

Build:

- Permission checker
- Scoped permissions
- Redaction layer
- Audit logs
- Rate limits
- Plugin storage API
- Host API dispatcher

Estimated effort: **4–6 days**

---

### Phase 4 — Passive Proxy Hooks

Build:

- `on_proxy_record`
- Async event queue
- Redacted record delivery
- Per-plugin event filtering
- Dropped event handling

Estimated effort: **3–5 days**

---

### Phase 5 — Tool Plugins and UI Schema

Build:

- `invoke_plugin_action`
- Schema-driven plugin panels
- Plugin findings UI
- Plugin notifications
- Plugin action buttons

Estimated effort: **4–6 days**

---

### Phase 6 — Interceptor Plugins

Build later:

- `on_before_request`
- `on_before_response`
- Modify/block/allow decisions
- Timeout policy
- Decision audit logs
- User failure policy

Estimated effort: **5–8 days**

---

### Phase 7 — WASM Runtime

Build later:

- `wasmtime`
- WASI permission mapping
- Memory limits
- Fuel/epoch interruption
- Sandboxed storage
- No default network/filesystem access

Estimated effort: **7–12 days**

---

### Phase 8 — Signed Plugin Packages

Build later:

- `.apprecon-plugin` package format
- Signature verification
- Public key trust store
- Plugin update verification
- Verified/official badges

Estimated effort: **5–8 days**

---

## 32. Recommended MVP Scope

### Include in MVP

- Plugin list page
- Install plugin from local folder
- Enable/disable plugin
- Manifest validation
- Permission approval
- Hash tracking
- Subprocess runtime
- JSON-RPC
- Passive proxy events
- Tool plugin actions
- Schema-driven UI panels
- Plugin-specific storage
- Notifications
- Audit logs
- Redaction by default

### Exclude from MVP

- Plugin marketplace
- Auto-update
- Arbitrary UI bundle loading
- Interceptor plugins
- Network access
- Filesystem access
- AI access
- WASM runtime
- Signed packages

---

## 33. Best Implementation Order

Recommended order:

```txt
1. Manifest schema
2. Plugin registry
3. Install/enable/disable UI
4. Permission approval UI
5. Subprocess runtime
6. JSON-RPC request/response
7. Host API dispatcher
8. Permission firewall
9. Audit log
10. Redaction layer
11. Passive proxy event hook
12. Tool action invocation
13. Schema-driven UI panel
14. Plugin SDK examples
```

This order keeps the system testable and avoids exposing sensitive proxy data before the security layer is ready.

---

## 34. Final Recommendation

For AppRecon, the best plugin system is not just “a way to run extensions.” It should be a controlled execution layer.

The MVP should be conservative:

```txt
Passive + tool plugins only
Redacted data by default
No network by default
No filesystem by default
No body access by default
No arbitrary UI code
Permission approval required
Audit everything sensitive
```

This gives AppRecon a useful plugin ecosystem while protecting users from the biggest risks of local plugin execution.

After the MVP is stable, AppRecon can safely move toward:

```txt
Interceptor plugins
WASM sandbox
Signed packages
Verified plugin marketplace
Advanced UI plugins
```

The most important design decision is this:

> A plugin should only receive the minimum data and capability it needs to do its job.

That principle will keep AppRecon safer, even as the plugin system becomes more powerful.
