# Categorized Sidebar Navigation

## Context

The sidebar currently shows all 11 nav items as flat icons. The user wants to group them into logical categories (Recon, Automation, Analyze) so the sidebar shows 3 category icons that each expand into a flyout sub-menu of their child pages. The top-nav remains unchanged.

## Categories

| Category | Icon | Pages |
|----------|------|-------|
| **Recon** | `Crosshair` | Live Traffic (`/`), Intercept (`/intercept`), Repeater (`/repeater`), Invoker (`/invoker`) |
| **Automation** | `Workflow` (`LoaderPinwheel`) | Workflow (`/automation`), Browser (`/browser-automation`), Regression (`/regression`) |
| **Analyze** | `Microscope` | Code (`/playground`), Threats (`/threats`), Debugger (`/debugger`), Tools (`/tools`), Documents (`/documents`) |

## Files to modify

### 1. `src/components/layout/constants.ts`
- Add `NavCategory` interface: `{ label, icon, items: NavItem[] }`
- Export `navCategories: NavCategory[]` grouping the existing items
- Keep `allNavItems` / `mainNavItems` for backward compat (top-nav still uses them)

### 2. `src/components/layout/sidebar/use-sidebar-nav.ts`
- Compute `visibleCategories` from `navCategories` by filtering hidden items from each category
- Compute `isCategoryActive(hrefs)` — true if any child page is the current route

### 3. `src/components/layout/sidebar/index.tsx`
- Replace the flat `visibleNavItems.map(...)` with `visibleCategories.map(...)`
- Each category renders as an icon button. Clicking opens a `Popover` (flyout to the right).
- The popover content lists the category's sub-pages as clickable links with:
  - Page icon, label, active highlight, blinking support, status indicators
- The bottom action icons (terminal, chat, update, settings, theme, license) remain unchanged

## Popover UX

- `Popover` with `side="right"` and `align="start"` so the flyout appears to the right of the icon
- `sideOffset={8}` for a small gap
- Each sub-page link uses the same styling as the current nav items (hover, active state, blinking, status indicator dot)
- Clicking a sub-page navigates and closes the popover
- Active category icon is highlighted when any of its child pages is the current route

## Verification

1. Run `pnpm dev` and open the app
2. Sidebar shows 3 category icons (Crosshair, LoaderPinwheel, Microscope)
3. Click Recon → flyout shows Live Traffic, Intercept, Repeater, Invoker
4. Click a sub-page → navigates, popover closes, category icon stays highlighted
5. The bottom action icons (terminal, chat, settings, theme, license) still work
6. Top-nav horizontal menu still works as before
7. Run `npx tsc --noEmit` — no new TypeScript errors in layout files
