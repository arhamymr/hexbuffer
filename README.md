# AppRecon

A network proxy and traffic inspection tool built with Tauri, React, and TypeScript.

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

- **Frontend**: React 19, TypeScript, Next.js 16, Tailwind CSS, Radix UI
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
│   ├── routes/            # Page routes
│   ├── packages/          # Shared components (header, sidebar, bottom-pane, main-content, filter-bar, ui)
│   ├── context/           # React context providers
│   ├── models/            # TypeScript interfaces
│   └── utils/            # Utilities and atoms
├── src-tauri/             # Rust backend
│   └── src/
│       ├── main.rs       # App entry, proxy init, tray menu
│       ├── commands.rs   # Tauri IPC commands
│       ├── proxy_handler.rs  # TrafficListener implementation
│       ├── traffic/      # Database, filtering, sessions, HAR
│       ├── ca_manager.rs # CA certificate generation
│       ├── breakpoints.rs # Breakpoint management
│       ├── scripting.rs  # Script manager
│       └── eval.rs       # JavaScript execution engine
├── docs/
│   ├── feature-spec-detail.md  # Full technical specification
│   └── mitm-spec.md           # MITM proxy technical reference
```

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build Next.js for production |
| `pnpm tauri` | Run Tauri application |
| `pnpm lint` | Run Next.js lint |

## Documentation

- [Feature Specification](./docs/feature-spec-detail.md) - Complete technical documentation
- [MITM Proxy Reference](./docs/mitm-spec.md) - Man-in-the-middle proxy implementation details
