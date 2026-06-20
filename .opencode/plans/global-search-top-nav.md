# Global Search Bar in Top Nav with Context Switching

## Context

The top-nav currently has no search functionality. Each page has its own domain-specific data (HTTP records, repeater tabs, invoker tabs, documents, workflows, etc.) but there's no unified way to search across them. The user wants an always-visible search bar in the top-nav that automatically switches its search context based on the current page — searching HTTP history on Live Traffic, repeater tabs on Repeater, etc.

`cmdk` (v1.1.1) is already installed, and a full shadcn/ui `Command` component suite exists at [command.tsx](file:///Users/arham/Desktop/project/apprecon/src/components/ui/command.tsx).

## Design

### Component Architecture

```
top-nav.tsx (modified)
  └── GlobalSearch (new) — inline search bar + dropdown
        ├── useGlobalSearch() hook — resolves context, manages state
        └── search-contexts.ts — route → search provider registry
```

### Search Bar UX

- **Placement**: Inline in the top-nav, between the navigation items and the right-side actions (ProxyButton, OpenBrowserButton, drag handle)
- **Appearance**: Compact input (~200px wide, auto-expands on focus) with a search icon
- **Trigger**: Click to focus, or press `/` (slash) keyboard shortcut
- **Dropdown**: Popover below the input showing filtered results, closes on Escape or click-away
- **Empty state**: "No results" message contextual to the page type
- **Result item**: Icon + title + optional subtitle; clicking performs the context-specific action

### Search Contexts (by route)

| Route | Placeholder | Searches | Action on click |
|-------|-------------|----------|-----------------|
| `/` (Live Traffic) | "Search HTTP history…" | URL, method, status, host from proxy records | Open entry in inspector |
| `/repeater` | "Search repeater tabs…" | Tab name and request URL | Select that tab |
| `/invoker` | "Search attacks…" | Tab name, base URL, attack results | Select that tab |
| `/intercept` | "Search intercept rules…" | Intercept rule patterns | Focus rule |
| `/documents` | "Search documents…" | Document names, API entry URLs | Select document |
| `/automation` | "Search workflows…" | Workflow names | Select workflow |
| `/browser-automation` | "Search browser sessions…" | Tab URLs, hosts | Select browser tab |
| `/debugger` | "Search debug logs…" | Log entries | Select entry |
| `/tools` | "Search tools…" | Tool names | Navigate to tool |
| `/regression` | "Search regression tests…" | Test names | Select test |
| Other/fallback | "Search pages…" | Page/route names | Navigate to page |

### Data Flow

1. User types in search bar → `searchQuery` state updates
2. `useGlobalSearch()` hook reads `pathname` from `useLocation()`, looks up the matching search context
3. Search context's `search(query)` function runs against the relevant store data
4. Results render in the dropdown
5. User clicks a result → context's `onSelect(result)` dispatches the action (navigate, select tab, etc.)

### Type System

```typescript
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

interface SearchContext {
  placeholder: string;
  search: (query: string) => SearchResult[];
}
```

## Implementation Plan

### Task 1: Create `src/components/layout/global-search.tsx`

Create the main `GlobalSearch` component:
- Renders an input with search icon inside the top-nav area
- Uses a `Popover` (from shadcn) to show results dropdown
- Listens for `/` keypress globally to focus the input
- Manages `open`, `query`, `results` state
- Renders results as a list of clickable items (icon + title + subtitle)
- Calls `useGlobalSearch()` hook to resolve current context and get results

### Task 2: Create search context registry

In `src/components/layout/global-search.tsx` (or a co-located `search-contexts.ts`):
- Define `SearchContext` and `SearchResult` types
- Create a `useSearchContext()` hook that:
  - Reads `pathname` via `useLocation()`
  - Returns the matching `SearchContext` for the current route
- Implement search functions for each supported page, querying the appropriate Zustand stores:
  - **Live Traffic**: Search `useFilterStore` and proxy records by URL/method/status
  - **Repeater**: Search `useRepeaterStore` tabs by name/URL
  - **Invoker**: Search `useInvokerStore` tabs by name/config URL
  - **Documents**: Search `useDocumentsStore` documents by name
  - **Automation**: Search `useAutomationStore` workflows by name
  - **Browser**: Search `useBrowserAutomationStore` tabs by URL
  - **Intercept**: Search intercept rules
  - **Debugger**: Search `useDebuggerStore` entries
  - **Tools**: Search tool names
  - **Regression**: Search `useRegressionStore` tests
  - **Fallback**: Page navigation search using `mainNavItems` from constants

### Task 3: Integrate into `top-nav.tsx`

Modify [top-nav.tsx](file:///Users/arham/Desktop/project/apprecon/src/components/layout/top-nav.tsx):
- Import `GlobalSearch` component
- Insert `<GlobalSearch />` between the nav scroll area and the right-side action buttons (around line 165, before `<ProxyButton />`)
- The search bar sits in the flexible space, centered or left-aligned, not overlapping nav items or right actions

## Verification

1. **Smoke test**: Start the app with `pnpm dev`, verify the search bar appears in the top-nav on every page
2. **Context switching**: Navigate to Live Traffic → placeholder says "Search HTTP history…", navigate to Repeater → placeholder changes to "Search repeater tabs…"
3. **Search on Live Traffic**: Type a URL fragment, verify matching HTTP records appear in dropdown, click one → inspector opens for that entry
4. **Search on Repeater**: Type a tab name, verify matching tabs appear, click → selects that tab
5. **Keyboard shortcut**: Press `/` on any page, verify search bar gains focus
6. **Escape**: Press Escape, verify dropdown closes and search bar blurs
7. **Empty query**: Verify no dropdown shown when input is empty
8. **No results**: Type gibberish, verify "No results" message appears
9. **Fallback page**: Navigate to Settings (unmapped route), verify page navigation search works
