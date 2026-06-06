# Tools

## Overview

The Tools page provides a collection of security and data manipulation utilities commonly needed during web application reconnaissance. Each tool is accessible via a tab and operates independently within its own section of the page.

Currently active tools:
- **Encoder/Decoder** — URL, Base64, and Hex encoding/decoding.
- **Hash Generator** — cryptographic hash computation (MD5, SHA family, SHA3 family, RIPEMD-160).
- **Port Scanner** — TCP connect-based port scanning with banner grabbing.

---

## Architecture

### Page Entry

The [ToolsPage](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/index.tsx) uses [TabbedPageLayout](file:///Users/arham/Desktop/project/apprecon/src/components/tabs-layout/tabbed-page-layout.tsx) with a [TabsContent](file:///Users/arham/Desktop/project/apprecon/src/components/ui/tabs.tsx)-based layout. Each tool renders inside its own tab content panel.

### Page Hook

[useToolsPage](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/hooks/use-tools-page.ts) provides tab state for `codec`, `hash`, and `ports` tabs.

### Types

[types.ts](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/types.ts) defines:
- `CodecType` — `'url' | 'base64' | 'hex'`
- `HashType` — `'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512' | 'sha3-224' | 'sha3-256' | 'sha3-384' | 'sha3-512' | 'ripemd160'`
- `PortScanResult` — structure for port scan results (host, port, state, service, response time, banner)

---

## Encoder/Decoder Tool

The [EncoderDecoderTool](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/components/encoder.tsx) provides real-time encoding and decoding for URL, Base64, and Hex formats.

### Features

- **Encode/Decode toggle** — switch between encoding and decoding mode.
- **Format selector** — URL, Base64, or Hex via a tab bar.
- **Side-by-side layout** — input on the left, output on the right.
- **Auto-convert** — output updates automatically as you type or change settings.
- **Swap** — exchanges input and output values, toggling between encode and decode mode.
- **Copy** — copies the output to clipboard.
- **Clear** — clears both input and output.

### Supported Conversions

| Format | Encode | Decode |
|---|---|---|
| URL | `encodeURIComponent()` | `decodeURIComponent()` |
| Base64 | UTF-8 → Base64 (via CryptoJS) | Base64 → UTF-8 (via CryptoJS) |
| Hex | UTF-8 → Hex (via CryptoJS) | Hex → UTF-8 (via CryptoJS) |

### Error Handling

Decoding errors (invalid Base64, malformed URL encoding, invalid hex) are displayed in a red error panel instead of the output textarea.

---

## Hash Generator Tool

The [HashTool](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/components/hash.tsx) computes cryptographic hashes from arbitrary text input.

### Supported Algorithms

| Algorithm | CryptoJS Method |
|---|---|
| MD5 | `CryptoJS.MD5` |
| SHA-1 | `CryptoJS.SHA1` |
| SHA-224 | `CryptoJS.SHA224` |
| SHA-256 | `CryptoJS.SHA256` |
| SHA-384 | `CryptoJS.SHA384` |
| SHA-512 | `CryptoJS.SHA512` |
| SHA3-224 | `CryptoJS.SHA3_224` |
| SHA3-256 | `CryptoJS.SHA3_256` |
| SHA3-384 | `CryptoJS.SHA3_384` |
| SHA3-512 | `CryptoJS.SHA3_512` |
| RIPEMD-160 | `CryptoJS.RIPEMD160` |

### Features

- **Algorithm selector** — dropdown with all 11 algorithms.
- **Side-by-side layout** — input on the left, hash output on the right.
- **Auto-compute** — hash updates automatically as you type or change the algorithm.
- **Copy** — copies the hash output to clipboard.
- **Clear** — clears both input and output.

### Usage Notes

- All hashing is performed client-side using the [crypto-js](https://www.npmjs.com/package/crypto-js) library.
- The output is the hex-encoded digest string.
- SHA-256 is the default algorithm.

---

## Port Scanner Tool

The [PortScannerTool](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/components/port-scanner.tsx) performs TCP connect-based port scanning against a target host or CIDR range using the Rust backend.

### Features

- **Target input** — accepts hostnames, IP addresses, or CIDR notation (e.g., `192.168.1.0/24`).
- **Port presets** — Quick, Web, Top 100, Full (1-65535), or Custom.
- **Custom port input** — supports ranges (`1-100`) and comma-separated lists (`80,443,8080`).
- **Timeout control** — configurable per-port timeout in milliseconds (default: 800ms).
- **Concurrency control** — number of simultaneous port probes (default: 100).
- **Banner grabbing** — toggle to capture service banners from open ports.
- **Real-time progress** — progress bar showing current/total ports scanned.
- **Results table** — columns for Host, Port, State, Service, Response Time, and Banner.
- **Export** — JSON and CSV download of open port results.
- **Copy open ports** — copies `host:port` list to clipboard.
- **Stop** — cancels an in-progress scan.

### Port Presets

| Preset | Ports Included |
|---|---|
| Quick | 21, 22, 25, 53, 80, 110, 143, 443, 445, 587, 993, 995, 3306, 3389, 5432, 6379, 8080, 8443 |
| Web | 80, 443, 8000, 8080, 8081, 8443, 8888, 9000, 9443 |
| Top 100 | 100 most common TCP ports |
| Full | 1–65535 (all ports) |
| Custom | User-defined port range or list |

### Backend Integration

The port scanner communicates with the Rust backend via Tauri commands and events:

- **`scan_ports`** — Tauri `invoke` command that starts the scan and returns final results.
- **`port-scan-result-{scanId}`** — Tauri event streamed per open port found during the scan.
- **`port-scan-progress-{scanId}`** — Tauri event for progress updates and completion.
- **`stop_port_scan`** — Tauri `invoke` command to cancel an in-progress scan.

Each scan is identified by a cryptographically random UUID to support concurrent scans and event routing.

### Scan Type

Scans use TCP `connect` mode (SYN scan requires privileged access). A badge in the toolbar notes this limitation.

### Results Display

- Only open ports are displayed in the results table.
- Results are sorted by host then port number.
- Empty state shows a radar icon with "No open ports found."
- Errors are displayed inline below the header.

### Export Formats

- **JSON** — full structured data including all fields (host, port, state, service, response_time_ms, banner).
- **CSV** — tabular format with columns: Host, Port, State, Service, Response Time, Banner.

---

## Future Tools

Two additional tools are implemented but currently commented out in the page entry:

- **SQL Injection Tool** — [SqlInjectionTool](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/components/sql-injection.tsx) for testing SQL injection payloads.
- **Utils Tool** — [UtilsTool](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/components/utils.tsx) for general data manipulation utilities.

These can be enabled by uncommenting their imports and tab content in [index.tsx](file:///Users/arham/Desktop/project/apprecon/src/pages/tools/index.tsx).

---

## Dependencies

- **[crypto-js](https://www.npmjs.com/package/crypto-js)** — used by both the Encoder/Decoder and Hash Generator tools for all cryptographic and encoding operations.
- **[Tauri invoke & events](https://tauri.app/)** — used by the Port Scanner for backend communication.
- **[shadcn/ui](https://ui.shadcn.com/)** — all UI components (Tabs, Button, Input, Select, Table, Badge, Checkbox, Tooltip, Textarea, Label) are from the shared shadcn component library.
