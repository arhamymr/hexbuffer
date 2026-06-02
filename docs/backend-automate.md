# AI Browser Automation - Backend Detail

## Feature Name

AI Browser Automation - Headless Crawl Engine

## Purpose

The backend runs a headless browser crawler that explores target websites, extracts page information, generates AI insights, and sends real-time updates to the frontend.

The selected stack is:

```text
Vercel AI SDK + Playwright + Custom Crawl Engine
```

The crawler should generate traffic through the existing AppRecon Proxy so the existing Live Traffic, HTTP History, Site Map, API Mapping, Repeater, and Scanner modules can process the traffic.

---

# Backend Architecture

```text
Tauri Frontend
    │
    ▼
Rust Core
    │
    ▼
Node Sidecar
    │
    ▼
Custom Crawl Engine
    │
    ├── Playwright Headless Browser
    │
    ├── Page Extractor
    │
    ├── Queue Manager
    │
    ├── Policy Guard
    │
    └── Vercel AI SDK Analyzer
    │
    ▼
Target Website via AppRecon Proxy
    │
    ▼
SQLite Storage
```

---

# Recommended Runtime Split

## Rust Core

Responsible for:

- Session management
- SQLite database
- Tauri commands
- Tauri events
- Proxy configuration
- Start, pause, resume, stop crawl
- Persisting crawl results
- Reading crawl results for UI

## Node Sidecar

Responsible for:

- Running Playwright
- Running custom crawl engine
- Running Vercel AI SDK calls
- Extracting page data
- Capturing screenshots
- Sending crawl events back to Rust

## Existing AppRecon Proxy

Responsible for:

- Capturing HTTP traffic
- HTTP History
- Site Map
- API Mapping
- Repeater
- Scanner integration

---

# Main Backend Flow

```text
User starts crawl
    ↓
Rust creates crawl session
    ↓
Rust starts Node sidecar crawl process
    ↓
Node launches Playwright headless browser
    ↓
Crawler opens target URL through AppRecon Proxy
    ↓
Page extractor collects links, forms, buttons, text, metadata
    ↓
AI SDK analyzes extracted page data
    ↓
Policy guard filters unsafe or out-of-scope actions
    ↓
Queue manager adds next URLs
    ↓
Rust stores pages, logs, insights, screenshots
    ↓
Frontend receives real-time Tauri events
```

---

# AI Flow

AI should not directly control the browser in Phase 1.

Correct model:

```text
Crawler controls browser
AI analyzes page
AI prioritizes next URLs
Policy guard approves actions
Crawler executes approved actions
```

---

# AI Responsibilities

The AI analyzer should:

- Summarize page purpose
- Detect login pages
- Detect admin pages
- Detect upload forms
- Detect interesting forms
- Detect hidden routes from page content
- Detect JavaScript route references
- Prioritize URLs for crawling
- Generate reconnaissance insights

---

# AI Should Not Do

The AI should not perform:

- Form submission
- Login brute force
- Payment actions
- Delete actions
- Account changes
- File uploads
- Exploit attempts
- Destructive actions

---

# Vercel AI SDK Usage

Use the Vercel AI SDK for structured output.

## Example AI Analysis Schema

```ts
import { z } from "zod";

export const PageAnalysisSchema = z.object({
  summary: z.string(),
  pageType: z.enum([
    "home",
    "login",
    "register",
    "dashboard",
    "admin",
    "profile",
    "pricing",
    "documentation",
    "contact",
    "error",
    "unknown"
  ]),
  interesting: z.boolean(),
  priorityScore: z.number().min(0).max(100),
  insights: z.array(z.object({
    severity: z.enum(["info", "low", "medium", "high", "critical"]),
    type: z.string(),
    title: z.string(),
    description: z.string()
  })),
  prioritizedUrls: z.array(z.object({
    url: z.string(),
    reason: z.string(),
    priorityScore: z.number().min(0).max(100)
  }))
});
```

## Example AI Call

```ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { PageAnalysisSchema } from "./schemas";

export async function analyzePage(input: PageExtractResult) {
  const result = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: PageAnalysisSchema,
    prompt: `
Analyze this web page for reconnaissance.

URL: ${input.url}
Title: ${input.title}
Visible Text: ${input.visibleText.slice(0, 5000)}
Links: ${input.links.map(l => l.href).join("\n")}
Forms: ${JSON.stringify(input.forms)}
Buttons: ${input.buttons.join(", ")}

Return structured reconnaissance insights and prioritized URLs.
    `
  });

  return result.object;
}
```

---

# Playwright Usage

Playwright should run in headless mode.

## Browser Launch

```ts
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
});

const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  proxy: {
    server: "http://127.0.0.1:8080"
  }
});

const page = await context.newPage();
```

The proxy should point to the existing AppRecon Proxy.

---

# Page Extraction

The extractor should collect:

- URL
- Page title
- HTTP status
- Visible text
- Links
- Forms
- Buttons
- Meta tags
- Script URLs
- Screenshot path

## Example Extract Result

```ts
type PageExtractResult = {
  url: string;
  finalUrl: string;
  title: string;
  httpStatus?: number;
  visibleText: string;
  links: Array<{
    href: string;
    text?: string;
  }>;
  forms: Array<{
    action?: string;
    method?: string;
    fields: Array<{
      name?: string;
      type?: string;
      placeholder?: string;
    }>;
  }>;
  buttons: string[];
  scripts: string[];
  screenshotPath?: string;
};
```

---

# Crawl Queue

The custom crawl engine should support BFS and DFS.

## BFS

Use queue behavior:

```ts
const next = queue.shift();
```

## DFS

Use stack behavior:

```ts
const next = queue.pop();
```

## Queue Item

```ts
type CrawlQueueItem = {
  url: string;
  depth: number;
  parentUrl?: string;
  priorityScore?: number;
  discoveredBy: "link" | "script" | "ai";
};
```

---

# Policy Guard

The policy guard prevents unsafe or out-of-scope actions.

## Rules

Block URLs that:

- Are outside scope
- Match exclude paths
- Are logout URLs
- Are delete URLs
- Are payment URLs
- Are destructive actions
- Exceed max depth
- Exceed max page limit
- Were already visited

## Example Dangerous Patterns

```text
/logout
/signout
/delete
/remove
/destroy
/payment
/billing
/checkout
```

---

# Database Tables

## ai_browser_sessions

```sql
CREATE TABLE ai_browser_sessions (
  id TEXT PRIMARY KEY,
  target_url TEXT NOT NULL,
  strategy TEXT NOT NULL,
  status TEXT NOT NULL,
  max_depth INTEGER NOT NULL,
  max_pages INTEGER NOT NULL,
  same_domain_only INTEGER NOT NULL DEFAULT 1,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## ai_browser_pages

```sql
CREATE TABLE ai_browser_pages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  final_url TEXT,
  title TEXT,
  status TEXT NOT NULL,
  depth INTEGER NOT NULL,
  parent_url TEXT,
  http_status INTEGER,
  links_found INTEGER DEFAULT 0,
  forms_found INTEGER DEFAULT 0,
  screenshot_path TEXT,
  ai_summary TEXT,
  discovered_at TEXT,
  visited_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES ai_browser_sessions(id)
);
```

## ai_browser_edges

```sql
CREATE TABLE ai_browser_edges (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  from_url TEXT NOT NULL,
  to_url TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES ai_browser_sessions(id)
);
```

## ai_browser_insights

```sql
CREATE TABLE ai_browser_insights (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_id TEXT,
  url TEXT,
  severity TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reviewed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES ai_browser_sessions(id),
  FOREIGN KEY(page_id) REFERENCES ai_browser_pages(id)
);
```

## ai_browser_logs

```sql
CREATE TABLE ai_browser_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  level TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES ai_browser_sessions(id)
);
```

---

# Rust Tauri Commands

## Commands

```rust
#[tauri::command]
async fn start_ai_browser_crawl(config: CrawlConfig) -> Result<CrawlSession, String>;

#[tauri::command]
async fn pause_ai_browser_crawl(session_id: String) -> Result<(), String>;

#[tauri::command]
async fn resume_ai_browser_crawl(session_id: String) -> Result<(), String>;

#[tauri::command]
async fn stop_ai_browser_crawl(session_id: String) -> Result<(), String>;

#[tauri::command]
async fn get_ai_browser_session(session_id: String) -> Result<CrawlSession, String>;

#[tauri::command]
async fn list_ai_browser_pages(session_id: String) -> Result<Vec<CrawlPage>, String>;

#[tauri::command]
async fn list_ai_browser_insights(session_id: String) -> Result<Vec<AIInsight>, String>;

#[tauri::command]
async fn list_ai_browser_logs(session_id: String) -> Result<Vec<ActivityLog>, String>;
```

---

# Events From Backend to Frontend

```text
ai-browser:session-started
ai-browser:session-updated
ai-browser:page-discovered
ai-browser:page-updated
ai-browser:insight-created
ai-browser:log-created
ai-browser:overview-updated
ai-browser:session-finished
ai-browser:session-failed
```

---

# Node Sidecar Messages

The Node sidecar should send JSON messages to Rust.

## Page Discovered

```json
{
  "type": "page_discovered",
  "sessionId": "session_123",
  "url": "https://example.com/about",
  "parentUrl": "https://example.com/",
  "depth": 1
}
```

## Page Visited

```json
{
  "type": "page_visited",
  "sessionId": "session_123",
  "url": "https://example.com/about",
  "title": "About",
  "httpStatus": 200,
  "linksFound": 12,
  "formsFound": 1,
  "screenshotPath": "/screenshots/session_123/about.png"
}
```

## Insight Created

```json
{
  "type": "insight_created",
  "sessionId": "session_123",
  "url": "https://example.com/login",
  "severity": "info",
  "insightType": "authentication",
  "title": "Login page detected",
  "description": "The page contains a login form with email and password fields."
}
```

---

# Backend Workload

## Milestone 1: Storage + Session API

- Create SQLite migrations
- Create Rust models
- Create Tauri commands
- Create session lifecycle
- Create event emitter

## Milestone 2: Node Sidecar

- Create Node sidecar project
- Add Playwright
- Add Vercel AI SDK
- Implement message protocol with Rust
- Launch headless Chromium
- Connect browser traffic to AppRecon Proxy

## Milestone 3: Custom Crawl Engine

- Implement BFS crawl
- Implement DFS crawl
- Implement queue manager
- Implement visited URL set
- Implement scope validation
- Implement max depth and max page limit
- Implement screenshot capture

## Milestone 4: Page Extraction

- Extract links
- Extract forms
- Extract buttons
- Extract title
- Extract visible text
- Extract script URLs
- Save screenshot

## Milestone 5: AI Analysis

- Add structured output schema
- Analyze each page
- Generate insights
- Prioritize next URLs
- Store AI summary
- Emit insight events

## Milestone 6: Policy Guard

- Block out-of-scope URLs
- Block dangerous URLs
- Block duplicate URLs
- Block excessive depth
- Block excessive page count
- Log blocked actions

## Milestone 7: Controls

- Pause crawl
- Resume crawl
- Stop crawl
- Handle browser cleanup
- Handle sidecar crash
- Handle timeout

---

# Phase 1 Exclusions

Do not implement:

- Live browser preview
- Interactive browser control
- Form submission
- Login automation
- File upload automation
- Exploitation
- Brute force
- Request/response viewer
- API mapping UI

---

# Phase 2 Ideas

- Screenshot streaming
- Live browser preview
- Browser playback timeline
- Human approval for risky actions
- Interactive browser control
- Prompt-based task execution
