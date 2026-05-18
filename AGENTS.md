# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the React + TypeScript frontend. Feature pages live in `src/pages/` (for example, `http-history/`, `repeater/`, and `brute-force/`), shared UI primitives in `src/components/ui/`, stores in `src/stores/`, hooks in `src/hooks/`, and helpers in `src/lib/`. Static assets live in `public/` and `src/assets/`.

`src-tauri/` contains the Rust/Tauri backend. Core modules are under `src-tauri/src/`, including `db/` and `proxy/`. Backend test notes live in `src-tauri/tests/README.md`; generated build output such as `dist/` and `src-tauri/target/` should not be edited manually.

## Build, Test, and Development Commands

- `pnpm install` — install frontend dependencies.
- `pnpm dev` — start the Vite dev server on port `1420`.
- `pnpm dev:clean` — free port `1420` and restart the dev server.
- `pnpm build` — create a production frontend build.
- `pnpm preview` — preview the built frontend locally.
- `pnpm tauri` — run the desktop app in Tauri development mode.
- `cd src-tauri && cargo run` — run the Rust backend directly.
- `cd src-tauri && cargo test --lib -- --test-threads=1` — run proxy-focused Rust tests sequentially.

## Coding Style & Naming Conventions

Use TypeScript with React function components. Existing files use 2-space indentation, semicolons, and path aliases such as `@/components/ui/button`. Keep page folders kebab-cased (`brute-force`), React components PascalCased (`RepeaterPage`), hooks camelCased with a `use` prefix (`useTargets`), and Zustand stores short, domain-based names (`target.ts`, `filter.ts`).

There is no committed lint or formatting configuration yet, so match nearby code style and keep imports organized manually. Rust code should follow standard `rustfmt` conventions.

## Frontend Page Pattern

For files under `src/pages/`, prefer a thin page-entry pattern:

- Keep each page `index.tsx` focused on layout composition and wiring top-level sections together.
- Move page orchestration into page-specific hooks such as `hooks/use-http-history-page.ts` or `hooks/use-brute-force-page.ts`.
- Keep derived state, event handlers, store coordination, and side effects inside those page hooks instead of inline in JSX.
- Move static tab definitions, option lists, and long guide content into `constants.ts` files when they are not component-specific.
- Move pure data helpers such as formatting, filtering, and export utilities into `lib/` or `utils/`.
- For large pages, split the UI into small presentational components under `components/` with clear names like `*-toolbar`, `*-filters`, `*-pane`, or `*-dialog`.

For tabbed pages, reuse the shared page primitives in `src/pages/shared/` instead of creating page-local tab bar implementations:

- `src/pages/shared/tab-bar.tsx`
- `src/pages/shared/tabbed-page-layout.tsx`
- `src/pages/shared/use-tab-state.ts`

When refactoring or adding new pages, prefer this shape:

```text
src/pages/feature-name/
  index.tsx
  hooks/
    use-feature-page.ts
  components/
    feature-section.tsx
  constants.ts
  lib/
    helpers.ts
```

This repository now prefers “page entry + page hook + presentational sections” over large all-in-one page files.

## Testing Guidelines

Frontend tests are not configured in `package.json`; when adding UI behavior, document manual verification steps in the PR. Rust tests require a running proxy before execution, as described in `src-tauri/tests/README.md`. Name new tests by behavior, for example `test_connect_tunnel_tls_upgrade_example_com`.

## Commit & Pull Request Guidelines

Recent commits use very short messages such as `update`; no stronger convention is established yet. Prefer clearer imperative summaries going forward, for example `add repeater request editor`.

Pull requests should include a concise description, the affected area (`frontend`, `proxy`, `db`, etc.), linked issues when applicable, test commands or manual verification notes, and screenshots for visible UI changes.

## Security & Configuration Notes

Treat certificate material, database files, HAR captures, and proxy logs as sensitive. Avoid committing new secrets or local runtime artifacts from `src-tauri/.apprecon/`, `src-tauri/data/`, or generated output directories unless intentionally required.
