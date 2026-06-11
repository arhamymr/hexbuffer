# Termul Browser — Embedded Webview & Annotation System (Reference)

## Overview

The Termul reference implementation includes an **embedded web browser with a real-time annotation overlay system**. It provides an in-app browsing experience where users can navigate to any URL, visually annotate regions or DOM elements on the page, add notes, and export annotations in multiple formats.

The feature is built as a native Tauri webview with a JavaScript-injected annotation overlay, coordinated through a layered React + Zustand + IPC architecture.

> **Reference location:** `reference/termul/src/renderer/components/browser/`

---

## Architecture

### Component Hierarchy

```
BrowserPanel (orchestrator)
├── BrowserControls (URL bar + nav)
├── AnnotationPanel (sidebar, 288px)
├── AnnotationExportModal (dialog)
├── useBrowserWebview (webview lifecycle hook)
├── useAnnotationCapture (IPC event subscription hook)
└── useAnnotationMarkers (visual marker injection hook)
```

### Data Flow

```
┌────────────────────┐       ┌────────────────────┐
│  browser-session-  │       │  annotation-store   │
│  store (Zustand)   │       │  (Zustand)          │
│  - tabs Map        │       │  - annotationsByUrl │
│  - url, loading    │       │  - selectedAnnotation│
│  - annotationMode  │       │    IdByUrl          │
│  - annotationSub-  │       │                     │
│    Mode            │       │                     │
└────────┬───────────┘       └──────────┬──────────┘
         │                              │
         ▼                              ▼
┌──────────────────────────────────────────────────┐
│ BrowserPanel                                      │
│  - reads both stores                              │
│  - runs reconcileOverlay (promise-chain)          │
│  - mounts annotation hooks                        │
└──────────────────────┬───────────────────────────┘
                       │ IPC (invoke / listen)
                       ▼
┌──────────────────────────────────────────────────┐
│ Rust/Tauri Backend                                │
│  - browser_tab_create / show / hide / navigate    │
│  - browser_tab_inject_annotation (JS overlay)     │
│  - browser_tab_inject_annotation_markers          │
│  - emits events: tab-navigated, tab-loaded,       │
│    tab-region-captured, tab-element-captured,     │
│    tab-annotation-marker-clicked, tab-title-changed│
└──────────────────────────────────────────────────┘
```

---

## Key Capabilities

### 1. Embedded Webview

**Files:** `BrowserPanel.tsx`, `hooks/use-browser-webview.ts`, `lib/browser-api.ts`

The webview is a native Tauri webview element positioned over a React container `<div>`. The `useBrowserWebview` hook manages its full lifecycle:

- **Create/destroy**: `browser_tab_create` is called on mount with the container's bounding rect; `browser_tab_destroy` on unmount. A `mountToken` guards against stale async callbacks.
- **Show/hide**: The webview is hidden (`browser_tab_hide`) when the panel is not visible and shown (`browser_tab_show`) when it becomes visible.
- **Resize**: A `ResizeObserver` on the container div calls `browser_tab_resize` to keep the native webview in sync with the DOM layout.
- **Navigation**: URL changes (from the input bar or external sync) trigger `browser_tab_navigate`. The backend emits `browser-tab-navigated` events back, enabling bidirectional URL sync.
- **Loading state**: Set to `true` on navigate, cleared by `browser-tab-loaded` events. A 6-second safety timeout prevents indefinite spinners.
- **Multi-tab**: Each tab gets its own webview instance, tracked in `browser-session-store` as a `Map<string, BrowserTab>`.

### 2. Browser Controls (URL Bar)

**File:** `BrowserControls.tsx`

A compact toolbar (36px height) providing:

| Button | Action |
|--------|--------|
| Back (←) | `browser_tab_go_back` |
| Forward (→) | `browser_tab_go_forward` |
| Reload (↻) | `browser_tab_reload` |
| URL input | Auto-prefixes `https://`, navigates on Enter or blur |
| DevTools (bug icon) | `browser_tab_open_devtools` |
| Annotation toggle (pencil icon) | Toggles `annotationMode` in store |

The loading spinner replaces the globe icon while a page is loading. The annotation button shows a highlighted/pressed state when active.

### 3. Annotation System

The annotation system is the core differentiator of this feature. It enables users to mark up any web page with typed, classified, and exportable annotations.

#### Annotation Types

| Type | Sub-mode | Geometry | How it works |
|------|----------|----------|-------------|
| **Region** | `draw` | `rect { x, y, width, height }` | User draws a rectangle on the injected overlay |
| **Element** | `select` | `element { tagName, selector, attributes, textContent, boundingBox }` | User clicks a DOM element; the overlay captures full element metadata |
| **Note** | N/A | `point { x, y }` | User adds a page-level sticky note (placed at origin) |

#### Overlay Injection & Reconciliation

**File:** `BrowserPanel.tsx` (reconcileOverlay callback)

When annotation mode is enabled, the Rust backend injects a JavaScript overlay (`annotation-overlay.js`) into the webview. This overlay installs **capture-phase** event listeners for `mousedown`, `mousemove`, `mouseup`, `click`, `keydown`, and `contextmenu`.

The reconciler is a **serialized promise chain** that ensures the overlay state never races:

1. A `desiredModeRef` tracks what *should* be injected (a sub-mode, or `null` for removed).
2. An `injectedModeRef` tracks what *is* currently injected.
3. Every inject/remove IPC call is chained onto `reconcileChainRef`, so a hide's remove always settles before a show's inject.
4. Each reconcile pass re-reads the latest desired state, so stale in-flight passes converge instead of clobbering.

**Mode switching** requires a clean teardown: the current overlay is removed before the new one is injected, ensuring capture handlers are properly rewired.

**Failure handling**: If injection fails (e.g., strict CSP pages), the system:
- Sets `annotationOverlayAvailable = false`
- Shows a toast error
- Rolls back the sub-mode to the last working mode

**Page load re-injection**: After navigation, the prior overlay is gone. The `onBrowserTabLoaded` listener resets `injectedModeRef` and triggers reconciliation to re-inject.

#### Annotation Capture

**File:** `hooks/use-annotation-capture.ts`

Subscribes to two Tauri events:

- `browser-tab-region-captured` → creates a `region` annotation with rect geometry
- `browser-tab-element-captured` → creates an `element` annotation with full DOM metadata (tag, selector, confidence level, allowlisted attributes, text content, bounding box)

Both events include viewport dimensions for responsive coordinate mapping.

#### Annotation Markers

**File:** `hooks/use-annotation-markers.ts`

Pushes annotation positions back into the webview as visual markers:

- Filters annotations to `region` and `element` types
- Calls `browser_tab_inject_annotation_markers` with the marker list and selected ID
- Uses `requestAnimationFrame` coalescing to avoid IPC flooding during rapid store changes
- Listens for `browser-tab-annotation-marker-clicked` to sync selection from webview → sidebar
- On page reload, clears cached refs so the re-injected overlay receives markers

#### Annotation Panel (Sidebar)

**File:** `AnnotationPanel.tsx`

A 288px-wide right sidebar showing all annotations for the current URL:

- **Toolbar**: Draw/Select mode toggle (button group), Add Note button, Export button
- **Annotation list**: Scrollable list of `AnnotationItem` cards
- **Empty state**: "No annotations on this page."

Each `AnnotationItem` card displays:

- **Intent badge**: Color-coded — `fix` (red), `change` (amber), `question` (blue), `approve` (green)
- **Severity dot**: `blocking` (red), `important` (amber), `suggestion` (blue)
- **Geometry details**: Rect coordinates for regions; tag name, selector preview, confidence badge, and text preview for elements
- **Editable description**: Click to edit inline with Save/Cancel
- **Dropdowns**: Intent and Severity selectors for inline reclassification
- **Delete button**: Removes the annotation
- **Auto-scroll**: Selected annotation scrolls into view

**Accessibility**: Toolbar supports arrow key navigation (Left/Right/Home/End).

### 4. Export System

**Files:** `AnnotationExportModal.tsx`, `lib/annotation-export.ts`

A modal dialog with three export format tabs:

#### Markdown

Three output levels:

- **Compact**: Single-line per annotation — `1. rect(x,y,w,h) > description`
- **Standard**: Multi-line with intent/severity badges and element text preview
- **Detailed**: Full annotation record with all geometry fields, attributes table (for elements), viewport dimensions, and ISO timestamps

#### JSON

Structured output with `schemaVersion: 1` and `exportedAt` timestamp. Each annotation includes all fields: id, url, normalizedUrl, pageTitle, type, geometry, intent, severity, description, viewport, and timestamps.

#### AFS (Agentation Format)

A specialized JSON format designed for agent/tool consumption:
- Maps coordinates to viewport-relative percentages (e.g., `x: (boundingBox.x / viewportWidth) * 100`)
- Uses `elementPath` for selectors, `element` for tag names
- Falls back to `body` for note-type annotations
- Strips a strict set of unsupported AFS fields

All formats support **Copy to Clipboard** with idle/copied/error state feedback.

---

## Data Model

### Browser Session Store

```typescript
interface BrowserTab {
  id: string
  url: string
  title: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  annotationMode: boolean
  annotationSubMode: 'draw' | 'select'
}
```

Tabs are stored in a `Map<string, BrowserTab>` for O(1) lookup by tab ID.

### Annotation Store

```typescript
interface Annotation {
  id: string                // crypto.randomUUID()
  browserTabId: string
  url: string
  normalizedUrl: string     // tracking params stripped, host lowercased
  pageTitle: string
  type: 'note' | 'region' | 'element'
  geometry: RegionGeometry | NoteGeometry | ElementGeometry
  intent: 'fix' | 'change' | 'question' | 'approve'
  severity: 'blocking' | 'important' | 'suggestion'
  description: string
  viewportWidth: number
  viewportHeight: number
  schemaVersion: 1
  createdAt: number
  updatedAt: number
}
```

Annotations are keyed by **normalized URL** (`annotationsByUrl: Map<string, Annotation[]>`). The `normalizeUrl` utility strips UTM/Facebook/Google tracking params, hash anchors, and normalizes trailing slashes.

### Element Geometry (captured from DOM)

```typescript
interface ElementGeometry {
  type: 'element'
  tagName: string
  selector: string                           // CSS selector, max 500 chars
  selectorConfidence: 'unique-id' | 'unique-class' | 'fallback'
  attributes: Record<string, string>          // allowlisted: id, class, name, role, type, aria-*
  textContent: string                         // max 2000 chars
  textTruncated: boolean
  boundingBox: { x, y, width, height }
}
```

**Sanitization pipeline**: Control characters stripped, strings truncated to safe limits, attributes filtered to an allowlist, bounding box values coerced to finite numbers.

---

## IPC API Surface

### Commands (Renderer → Rust)

| Command | Parameters | Purpose |
|---------|-----------|---------|
| `browser_tab_create` | tabId, url, bounds | Create a new webview |
| `browser_tab_navigate` | tabId, url | Navigate to URL |
| `browser_tab_resize` | tabId, bounds | Resize webview to match container |
| `browser_tab_show` | tabId | Make webview visible |
| `browser_tab_hide` | tabId | Hide webview |
| `browser_tab_destroy` | tabId | Destroy webview |
| `browser_tab_go_back` | tabId | Browser back |
| `browser_tab_go_forward` | tabId | Browser forward |
| `browser_tab_reload` | tabId | Reload page |
| `browser_tab_open_devtools` | tabId | Open debug console |
| `browser_tab_inject_annotation` | tabId, mode | Inject annotation overlay JS |
| `browser_tab_remove_annotation_overlay` | tabId | Remove annotation overlay |
| `browser_tab_inject_annotation_markers` | tabId, annotationsJson, selectedId | Render visual markers |
| `browser_tab_update_annotation_marker_selection` | tabId, selectedId | Update marker selection highlight |

### Events (Rust → Renderer)

| Event | Payload | Purpose |
|-------|---------|---------|
| `browser-tab-navigated` | { browserTabId, url } | URL changed in webview |
| `browser-tab-loaded` | { browserTabId } | Page finished loading |
| `browser-tab-title-changed` | { browserTabId, title } | Document title updated |
| `browser-tab-region-captured` | { browserTabId, x, y, width, height, viewportWidth, viewportHeight } | Rectangle drawn |
| `browser-tab-element-captured` | { browserTabId, url, title, tagName, selector, selectorConfidence, attributes, textContent, textTruncated, boundingBox, viewportWidth, viewportHeight } | Element selected |
| `browser-tab-annotation-marker-clicked` | { browserTabId, annotationId } | Marker clicked in webview |

---

## Key Design Decisions

1. **Promise-chain serialization for overlay IPC** — Prevents race conditions when tab/visibility changes happen rapidly. Every inject/remove funnels through a single promise chain, so operations never overlap.

2. **RAF coalescing for marker updates** — Annotation store changes can fire rapidly (e.g., during bulk operations). Using `requestAnimationFrame` ensures at most one IPC call per frame.

3. **Overlay reconciliation on page load** — After navigation, the injected overlay is destroyed. The `onBrowserTabLoaded` listener resets the "injected" ref and triggers reconciliation to re-inject automatically.

4. **Annotation unavailability detection** — Pages with strict Content Security Policy may reject the injected overlay. The system detects this failure, disables the `select` sub-mode, and shows a toast notification.

5. **Webview visibility management during export** — The webview is explicitly hidden when the export modal opens (to avoid rendering conflicts with the dialog) and restored on close.

6. **URL normalization for annotation grouping** — Tracking parameters (UTM, fbclid, gclid) and hash anchors are stripped so annotations persist across minor URL variations.

7. **Session-scoped annotations** — Annotations live in memory only (Zustand store, not persisted). They are cleared when the app closes or when `clearAnnotationsForTab` is called.

8. **Sanitization of captured DOM data** — All text captured from the webview is sanitized (control chars stripped, strings truncated, attributes filtered to an allowlist) to prevent injection and memory issues.

---

## File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `components/browser/BrowserPanel.tsx` | 274 | Main orchestrator: webview, overlay reconciliation, layout |
| `components/browser/BrowserControls.tsx` | 137 | URL bar, navigation, devtools, annotation toggle |
| `components/browser/AnnotationPanel.tsx` | 448 | Annotation sidebar with list, editing, toolbar |
| `components/browser/AnnotationExportModal.tsx` | 141 | Export dialog with Markdown/JSON/AFS tabs |
| `hooks/use-browser-webview.ts` | 212 | Webview lifecycle: create, show/hide, resize, navigate |
| `hooks/use-annotation-capture.ts` | 86 | Subscribes to region/element capture IPC events |
| `hooks/use-annotation-markers.ts` | 145 | Pushes annotation markers into webview, handles selection |
| `lib/browser-api.ts` | 234 | Tauri IPC wrapper: commands + event subscriptions |
| `lib/annotation-export.ts` | 199 | Markdown, JSON, and AFS export formatters |
| `stores/browser-session-store.ts` | 140 | Zustand: tab state, annotation mode, sub-mode |
| `stores/annotation-store.ts` | 346 | Zustand: annotations by URL, CRUD, selection, sanitization |
