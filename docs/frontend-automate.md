# AI Browser Automation - Frontend Detail

## Feature Name

AI Browser Automation - Headless Crawl UI

## Purpose

The frontend provides visibility and control for a headless AI browser crawl session.

The browser itself does not need to be visible in Phase 1. The UI should focus on:

- Crawl tree
- Crawl overview
- AI insights
- Activity logs
- Session controls
- Page details

The frontend should not duplicate existing AppRecon features like API Mapping, Live Traffic, Repeater, or HTTP History.

---

# Tech Stack

Recommended frontend stack:

- Tauri frontend
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand or TanStack Query
- Tauri events for real-time crawl updates

---

# Main Page Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ AI Browser Automation                                                │
│ Target: https://example.com | Mode: BFS | Status: Running            │
│ [Pause] [Resume] [Stop] [Export]                                     │
├──────────────────────┬──────────────────────┬────────────────────────┤
│ Crawl Tree           │ Crawl Overview        │ AI Insights            │
│                      │                      │                        │
│ Site structure       │ Crawl statistics      │ Recon observations     │
│                      │                      │                        │
├──────────────────────┴──────────────────────┴────────────────────────┤
│ Activity Log                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

# Page Sections

## 1. Crawl Setup Screen

Used before starting a crawl.

### Fields

- Target URL
- Max depth
- Max pages
- Same-domain only
- Include paths
- Exclude paths
- Request delay
- Timeout
- Enable AI insights

### Actions

- Start Crawl
- Save Preset
- Load Preset

### Example UI

```text
Target URL
[ https://target.com ]

Limits
Max Depth: [ 5 ]
Max Pages: [ 500 ]
Delay: [ 500ms ]

Scope
[✓] Same domain only
Include: /app/*, /dashboard/*
Exclude: /logout, /delete, /billing

[Start Crawl]
```

---

## 2. Crawl Tree Panel

Displays discovered page structure.

### Node Status

```text
✓ Visited
○ Queued
● Current
⚠ Error
⛔ Blocked
```

### Example

```text
/
├─ /about
│  ├─ /team
│  └─ /careers
├─ /products
│  ├─ /web
│  ├─ /mobile
│  └─ /api
├─ /pricing
└─ /contact
```

### Required Features

- Expand/collapse nodes
- Search URL
- Filter by status
- Show depth level
- Show page title
- Click node to open detail drawer
- Highlight current crawling page

---

## 3. Crawl Overview Panel

Shows real-time crawl metrics.

### Metrics

- Session status
- Pages visited
- URLs discovered
- URLs queued
- Current depth
- Errors
- Blocked pages
- Forms found
- Crawl duration

### Example

```text
Status: Running
Pages Visited: 178
URLs Discovered: 348
Queued URLs: 34
Errors: 2
Forms Found: 12
Duration: 00:12:47
```

---

## 4. AI Insights Panel

Shows AI-generated crawl insights.

### Insight Types

- Authentication page detected
- Login form detected
- Upload form detected
- Admin route detected
- Hidden route detected
- JavaScript route detected
- Error page detected
- Interesting page detected

### Severity

```text
Info
Low
Medium
High
Critical
```

### Example

```text
[Medium] Admin route discovered: /admin
[Medium] Upload form detected: /profile/avatar
[Info] Login page detected: /login
[Low] JavaScript contains client-side route references
```

### Required Features

- Filter by severity
- Filter by type
- Click insight to open related page
- Mark insight as reviewed
- Export insights

---

## 5. Activity Log Panel

Shows real-time crawl events.

### Event Examples

```text
10:01:22 Started crawl
10:01:24 Opened /
10:01:25 Extracted 18 links
10:01:26 Queued /about
10:01:27 Queued /pricing
10:02:01 Opened /login
10:02:02 Login form detected
```

### Required Features

- Real-time updates
- Search logs
- Filter logs by type
- Copy log line
- Export logs

### Log Types

- Session
- Navigation
- Extraction
- AI
- Policy
- Error
- Queue

---

## 6. Page Detail Drawer

Opened when user clicks a Crawl Tree node.

### Fields

- URL
- Page title
- Status
- Depth
- Parent URL
- HTTP status
- Links found
- Forms found
- Discovered at
- Visited at
- AI summary

### Example

```text
URL: /products/mobile
Title: Mobile App
Status: Visited
Depth: 2
HTTP Status: 200
Links Found: 12
Forms Found: 1
Discovered From: /products
```

### Actions

- Open in browser
- Copy URL
- Send URL to existing AppRecon modules
- Mark as interesting

---

# Frontend State Model

## Crawl Session

```ts
type CrawlSession = {
  id: string;
  targetUrl: string;
  status: "idle" | "running" | "paused" | "completed" | "failed" | "stopped";
  strategy: "bfs";
  maxDepth: number;
  maxPages: number;
  startedAt?: string;
  finishedAt?: string;
};
```

## Crawl Page

```ts
type CrawlPage = {
  id: string;
  sessionId: string;
  url: string;
  title?: string;
  status: "queued" | "current" | "visited" | "error" | "blocked";
  depth: number;
  parentUrl?: string;
  httpStatus?: number;
  linksFound: number;
  formsFound: number;
};
```

## AI Insight

```ts
type AIInsight = {
  id: string;
  sessionId: string;
  pageId?: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  type: string;
  title: string;
  description: string;
  url?: string;
  reviewed: boolean;
  createdAt: string;
};
```

## Activity Log

```ts
type ActivityLog = {
  id: string;
  sessionId: string;
  level: "info" | "warning" | "error";
  type: "session" | "navigation" | "extraction" | "ai" | "policy" | "queue";
  message: string;
  url?: string;
  createdAt: string;
};
```

---

# Real-Time Events From Backend

The frontend should listen to Tauri events.

## Events

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

# Frontend Workload

## Milestone 1: Static UI

- Build AI Browser page shell
- Build crawl setup form
- Build crawl tree mock
- Build crawl overview cards
- Build AI insights panel
- Build activity log panel

## Milestone 2: State Integration

- Add session store
- Add crawl page store
- Add insight store
- Add log store
- Connect Tauri event listeners

## Milestone 3: Controls

- Start crawl
- Pause crawl
- Resume crawl
- Stop crawl
- Export crawl data

## Milestone 4: Details

- Add page detail drawer
- Add insight filters
- Add log filters
- Add URL search

---

# Phase 1 Exclusions

Do not build these in Phase 1:

- Live browser preview
- Interactive browser control
- API mapping
- Request/response viewer
- Repeater integration UI
- Vulnerability exploitation UI

These should remain in other AppRecon modules or future phases.

---

# Phase 2 Ideas

- Browser playback timeline
- Interactive browser preview
- Human approval for risky actions
- AI prompt-based navigation
