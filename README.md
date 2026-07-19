# hexbuffer ⚡

hexbuffer is a professional, high-performance application testing, debugging, and security analysis desktop environment. Tailored for developers, QA engineers, and security researchers, it combines real-time network traffic interception, manual request crafting, automated fuzzer and load testing, out-of-band callback logging, node-based automation workflows, and AI-driven diagnostics into a single, unified workspace.

No web-based tool sprawl. No juggling multiple independent command windows. Just open **hexbuffer** and get to work.

---

## ✨ Core Features & Modules

### 📡 Traffic Interception & Diagnostics
*   **MITM Proxy**: Capture HTTP/HTTPS/WebSocket traffic using a custom `TrafficListener` with `rustls` TLS termination.
*   **Certificate Manager**: Auto-generate custom Root CA certificates with native OS trust store integration.
*   **Live Traffic Grid**: Inspect HTTP methods, URLs, status codes, payload sizes, and custom tagging rules in real-time.
*   **Granular Filtering**: Filter by host scopes, HTTP methods, status code ranges, custom search queries, and content types.
*   **Session Database**: Save, load, and export entire traffic logs to formats like SQLite (with ZSTD compression), HAR, and CSV.
*   **Active Intercept**: Pause and modify requests/responses mid-flight before forwarding or dropping them.

### ⚡ Request Sandbox, Fuzzing & Diagnostics
*   **Repeater**: Manually tweak, replay, and debug HTTP/WebSocket requests. Features sandboxed JavaScript Pre-Request and Test/Assertion script hooks
*   **Invoker (Fuzzer)**: High-speed request fuzzer and parameter fuzzer supporting Sniper mode, concurrency throttling, payload generator ranges/lists, and regex response extractors.
*   **SQL Injection & Boundary Tester**: Validate API parameters and inputs against SQLi vulnerability vectors and boundary conditions.
*   **XSS & Input Sanitization Tester**: Generate edge-case payloads using vector databases, context wrappers, and nested encoders to test input safety limits.
*   **Port Scanner**: Multi-threaded Rust-powered TCP port scanner and service banner grabber to verify network interfaces.
*   **Out-of-Band Collaborator**: Integrated DNS, HTTP, and SMTP listener to catch and log out-of-band (OOB) application interactions, webhooks, and callbacks.

### 🤖 Automation & Workflows
*   **Visual Workflows**: A visual nodes engine powered by `@xyflow/react`. Connect proxy capture triggers to conditions (e.g. status code, regex match) and actions (webhook, repeat, write file, alert).
*   **Browser Crawling & AI**: BFS-based web crawler with built-in AI insights, tracing a live crawl tree while extracting dead routes, console errors, and structured behavioral findings.
*   **Regression Runner**: Build visual test flows (click, navigate, assert) with screenshot attachments and automatic execution for end-to-end regression validation.

### 🛠️ Developer Utility Suite
*   **JWT Tool**: Decode, analyze for common signature/claim issues, and sign custom tokens for authentication testing.
*   **Codecs & Hasher**: Direct text encoding/decoding (Base64, Hex, URL) and client-side cryptographic hashing (MD5, SHA family, RIPEMD).
*   **Monaco Comparer**: Side-by-side visual diff explorer for comparing HTTP requests, responses, or schema text blocks.
*   **Markdown Workspace & Kanban**: WYSIWYG editor (Milkdown) with PDF export to build reports or manuals, linked with a task board.
*   **Mock Forge**: Configure custom API hosts, routes, and response mock rules.

---


## 🚀 Getting Started

### Prerequisites

*   **Node.js**: LTS version (v18+ recommended)
*   **Rust**: Cargo and toolchain installed (v1.75+ recommended)
*   **pnpm**: Package manager (`npm i -g pnpm`)

### Installation & Run

1.  **Clone the repository** and navigate into the workspace.
2.  **Install dependencies**:
    ```bash
    pnpm install
    ```
3.  **Launch the development client**:
    ```bash
    pnpm tauri dev
    ```
    This starts the Vite dev server on port `1420` and loads the Tauri desktop shell.

---

## 💻 Commands

| Command | Purpose |
| :--- | :--- |
| `pnpm install` | Install frontend dependencies |
| `pnpm dev` | Start Vite dev server on port `1420` |
| `pnpm dev:clean` | Kill processes occupying port `1420` and restart the Vite server |
| `pnpm build` | Compile the production-ready React frontend bundle |
| `pnpm preview` | Preview the compiled production build locally |
| `pnpm tauri` | Run the Tauri desktop shell in development mode |
| `cd src-tauri && cargo run` | Execute the Rust backend directly |
| `cd src-tauri && cargo test --lib -- --test-threads=1` | Run proxy and database Rust tests sequentially |

---

## 📂 Project Structure

```
├── src/                      # React Frontend Shell
│   ├── pages/               # Feature pages (http-history, repeater, settings, browser, etc.)
│   │   └── shared/          # Shared page primitives (tab-bar, tabbed-layout)
│   ├── components/          # React components
│   │   └── ui/             # Radix & Shadcn UI primitives (button, dialog, input, etc.)
│   ├── stores/             # Zustand state stores
│   ├── hooks/              # Reusable React hooks
│   └── lib/                # Shared utilities and helpers
├── src-tauri/               # Rust Backend Code
│   ├── src/
│   │   ├── main.rs         # Tauri application entry point and proxy setup
│   │   ├── proxy/          # TrafficListener, intercept lifecycle, MITM
│   │   ├── db/             # Database connection, schemas, ZSTD compression
│   │   ├── port-scanner/   # Rust TCP scanner and banner grabber
│   │   ├── setup.rs        # App initialization rules
│   │   └── ai/             # Large Language Model APIs integration
│   └── Cargo.toml          # Rust dependencies and compiler rules
└── docs/                     # Feature guides and architecture plans
```

---

## 📐 Developer & Architectural Guidelines

### 🎨 UI & Design Consistency
*   **Components Usage**: Always reuse components inside `src/components/ui/` directly. Avoid writing ad-hoc custom CSS classnames for layout structures unless absolutely necessary. Keep inline styles minimal.
*   **Design System**: Align styling with the application's existing dark mode aesthetics, focusing on high readability, clean spacing (using Tailwind tokens), and professional animations.

### ⚙️ Coding Conventions
*   **Formatting**: Use 2-space indentation, explicit TypeScript types, and semicolon termination.
*   **Naming Conventions**:
    *   **Pages**: Kebab-cased directories under `src/pages/` (e.g., `sql-injection`).
    *   **Components**: PascalCase (e.g., `HttpHistoryToolbar`).
    *   **Hooks**: camelCase starting with `use` (e.g., `useTabState`).
    *   **Zustand Stores**: Short, domain-based names under `src/stores/` (e.g., `filter.ts`).

### 🧩 Frontend Page Pattern
To maintain code readability and separation of concerns, new pages or heavy refactors should strictly adhere to the **Page-Hook-Component** separation:
1.  **Page Entry** (`src/pages/[feature]/index.tsx`): Focus on page layout composition and wiring UI subsections. Keep it thin.
2.  **Page Hook** (`src/pages/[feature]/hooks/use-[feature]-page.ts`): Orchestrate state, handle events, coordinate stores, and handle side effects.
3.  **Presentational Components** (`src/pages/[feature]/components/`): Slice layout into small presentational files like `*-toolbar`, `*-filters`, or `*-pane`.
4.  **Static Data** (`src/pages/[feature]/constants.ts`): Save tabs lists, options, or static helper text.

---
