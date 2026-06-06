# Browser Automation

## Overview

The Browser Automation page enables automated crawling and security reconnaissance of web applications. It launches a headless or visible Chromium browser (via Playwright), crawls a target website, and captures page artifacts, AI-generated security insights, and detailed activity logs.

The feature is designed for authorized security assessment: it discovers pages, identifies interesting content, and surfaces potential security issues through both heuristic rules and on-demand AI analysis.

---

## Safety Notice

On first visit, the page displays a dismissible safety alert:

> The browser automation will interact with external websites. Only scan targets you own or are authorized to assess. Unauthorized scanning may violate terms of service or applicable laws.

---

## Architecture

### Page Layout

The page uses a deeply nested [ResizablePanelGroup](file:///Users/arham/Desktop/project/apprecon/src/components/ui/resizable.tsx) layout with the following panels:

```
┌─────────────────────────────────────────────────────────┐
│ Header: Search bar, Config dialog, Play/Pause/Stop       │
├──────────┬──────────────────┬───────────────────────────┤
│ Crawl    │ Page Detail      │ AI Insights               │
│ Tree     │ (screenshot,     │ (severity-ranked,         │
│ (URL     │  HTML, AI        │  filterable, reviewed)    │
│  tree)   │  summary)        │                           │
├──────────┴──────────────────┴───────────────────────────┤
│ Crawl Overview  │  Activity Log                          │
│ (counts,        │  (session, navigation, extraction,     │
│  status,        │   AI, human input, error events)       │
│  duration)      │                                        │
└─────────────────┴────────────────────────────────────────┘
```

All panels are independently resizable. The vertical split separates the upper analysis panels (tree, page detail, insights) from the lower monitoring panels (overview, activity log).

### Page Hook

[useBrowserAutomationPage](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/hooks/use-page.ts) orchestrates:

- Tab state management via [useTabState](file:///Users/arham/Desktop/project/apprecon/src/components/tabs-layout/use-tab-state.ts) (each tab is a separate crawl session).
- Deriving the crawl tree, selected page, filtered insights, filtered logs, interesting pages, and overview from the active tab's store state.
- Search filtering across pages, logs, and insights.

### Zustand Store

[useBrowserAutomationStore](file:///Users/arham/Desktop/project/apprecon/src/stores/browser-automation.ts) manages:

- **Tab management** — add, rename, close tabs; each tab holds its own setup config, session, pages, insights, logs, and UI state.
- **Setup & config** — `updateSetup` patches the [CrawlSetupConfig](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts) and `saveConfig` persists it.
- **Crawl control** — `startCrawl`, `pauseCrawl`, `resumeCrawl`, `stopCrawl`.
- **Human input** — `submitHumanInput` for responding to bot-detection or CAPTCHA challenges.
- **Search** — `setSearch` filters across all panels.
- **Page selection** — `selectPage` for navigating from insights to page detail.

---

## Setup & Configuration

The [CrawlSetupScreen](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/components/setup-screen.tsx) is a dialog form with Zod validation for:

| Field | Type | Description | Constraints |
|---|---|---|---|
| Target URL | URL input | Starting URL for the crawl | Must be valid http/https URL |
| Max Depth | Number | How many link levels to follow | 1–20 |
| Max Pages | Number | Maximum pages to visit | 1–10,000 |
| Delay (ms) | Number | Wait between requests | 0–30,000 |
| Timeout (ms) | Number | Per-page navigation timeout | 1,000–120,000 |
| Network Settle (ms) | Number | Extra wait after page load for API/XHR calls | 0–30,000 |
| Exclude Paths | Text | Comma-separated paths to skip | Each must start with `/` |
| Capture Screenshots | Toggle | Save full-page PNG for each visited page | Default: on |
| Capture Rendered HTML | Toggle | Save post-JS DOM after page load | Default: on |

The config is disabled while a crawl is running to prevent mid-crawl changes.

---

## Crawl Controls

The header toolbar provides:

| Control | Action |
|---|---|
| **Start (Headless)** | Launches crawl with Chromium in headless mode |
| **Start Visible** | Launches crawl with a visible browser window for debugging |
| **Pause** | Pauses the crawl, keeping the browser session alive |
| **Resume** | Resumes a paused crawl from where it left off |
| **Stop** | Stops the crawl and tears down the browser session |

A proxy status warning is shown when the MITM proxy is disconnected, since browser automation relies on the proxy for traffic interception.

---

## Panel Details

### Crawl Tree Panel

The [CrawlTreePanel](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/components/tree-panel.tsx) renders a hierarchical tree of discovered pages:

- Each node shows the page URL and status (queued, current, visited, error, blocked).
- Clicking a node selects it, updating the Page Detail Panel.
- Nodes can be expanded/collapsed to navigate the crawl hierarchy.
- Expanded state is tracked per tab in the Zustand store.
- The tree is filtered by the global search query.

### Page Detail Panel

The [PageDetailPanel](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/components/page-detail-panel.tsx) shows detailed information for the selected page:

- **Screenshot** — full-page PNG captured during the crawl (if enabled).
- **Rendered HTML** — the post-JavaScript DOM (if enabled).
- **Page metadata** — URL, title, HTTP status, depth, parent URL, links found, forms found.
- **AI Summary** — on-demand AI analysis of the page content.
- **Discovered APIs** — API endpoints found in the page's network traffic.

### AI Insights Panel

The [AiInsightsPanel](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/components/insight-panel.tsx) displays security reconnaissance observations:

- **Severity filter** — filter by info, low, medium, high, critical.
- **Interesting Pages** — pages flagged as interesting by heuristic or AI analysis, shown in an accordion section with AI summaries.
- **All Insights** — severity-ranked cards showing type, title, description, URL, timestamp, and review status.
- **Source badges** — "AI" (purple) or tool name (gray) indicating the analysis source.
- **Review workflow** — each insight can be marked as reviewed/unreviewed.
- **Detail dialog** — clicking an insight or interesting page opens a detail dialog with full description and a link to open the associated page.

Insights are generated by the backend during or after the crawl using configured AI providers (or heuristic rules when AI is unavailable).

### Crawl Overview Panel

The [CrawlOverviewPanel](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/components/overview-panel.tsx) provides a summary dashboard:

| Metric | Description |
|---|---|
| Session Status | idle, running, paused, completed, failed, stopped |
| Pages Visited | Count of successfully crawled pages |
| URLs Discovered | Total unique URLs found across all depths |
| URLs Queued | URLs waiting to be crawled |
| Current Depth | The crawl depth currently being processed |
| Errors | Count of pages that failed to load |
| Blocked Pages | Pages excluded by path filters or domain restrictions |
| Forms Found | Total HTML forms discovered |
| Duration | Elapsed crawl time in seconds |

### Activity Log Panel

The [ActivityLogPanel](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/components/ActivityLogPanel.tsx) is a real-time event log showing all crawl activity:

- **Event types** — session, navigation, extraction, AI, human input, policy, error, queue.
- **Severity levels** — info, warning, error with color-coded badges.
- **Clickable rows** — each log entry can be expanded into a detail drawer showing full event metadata.
- **Human input requests** — when the crawl encounters bot detection or CAPTCHAs, it emits human input requests that can be responded to directly from the log.
- **Search filtering** — events are filtered by the global search query.

---

## Types

The [types.ts](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts) defines the core data model:

| Type | Description |
|---|---|
| [CrawlSetupConfig](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts#L25) | Crawl configuration (target URL, depth, limits, toggles) |
| [CrawlSession](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts#L42) | Session metadata (id, status, started/finished timestamps) |
| [CrawlPage](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts#L53) | Individual crawled page (URL, status, depth, AI summary, artifacts) |
| [AIInsight](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts#L73) | Security insight (severity, type, description, review status) |
| [ActivityLog](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts#L90) | Crawl event log entry |
| [HumanInputRequest](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts#L103) | Bot-detection challenge requiring human response |
| [CrawlOverview](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts#L115) | Summary statistics for the crawl session |
| [CrawlTreeNode](file:///Users/arham/Desktop/project/apprecon/src/pages/browser-automation/types.ts#L127) | CrawlPage with recursive children for tree rendering |

---

## Backend

The backend implements the crawl engine using Playwright (Chromium) on the Rust side. It communicates crawl progress, discovered pages, insights, and logs to the frontend via Tauri events and commands.

Key backend behaviors:
- **BFS (Breadth-First Search)** is the only crawl strategy currently supported.
- **Same-domain only** — the crawler restricts navigation to the target domain by default.
- **Excluded paths** — paths matching the comma-separated exclude list are skipped.
- **Network settling** — after page load, the crawler waits the configured settle time to capture late-loading API calls.
- **AI analysis** — when enabled, pages are analyzed by the configured AI provider for security insights.

---

## Related Documentation

- [Live Traffic Performance](file:///Users/arham/Desktop/project/apprecon/docs/live-traffic-performance.md) — the proxy that intercepts traffic during crawls.
- [AI Workflow Provider Configuration](file:///Users/arham/Desktop/project/apprecon/src/stores/ai-settings.ts) — how AI providers are configured for insight generation.
