# hexbuffer

hexbuffer combines real-time traffic interception, manual request crafting, automated attacks, AI-driven reconnaissance, and professional report building in a single desktop application. No web-based tool sprawl. No juggling five different windows. Just open hexbuffer and get to work.

## Features

- **Traffic Interception**: Capture HTTP/HTTPS traffic with MITM proxy support
- **Certificate Management**: Auto-generated CA certificates with OS trust store integration
- **Traffic Filtering**: Filter by URL, method, status, client, tags, and more
- **Traffic Tagging**: Automatic tagging rules with sync/async evaluation
- **Session Management**: Save, load, and export traffic sessions (HAR, CSV, SQLite)
- **Breakpoints**: Pause and modify requests/responses mid-flow
- **JavaScript Scripting**: Execute custom scripts via Boa engine
- **MCP Server**: LLM integration via Model Context Protocol
- **Multi-format Viewers**: JSON, XML, Hex, Image, Video, GraphQL, and more

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Rust, Tauri 2
- **Database**: SQLite with ZSTD compression
- **Proxy**: Custom TrafficListener with rustls TLS termination

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run Tauri app
pnpm tauri
```

## Project Structure

```
├── src/                    # React frontend
│   ├── pages/             # Feature pages (http-history, repeater, documents, settings, brute-force)
│   │   └── shared/        # Reusable page primitives (tab-bar, tabbed-page-layout)
│   ├── components/        # Shared UI components
│   │   └── ui/           # Radix UI primitives (button, dialog, table, etc.)
│   ├── stores/           # Zustand state stores
│   ├── hooks/            # Shared React hooks
│   └── lib/              # Utilities and helpers
├── src-tauri/             # Rust backend
│   └── src/
│       ├── main.rs       # App entry, proxy init, tray menu
│       ├── proxy/        # TrafficListener, intercept, lifecycle, MITM
│       ├── db/           # Database schema and repository
│       ├── port-scanner/ # Port scanning and banner grabbing
│       └── ai/           # AI integration
└── docs/
    ├── capabilities.md        # Feature capabilities index and path mapping
    ├── repeater-scripts.md    # Sandbox Javascript request scripting engine guide
    ├── privacy-policy.md      # Privacy policy
    └── security-audit.md      # Security audit notes
```

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Vite dev server on port 1420 |
| `pnpm dev:clean` | Free port 1420 and restart dev server |
| `pnpm build` | Build Vite frontend for production |
| `pnpm preview` | Preview built frontend locally |
| `pnpm tauri` | Run Tauri desktop application |
| `cd src-tauri && cargo run` | Run Rust backend directly |
| `cd src-tauri && cargo test --lib -- --test-threads=1` | Run proxy tests sequentially |

## Documentation

- [Capabilities](./docs/capabilities.md) - Feature capabilities index and directory mapping
- [Repeater Scripting Engine](./docs/repeater-scripts.md) - Pre-request and Test/Assertion scripts guide
- [Privacy Policy](./docs/privacy-policy.md) - Data handling and privacy details
- [Security Audit](./docs/security-audit.md) - Security review notes
