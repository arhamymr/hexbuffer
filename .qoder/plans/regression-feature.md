# Regression Testing Feature

## Context

AppRecon lacks an automated regression/QA testing capability. Currently, users must manually verify that app features work correctly after changes. This plan adds a dedicated regression testing page where users can create test cases (define browser steps + assertions), run them through Playwright (already bundled in the AI engine sidecar), and use AI to both generate test steps and verify results — making QA repeatable and automated.

## Files to Create

### Sidecar (Node.js)
| File | Purpose |
|------|---------|
| `sidecars/lib/regression.mjs` | Regression test runner using Playwright, emits JSON-line events |
| `sidecars/lib/regression/types.mjs` | Zod schemas for test case/step/result types |
| `sidecars/lib/regression/executor.mjs` | Playwright step executor (navigate, click, fill, etc.) |
| `sidecars/lib/regression/ai-verifier.mjs` | AI-powered post-execution verification |

### Sidecar CLI
| File | Changes |
|------|---------|
| `sidecars/lib/cli.mjs` | Add `regression` mode dispatch |
| `sidecars/index.mjs` | Register `regression` as valid mode in preflight |

### Backend (Rust)
| File | Purpose |
|------|---------|
| `src-tauri/src/commands/regression.rs` | `run_regression_test` Tauri command, spawns sidecar in regression mode |
| `src-tauri/src/commands/mod.rs` | Register new command module |
| `src-tauri/src/db/schema.rs` | Add `CREATE_REGRESSION_TABLES` SQL |
| `src-tauri/src/db/repository/regression.rs` | DB CRUD for test suites and run history |
| `src-tauri/src/db/repository/mod.rs` | Register new repository module, init tables |
| `src-tauri/src/lib.rs` | Register new command + DB init call |

### Frontend (React/TypeScript)
| File | Purpose |
|------|---------|
| `src/pages/regression/index.tsx` | Page entry: test suite list + run panel |
| `src/pages/regression/types.ts` | TypeScript types (TestCase, TestStep, RunResult, etc.) |
| `src/pages/regression/constants.ts` | Step type registry, AI prompt templates |
| `src/pages/regression/hooks/use-regression-page.ts` | Page orchestration hook |
| `src/pages/regression/components/test-suite-editor.tsx` | Create/edit test cases with step builder |
| `src/pages/regression/components/test-runner.tsx` | Run tests with live progress display |
| `src/pages/regression/components/test-results.tsx` | Pass/fail results with AI analysis |
| `src/pages/regression/components/step-builder.tsx` | Drag/click step construction UI |
| `src/pages/regression/components/ai-step-generator.tsx` | AI-powered step generation dialog |
| `src/stores/regression.ts` | Zustand store: test suites, execution state, results |
| `src/App.tsx` | Add `/regression` route |
| `src/components/layout/constants.ts` | Add nav item for regression page |

## Implementation Plan

### Task 1: Define data schemas and types

Create the shared type definitions used across all layers.

**Frontend types** (`src/pages/regression/types.ts`):
- `TestStep` discriminated union: `navigate`, `click`, `fill`, `wait`, `screenshot`, `assert-visible`, `assert-text`, `assert-url`, `ai-verify`
- `TestCase` with id, name, targetUrl, steps, enabled flag, createdAt/updatedAt
- `TestRun` with id, testCaseId, status (queued/running/passed/failed), startedAt/finishedAt
- `StepResult` with stepIndex, status (passed/failed/skipped), error, screenshot, duration
- `AiVerificationResult` with verdict (pass/fail), reasoning, suggestions

**Sidecar schemas** (`sidecars/lib/regression/types.mjs`):
- Zod schemas mirroring the TS types for runtime validation

**DB schema** (`src-tauri/src/db/schema.rs`):
```sql
CREATE TABLE regression_test_cases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE regression_runs (
  id TEXT PRIMARY KEY,
  test_case_id TEXT NOT NULL,
  status TEXT NOT NULL,
  step_results_json TEXT NOT NULL DEFAULT '[]',
  ai_verdict TEXT,
  started_at TEXT,
  finished_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(test_case_id) REFERENCES regression_test_cases(id) ON DELETE CASCADE
);
```

### Task 2: Sidecar — Regression test runner

**`sidecars/lib/regression/executor.mjs`**:
- Takes test case definition, creates Playwright browser context
- Executes steps sequentially: navigate, click (by selector/text), fill, wait, screenshot, assert-*
- Emits JSON-line events: `regression:step_started`, `regression:step_completed`, `regression:step_failed`, `regression:assertion_passed`, `regression:assertion_failed`
- Captures screenshots on failure and on explicit screenshot steps
- Returns final HTML snapshots for AI verification

**Step implementations**:
- `navigate`: `page.goto(url)`, wait for network idle
- `click`: `page.click(selector)` with 5s timeout
- `fill`: `page.fill(selector, value)` with clear-before-fill
- `wait`: `page.waitForTimeout(ms)`
- `screenshot`: `page.screenshot({ path, fullPage: true })`
- `assert-visible`: `page.waitForSelector(selector, { state: 'visible' })`
- `assert-text`: `page.getByText(expected).first().waitFor({ state: 'visible' })`
- `assert-url`: `page.waitForURL(pattern)` or regex match
- `ai-verify`: delegates to AI verifier (below)

**`sidecars/lib/regression/ai-verifier.mjs`**:
- Reuses existing `createAgent()` from `sidecars/lib/ai/adapter.mjs`
- Takes page HTML snapshot + screenshot + user's natural language prompt
- Returns structured verdict: `{ pass: boolean, reasoning: string, suggestions?: string[] }`
- Agent instructions: "You are a QA verifier. Inspect the page state and determine if it matches the expected behavior..."

**`sidecars/lib/regression.mjs`** (main entry):
- Reads `0XBUFFER_REGRESSION_CONFIG_JSON` from env
- Runs `executor` then `ai-verifier`
- Emits `regression:test_finished` with summary

**`sidecars/lib/cli.mjs`** — add:
```js
if (mode === 'regression') {
  await runRegression();
  return;
}
```

**`sidecars/index.mjs`** — add `regression` to `VALID_MODES`, add config validation (check `0XBUFFER_REGRESSION_CONFIG_JSON` has required fields).

### Task 3: Backend — Tauri commands + DB

**`src-tauri/src/commands/regression.rs`**:
- `run_regression_test(app, test_case_id: String)` command
  - Loads test case from DB
  - Spawns sidecar in `regression` mode with session ID + config JSON as env vars
  - Reads stdout JSON-line events, maps to Tauri events (`regression:step-started`, `regression:step-completed`, etc.)
  - On test finished, persists RunResult to DB
- `list_regression_test_cases(app)` — returns all test cases
- `save_regression_test_case(app, test_case)` — upserts test case
- `delete_regression_test_case(app, id)` — deletes test case + cascaded runs
- `list_regression_runs(app, test_case_id)` — returns run history for a test case

**`src-tauri/src/db/repository/regression.rs`**:
- CRUD operations for `regression_test_cases` and `regression_runs` tables
- Follows existing repository patterns (Connection via Mutex, JSON serialization for steps)

**`src-tauri/src/db/schema.rs`** — add `CREATE_REGRESSION_TABLES` constant

**`src-tauri/src/db/repository/mod.rs`** — register module, init tables

**`src-tauri/src/commands/mod.rs`** — add `pub mod regression;`

**`src-tauri/src/lib.rs`** — register commands + DB init call

### Task 4: Frontend — Zustand store

**`src/stores/regression.ts`**:
```ts
interface RegressionState {
  testCases: TestCase[];
  runs: Record<string, TestRun[]>; // testCaseId → runs
  activeRun: { testCaseId: string; runId: string } | null;
  liveSteps: StepResult[]; // real-time step results during a run
  
  // Actions
  loadTestCases: () => Promise<void>;
  saveTestCase: (tc: TestCase) => Promise<void>;
  deleteTestCase: (id: string) => Promise<void>;
  runTest: (testCaseId: string) => Promise<void>;
  loadRuns: (testCaseId: string) => Promise<void>;
}
```
- Listens for Tauri events `regression:step-*`, `regression:test-finished` to update `liveSteps` in real-time
- Uses `invoke` for all backend communication

### Task 5: Frontend — Page and components

**`src/pages/regression/index.tsx`** — Two-panel layout:
- Left panel: test case list with add/delete/run buttons
- Right panel: editor (when editing) or results (when viewing runs)

**`src/pages/regression/components/test-suite-editor.tsx`**:
- Name + target URL inputs
- Step list with drag-to-reorder
- Each step shows type icon + summary, click to edit
- "Add Step" button opens step type picker
- "Generate with AI" button opens AI step generator
- Save button

**`src/pages/regression/components/step-builder.tsx`**:
- Step type dropdown (navigate, click, fill, wait, screenshot, assert-*, ai-verify)
- Dynamic form fields based on step type:
  - navigate: URL input
  - click: CSS selector input
  - fill: selector + value inputs
  - wait: milliseconds input
  - screenshot: name input
  - assert-visible/assert-text: selector + expected value
  - assert-url: URL pattern input
  - ai-verify: natural language prompt textarea

**`src/pages/regression/components/ai-step-generator.tsx`**:
- Dialog where user describes the test scenario in natural language
- "Given the target URL, generate test steps to verify XYZ"
- Uses existing chat AI (via `send_ai_chat_message`) to generate step JSON
- Parses and pre-fills the step builder

**`src/pages/regression/components/test-runner.tsx`**:
- Run button with play icon
- Live progress display: step list with animated status indicators (pending → running → passed/failed)
- Step duration display
- Auto-scroll to current step
- Stop/abort button
- Screenshot preview on failed steps (if captured)

**`src/pages/regression/components/test-results.tsx`**:
- Run history list for selected test case
- Click a run to see step-by-step results
- Pass/fail badge per step
- AI verdict section with reasoning and suggestions
- Re-run button

**`src/pages/regression/hooks/use-regression-page.ts`**:
- Orchestrates store interactions
- Manages editing vs viewing state
- Handles run lifecycle (start → listen events → finish)

**`src/App.tsx`** — Add:
```tsx
import { RegressionPage } from "@/pages/regression";
// ...
<Route path="/regression" element={<RegressionPage />} />
```

**`src/components/layout/constants.ts`** — Add:
```ts
{ label: 'Regression', icon: TestTube, href: '/regression' },
```
(use `lucide-react` TestTube or FlaskConical icon)

### Task 6: AI Step Generation

The `ai-step-generator.tsx` component sends a prompt to the existing AI chat infrastructure:
```
"Generate browser test steps for verifying the following scenario on {targetUrl}:
{user's natural language description}
Return only valid JSON with this schema: { steps: [{ type, selector?, value?, prompt? }] }"
```
- Parses the AI response as JSON
- Validates against the TestStep schema
- Pre-fills the step builder with generated steps for user review

### Task 7: Navigation & Integration

- Add "Regression" to the top navigation bar (behind `devOnly` flag initially, then remove once stable)
- Route: `/regression`
- Icon: `TestTube` from lucide-react

## Verification

1. **Sidecar standalone test**: `0XBUFFER_AI_ENGINE_MODE=regression 0XBUFFER_REGRESSION_CONFIG_JSON='{...}' node sidecars/index.mjs` should execute steps and emit events
2. **DB migration**: App startup creates `regression_test_cases` and `regression_runs` tables
3. **CRUD flow**: Create a test case via UI, verify it appears in the list, edit it, delete it
4. **Run flow**: Click "Run" on a test case, verify live step-by-step progress appears, verify final pass/fail result
5. **AI verification**: Add an `ai-verify` step with a prompt like "check the page has a login form", verify AI returns structured pass/fail verdict
6. **AI step generation**: Click "Generate with AI", describe a scenario, verify valid steps are generated
7. **Navigation**: Regression page accessible from top nav bar
