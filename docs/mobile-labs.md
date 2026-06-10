# Mobile Labs

## Overview

Mobile Labs is a sidecar for automated Android mobile app pentesting. It provisions an Android emulator, installs Frida instrumentation, bypasses root detection and SSL certificate pinning, and routes all app traffic through AppRecon's MITM proxy for capture in [Live Traffic](file:///Users/arham/Desktop/project/apprecon/docs/live-traffic.md).

The sidecar follows the same [JSON-lines contract](file:///Users/arham/Desktop/project/apprecon/sidecars/lib/events.mjs) and [harness pattern](file:///Users/arham/Desktop/project/apprecon/sidecars/index.mjs) as the existing [ai-engine sidecar](file:///Users/arham/Desktop/project/apprecon/docs/ai-assistant-feature-plan.md), making it fully compatible with the Tauri spawn-and-observe architecture.

---

## Architecture

### Data Flow

```
┌──────────────────────┐     ┌───────────────────────────────┐     ┌──────────────────────┐
│  Tauri Backend (Rust) │────▶│  mobile-labs sidecar (Node.js) │────▶│  Android Emulator    │
│                       │     │                               │     │                      │
│  shell().sidecar(     │     │  index.mjs                    │     │  adb + Frida         │
│    "mobile-labs")     │     │  ├── lib/cli.mjs              │     │  ├── CA cert pushed  │
│  .env(port, apk, ...) │     │  ├── lib/setup.mjs            │     │  ├── global proxy    │
│  .spawn()             │     │  ├── lib/run.mjs              │     │  ├── frida-server    │
│                       │     │  ├── lib/validate.mjs         │     │  └── target APK      │
│                       │◀────│  └── scripts/                 │     │                      │
│                       │     │      ├── root-bypass.js       │◀────│                      │
│  JSON-lines on stdout │     │      └── cert-unpin.js        │     └──────────────────────┘
└──────────────────────┘     └───────────────────────────────┘
                │
                │  AppRecon Proxy (:8888)
                ▼
┌──────────────────────────────────────────────────────────────┐
│  Live Traffic                                                │
│  All app HTTP/HTTPS captured, filterable by target scope      │
└──────────────────────────────────────────────────────────────┘
```

### Modes

| Mode | Description |
|------|-------------|
| `validate` | Dry-run checks for prerequisites (adb, emulator, frida, AVDs) without execution |
| `setup` | Launches emulator, pushes CA cert + Frida server, configures proxy, installs APK |
| `run` | Launches the target APK with Frida instrumentation scripts attached |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MOBILELABS_MODE` | Yes | One of: `validate`, `setup`, `run` |
| `MOBILELABS_APK_PATH` | setup/run | Absolute path to the target APK file |
| `MOBILELABS_SESSION_ID` | No | Session identifier for log correlation (auto-generated if missing) |
| `MOBILELABS_EMULATOR` | No | Emulator backend: `avd` (default), `qemu`, `genymotion` |
| `MOBILELABS_AVD_NAME` | avd | AVD name (default: `mobilelabs`) |
| `MOBILELABS_QEMU_IMAGE` | qemu | Path to Android-x86 qcow2 image |
| `MOBILELABS_EMULATOR_RAM` | No | RAM for emulator in MB (default: `4096`) |
| `MOBILELABS_ADB_PORT` | No | ADB port for QEMU (default: `5555`) |
| `MOBILELABS_FRIDA_SCRIPTS` | No | Comma-separated scripts: `cert-unpin,root-bypass` (default) |
| `MOBILELABS_CA_CERT_PEM` | No | AppRecon CA certificate PEM for HTTPS MITM (recommended) |
| `0XBUFFER_PROXY_PORT` | No | AppRecon proxy port (default: `8888`) |

### JSON-Lines Output Contract

The sidecar emits one JSON object per line on stdout. Key event types:

| Event Type | When | Key Fields |
|------------|------|------------|
| `mobile_labs_setup_started` | Setup begins | `sessionId`, `apkPath`, `emulatorType`, `proxyPort` |
| `mobile_labs_setup_completed` | Setup finished | `sessionId`, `proxyHost`, `proxyPort` |
| `mobile_labs_run_started` | APK launched with Frida | `sessionId`, `scripts`, `apkPath` |
| `mobile_labs_run_completed` | Frida process exited | `sessionId`, `exitCode` |
| `mobile_labs_frida_output` | Frida console output (JSON) | `sessionId`, `data` |
| `mobile_labs_proxy_configured` | Global proxy set | `sessionId`, `proxyHost`, `proxyPort` |
| `mobile_labs_log` | Progress log entries | `sessionId`, `level`, `logType`, `message` |
| `mobile_labs_validated` | Validation results | `checks`, `allAvailable` |
| `session_failed` | Fatal error | `message`, `layer`, `fix` |

---

## Emulator Backends

The sidecar architecture is emulator-agnostic. The backend is selected via `MOBILELABS_EMULATOR`.

### AVD (Android Virtual Device) — Default

Uses the standard Android SDK emulator (`emulator -avd <name>`). Requires Android SDK command-line tools installed.

```
MOBILELABS_EMULATOR=avd  (default)
MOBILELABS_AVD_NAME=mobilelabs
```

**Prerequisites**: Android SDK, at least one AVD created via AVD Manager.

### QEMU + Android-x86 — Fully Standalone

Uses QEMU directly with an Android-x86 disk image. Zero Android Studio dependency. The cleanest standalone option on macOS.

```
MOBILELABS_EMULATOR=qemu
MOBILELABS_QEMU_IMAGE=/usr/local/share/mobilelabs/android-x86.qcow2
MOBILELABS_EMULATOR_RAM=4096
MOBILELABS_ADB_PORT=5555
```

**Prerequisites**: `qemu` (brew install qemu), Android-x86 qcow2 image, `adb` binary.

### Genymotion

Uses Genymotion Desktop for the fastest boot time and best performance.

```
MOBILELABS_EMULATOR=genymotion
MOBILELABS_AVD_NAME=mobilelabs
```

**Prerequisites**: Genymotion Desktop, `gmtool` CLI, `adb`.

---

## Live Traffic Integration

### How It Works

1. AppRecon's MITM proxy runs on the host at `localhost:8888` (HTTP) + `localhost:8889` (HTTPS MITM).
2. The sidecar pushes AppRecon's CA certificate into the Android system trust store (`/system/etc/security/cacerts/`).
3. The Android global proxy is configured via `adb shell settings put global http_proxy 10.0.2.2:<proxy_port>` — the emulator's alias for host `localhost`.
4. All HTTP/HTTPS traffic from every app on the emulator now flows through AppRecon's proxy.
5. The Frida [cert-unpin.js](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/scripts/cert-unpin.js) script neutralizes OkHttp/TrustKit/custom pinning so apps don't reject the MITM proxy's dynamically-signed certificates.
6. Captured requests and responses appear in the Live Traffic page, filterable by target scope.

### Network Topology

```
┌─────────────────┐     10.0.2.2:8888      ┌──────────────────┐
│ Android Emulator │ ──────────────────────▶│ AppRecon Proxy   │
│ (target app)     │                        │ :8888 + MITM     │
│                  │                        │                  │
│ global proxy ────┘                        │ CA signs per-    │
│ 10.0.2.2:8888                             │ host certs       │
│                                            │                  │
│ CA cert trusted ◀──────────────────────── │ CA cert pushed   │
│ via system store                          │ by mobile-labs   │
└─────────────────┘                        └──────┬───────────┘
                                                  │
                                                  │ Captured records
                                                  ▼
                                          ┌──────────────────┐
                                          │ Live Traffic     │
                                          │ (filterable by   │
                                          │  target scope)   │
                                          └──────────────────┘
```

### Target Scoping in Live Traffic

After setup, create a Live Traffic target with the mobile app's domain patterns (e.g., `*.targetapp.com`, `api.targetapp.com`). This creates a dedicated tab in the Live Traffic page showing only that app's traffic, isolated from other proxy traffic.

### Certificate Trust Constraints

- **Android 7+ (API 24+)**: Apps with a `network_security_config.xml` that sets `trust-anchors` to `system` will reject user-installed CAs. The sidecar pushes the CA to the system store when `adb root` is available (emulators have this). The Frida cert-unpin script serves as a fallback for apps that still pin.
- **Android 14+ (API 34+)**: System CA installation via `adb push` requires a writable system partition, which most emulator system images support with `-writable-system`.

---

## Frida Scripts

### root-bypass.js

Hooks common root detection methods used by banking and fintech apps:

- `java.io.File.exists()` — blocks known root path indicators (su binaries, Superuser.apk, Magisk)
- `java.lang.Runtime.exec()` — blocks `su` and `which su` commands
- `android.content.pm.PackageManager.getPackageInfo()` — hides root management apps from package queries
- `android.os.SystemProperties.get()` — overrides `ro.debuggable` and `ro.secure` values

### cert-unpin.js

Hooks SSL certificate pinning implementations:

- `com.android.org.conscrypt.TrustManagerImpl.verifyChain()` — bypasses default Android trust manager
- `okhttp3.CertificatePinner.check()` — bypasses OkHttp3 pinning
- `com.datatheorem.android.trustkit.pinning.TrustKit.getInstance()` — neutralizes TrustKit (popular pinning library)
- Class enumeration for custom `X509TrustManager` implementations
- `javax.net.ssl.HostnameVerifier` — enumerates hostname verifier instances

---

## Tauri Integration

### Build Configuration

The sidecar binary is built via [build-sidecars.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/build-sidecars.mjs) and placed in [src-tauri/binaries/](file:///Users/arham/Desktop/project/apprecon/src-tauri/binaries/). Unlike the ai-engine sidecar, mobile-labs does not bundle Playwright — it shells out to system-installed `adb`, `emulator`, and `frida` CLIs.

**build-sidecars.mjs** — add the mobile-labs entry:
```js
buildSidecar({
  name: 'mobile-labs',
  entry: 'sidecars/mobile-labs/index.mjs',
  target,
  targetTriple,
});
```

**tauri.conf.json** — register in `bundle.externalBin`:
```json
"externalBin": [
  "binaries/ai-engine",
  "binaries/mobile-labs"
]
```

**capabilities/default.json** — grant shell permissions:
```json
{
  "identifier": "shell:allow-execute",
  "allow": [
    { "args": true, "name": "binaries/ai-engine", "sidecar": true },
    { "args": true, "name": "binaries/mobile-labs", "sidecar": true }
  ]
}
```

### Rust Spawn Pattern

The backend spawns the sidecar with the same pattern used by the [AI browser crawl](file:///Users/arham/Desktop/project/apprecon/src-tauri/src/browser/crawl_sidecar.rs) and [AI chat](file:///Users/arham/Desktop/project/apprecon/src-tauri/src/ai/chat.rs):

```rust
let sidecar_command = app
    .shell()
    .sidecar("mobile-labs")
    .map_err(|e| format!("Failed to prepare mobile-labs sidecar: {}", e))?
    .env("MOBILELABS_MODE", "setup")
    .env("MOBILELABS_APK_PATH", &apk_path)
    .env("MOBILELABS_CA_CERT_PEM", &ca_cert_pem)
    .env("0XBUFFER_PROXY_PORT", &proxy_port.to_string());

let mut command: Command = sidecar_command.into();
command.stdout(Stdio::piped()).stderr(Stdio::piped());

let mut child = command.spawn()?;
let reader = BufReader::new(child.stdout.take().unwrap());

// Read JSON-lines from stdout
for line in reader.lines() {
    let event: serde_json::Value = serde_json::from_str(&line?)?;
    // Handle event types: mobile_labs_setup_completed, mobile_labs_frida_output, etc.
}
```

---

## Prerequisites

### Required System Tools

| Tool | Purpose | Install |
|------|---------|---------|
| `adb` | Android device communication | Android SDK Platform Tools |
| `frida` | Frida CLI for instrumentation | `pip install frida-tools` |
| `frida-server` | Frida server binary for Android | Download from [Frida releases](https://github.com/frida/frida/releases) |

### Emulator-Specific

| Backend | Additional Tools |
|---------|-----------------|
| AVD | Android SDK + `emulator` CLI + at least one AVD image |
| QEMU | `qemu-system-x86_64` + Android-x86 qcow2 image |
| Genymotion | Genymotion Desktop + `gmtool` CLI |

### Optional (for certificate hash computation)

| Tool | Purpose |
|------|---------|
| `openssl` | Compute CA cert subject hash for system trust store naming |

---

## Source Files

| File | Purpose |
|------|---------|
| [sidecars/mobile-labs/index.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/index.mjs) | Entry point with preflight harness |
| [sidecars/mobile-labs/lib/cli.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/lib/cli.mjs) | Mode dispatch (setup/run/validate) |
| [sidecars/mobile-labs/lib/events.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/lib/events.mjs) | JSON-lines emitter |
| [sidecars/mobile-labs/lib/shell.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/lib/shell.mjs) | Shell command helpers |
| [sidecars/mobile-labs/lib/validate.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/lib/validate.mjs) | Prerequisites check |
| [sidecars/mobile-labs/lib/setup.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/lib/setup.mjs) | Emulator provisioning + CA cert push + proxy config |
| [sidecars/mobile-labs/lib/run.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/lib/run.mjs) | Launch APK with Frida instrumentation |
| [sidecars/mobile-labs/scripts/root-bypass.js](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/scripts/root-bypass.js) | Frida script: root detection bypass |
| [sidecars/mobile-labs/scripts/cert-unpin.js](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/scripts/cert-unpin.js) | Frida script: SSL pinning bypass |
| [sidecars/mobile-labs/package.json](file:///Users/arham/Desktop/project/apprecon/sidecars/mobile-labs/package.json) | Sidecar package manifest |
| [sidecars/build-sidecars.mjs](file:///Users/arham/Desktop/project/apprecon/sidecars/build-sidecars.mjs) | Build pipeline (add `mobile-labs` entry) |
| [src-tauri/tauri.conf.json](file:///Users/arham/Desktop/project/apprecon/src-tauri/tauri.conf.json) | Add `binaries/mobile-labs` to `bundle.externalBin` |
| [src-tauri/capabilities/default.json](file:///Users/arham/Desktop/project/apprecon/src-tauri/capabilities/default.json) | Grant `shell:allow-execute` and `shell:allow-spawn` for `mobile-labs` |
