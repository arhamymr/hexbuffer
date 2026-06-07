# AI Assistant Feature Plan

## Feature Name

**AI Analyst**

## Product Context

This feature is designed for a desktop security and recon application such as **0xbuffer / AppRecon**. The application already focuses on web application recon, HTTP traffic inspection, proxy workflows, crawler data, findings, notes, and reporting.

The AI assistant should not behave like a generic chatbot. It should work as a context-aware security workflow assistant that can analyze project data, explain traffic, summarize recon results, draft findings, and help generate reports.

---

## Goal

Create an AI assistant inside the desktop app that helps users:

- Analyze captured HTTP requests and responses.
- Understand crawler and recon results.
- Detect interesting endpoints, parameters, headers, cookies, and authentication patterns.
- Suggest safe manual testing steps.
- Create vulnerability finding drafts.
- Improve report writing.
- Generate structured security documentation.

The first version should prioritize **passive analysis and documentation**, not autonomous active testing.

---

## Recommended AI Stack

### Main AI Framework

**Vercel AI SDK**

Use the Vercel AI SDK for:

- Streaming chat responses.
- Tool calling.
- Typed tool parameters with Zod.
- Frontend chat UI integration.
- Controlled agent workflows.

### Recommended Model Providers

Start with one provider, but design the implementation so the provider can be changed later.

Recommended options:

- OpenAI
- Anthropic
- Google Gemini
- Local model support later if needed

### Frontend

- Tauri
- React
- shadcn/ui
- Tailwind CSS
- Vercel AI SDK React package

### Backend / Local API Layer

Depending on your architecture, the AI layer can run through:

- Tauri commands
- Local Node/Bun API
- Hono backend
- Next.js API route
- Dedicated AI backend service

For a desktop app, the safest approach is:

```txt
Frontend UI
    ↓
Local API / Tauri Command
    ↓
AI SDK Agent Layer
    ↓
Internal Tools
    ↓
SQLite / App State / Project Data
```

---

## High-Level Architecture

```txt
Tauri Desktop App
│
├── Frontend: React + shadcn/ui
│   ├── AI Assistant Panel
│   ├── Chat messages
│   ├── Tool call preview
│   ├── Approval UI
│   ├── Finding draft preview
│   └── Report generation UI
│
├── Local App Layer
│   ├── Tauri Commands
│   ├── Local API routes
│   ├── Context builder
│   ├── Tool executor
│   └── Permission checker
│
├── Local Database: SQLite
│   ├── projects
│   ├── traffic_logs
│   ├── endpoints
│   ├── crawler_results
│   ├── findings
│   ├── notes
│   ├── reports
│   ├── ai_sessions
│   ├── ai_messages
│   └── ai_tool_calls
│
└── AI Layer
    ├── Vercel AI SDK
    ├── Model provider
    ├── System prompt
    ├── Tool definitions
    ├── Safety rules
    └── Structured output schemas
```

---

## Core User Experience

The assistant should be available as a side panel inside the main app.

Example layout:

```txt
┌─────────────────────────────────────────────────────────────┐
│ 0xbuffer Project                                             │
├───────────────┬───────────────────────────────┬─────────────┤
│ Traffic List  │ Request / Response Viewer     │ AI Analyst  │
│               │                               │             │
│ GET /api/me   │ Headers                       │ Ask AI...    │
│ POST /login   │ Body                          │             │
│ GET /users/1  │ Preview                       │ Suggestions │
│               │                               │             │
└───────────────┴───────────────────────────────┴─────────────┘
```

The assistant should understand the current workspace context:

- Current project
- Current page
- Selected request
- Selected endpoint
- Selected finding
- Selected report section
- Current scope rules

---

## Assistant Modes

### 1. Recon Assistant

Purpose: Help users understand discovered assets and crawler output.

Capabilities:

- Summarize discovered endpoints.
- Group endpoints by feature.
- Identify login, admin, upload, API, and account-related paths.
- Detect interesting parameters.
- Suggest missing recon steps.
- Highlight unauthenticated or sensitive-looking endpoints.

Example prompts:

```txt
Summarize this crawl result.
Which endpoints look interesting?
Group these endpoints by application feature.
What should I inspect next?
```

---

### 2. Traffic Analyst

Purpose: Help users analyze captured HTTP traffic.

Capabilities:

- Explain selected request and response.
- Detect authentication data.
- Identify cookies, tokens, CORS headers, and authorization headers.
- Compare similar requests.
- Detect possible IDOR/BOLA patterns.
- Find suspicious parameters.
- Summarize response behavior.

Example prompts:

```txt
Explain this request.
Does this response contain sensitive data?
Find similar requests.
What parameters should I review manually?
```

---

### 3. Finding Writer

Purpose: Convert evidence into structured vulnerability findings.

Capabilities:

- Generate finding title.
- Write description.
- Write impact.
- Write reproduction steps.
- Suggest remediation.
- Normalize severity.
- Convert raw evidence into professional report text.

Example prompts:

```txt
Create a finding draft from this request.
Improve this vulnerability description.
Write reproduction steps.
Generate remediation for this issue.
```

---

### 4. Report Assistant

Purpose: Help generate final security report sections.

Capabilities:

- Executive summary.
- Scope summary.
- Methodology.
- Findings summary.
- Risk overview.
- Appendix content.
- Report polishing.

Example prompts:

```txt
Generate an executive summary.
Write a methodology section.
Summarize all high severity findings.
Improve this report section.
```

---

### 5. Workflow Planner

Purpose: Guide the user through security testing phases.

Capabilities:

- Suggest next testing steps.
- Create a checklist from project data.
- Prioritize endpoints by risk.
- Identify missing evidence.
- Recommend manual validation steps.

Example prompts:

```txt
What should I test next?
Create a checklist for this target.
What evidence is missing from this finding?
Prioritize these endpoints.
```

---

## Core AI Workflow

```txt
User sends message
    ↓
Frontend attaches current context metadata
    ↓
AI backend builds compact context
    ↓
Model decides next action
    ↓
Possible outcomes:
    ├── Answer directly
    ├── Call passive tool
    ├── Ask for approval
    ├── Create draft content
    └── Save result to local app
    ↓
Tool result returns to model
    ↓
Assistant streams final answer
    ↓
Optional action:
    ├── Save note
    ├── Create finding
    ├── Update report
    └── Tag request
```

---

## Context Strategy

Do not send the full project database to the model.

Only send compact, relevant context based on what the user is currently viewing.

### Assistant Context Shape

```ts
type AssistantContext = {
  projectId: string;
  selectedRequestId?: string;
  selectedEndpointId?: string;
  selectedFindingId?: string;
  selectedReportSectionId?: string;
  currentPage: "proxy" | "repeater" | "crawler" | "findings" | "report" | "dashboard";
  scope: {
    targetHosts: string[];
    allowedTesting: boolean;
    allowReplay: boolean;
    allowCrawler: boolean;
  };
};
```

### Compact Request Shape

```ts
type CompactRequest = {
  id: string;
  method: string;
  url: string;
  status: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBodyPreview?: string;
  responseBodyPreview?: string;
  bodyTruncated: boolean;
};
```

### Context Rules

- Send only the selected request when possible.
- Send summaries instead of full bodies.
- Truncate large request and response bodies.
- Avoid sending binary data.
- Mask secrets by default.
- Keep original evidence stored locally.
- Let the user choose when to include sensitive values.

---

## Tool Categories

### Passive Tools

These tools are safe by default because they only read local data.

```txt
get_project_summary
get_selected_request
search_traffic
list_endpoints
get_endpoint_detail
get_crawl_summary
list_findings
get_finding_detail
summarize_response_body
detect_auth_patterns
detect_interesting_parameters
compare_requests
compare_responses
```

---

### Write Tools

These tools modify local project data. They should show a preview before saving.

```txt
create_note
create_finding_draft
update_finding_draft
add_report_section
tag_request
mark_endpoint_interesting
update_report_section
```

Recommended behavior:

- The AI creates a draft.
- The user reviews the draft.
- The user clicks save.
- The app stores the result locally.

---

### Active Testing Tools

These tools send traffic to the target. They should require approval.

```txt
send_replay_request
run_crawler
run_passive_scan
run_header_check
run_cors_check
run_auth_flow_check
```

Recommended behavior:

```txt
AI proposes action
    ↓
App shows request preview
    ↓
User approves
    ↓
Tool runs
    ↓
Result is saved
    ↓
AI analyzes result
```

---

### Restricted Tools

Avoid or heavily restrict features that can easily become abusive.

```txt
login brute force
credential stuffing
password spraying
destructive fuzzing
exploit chaining against public targets
reverse shell generation
malware generation
persistence helpers
stealth/evasion helpers
```

The app should focus on professional, authorized security testing workflows.

---

## Approval Flow

Any tool that sends network traffic must require explicit user approval.

Example UI:

```txt
AI wants to run a safe replay test:

Target:
POST https://example.com/api/profile

Planned variations:
1. Remove Authorization header
2. Change user_id from 1001 to 1002
3. Change role from user to admin
4. Send invalid content type

[Approve] [Reject] [Edit Plan]
```

Approval record should be stored locally.

### Approval Table

```sql
CREATE TABLE ai_tool_approvals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  tool_call_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  request_preview TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```

---

## Database Schema

### AI Sessions

```sql
CREATE TABLE ai_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### AI Messages

```sql
CREATE TABLE ai_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
```

### AI Tool Calls

```sql
CREATE TABLE ai_tool_calls (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT,
  status TEXT NOT NULL,
  requires_approval INTEGER DEFAULT 0,
  approved INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

### AI Context Snapshots

```sql
CREATE TABLE ai_context_snapshots (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  context_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

---

## Vercel AI SDK Backend Example

```ts
import { streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  const result = streamText({
    model: openai("gpt-4.1-mini"),
    system: `
You are the AI Analyst inside 0xbuffer.

You help with authorized web application security testing, recon analysis,
traffic analysis, finding writing, and reporting.

Rules:
- Only work inside the declared project scope.
- Prefer passive analysis.
- Ask for user approval before any action that sends traffic.
- Do not assist with credential theft, destructive activity, malware, persistence, or unauthorized attacks.
- Be evidence-based. If evidence is insufficient, explain what is missing.
- When writing findings, include title, severity, description, impact, evidence, reproduction steps, and remediation.
`,
    messages,
    tools: {
      getSelectedRequest: tool({
        description: "Get the currently selected HTTP request and response.",
        parameters: z.object({
          requestId: z.string(),
        }),
        execute: async ({ requestId }) => {
          return await getRequestDetail(requestId);
        },
      }),

      searchTraffic: tool({
        description: "Search captured HTTP traffic by host, path, method, status, or keyword.",
        parameters: z.object({
          projectId: z.string(),
          query: z.string(),
          limit: z.number().default(20),
        }),
        execute: async ({ projectId, query, limit }) => {
          return await searchTraffic(projectId, query, limit);
        },
      }),

      createFindingDraft: tool({
        description: "Create a draft security finding from evidence.",
        parameters: z.object({
          projectId: z.string(),
          title: z.string(),
          severity: z.enum(["info", "low", "medium", "high", "critical"]),
          evidenceRequestIds: z.array(z.string()),
          description: z.string(),
          impact: z.string(),
          remediation: z.string(),
        }),
        execute: async (input) => {
          return await createFindingDraft(input);
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

---

## Frontend Chat Panel Example

```tsx
import { useChat } from "@ai-sdk/react";

export function AssistantPanel({ projectId, selectedRequestId }) {
  const { messages, sendMessage, status } = useChat({
    transport: {
      api: "/api/ai/chat",
    },
  });

  return (
    <div className="flex h-full flex-col border-l">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">AI Analyst</h2>
        <p className="text-xs text-muted-foreground">
          Analyze traffic, recon data, findings, and reports.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className="mb-4">
            <div className="text-xs text-muted-foreground">
              {message.role}
            </div>
            <div>{message.parts?.map(renderMessagePart)}</div>
          </div>
        ))}
      </div>

      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();

          const form = event.currentTarget;
          const input = new FormData(form).get("message") as string;

          sendMessage({
            text: input,
            metadata: {
              projectId,
              selectedRequestId,
              currentPage: "proxy",
            },
          });

          form.reset();
        }}
      >
        <input
          name="message"
          className="w-full rounded-md border px-3 py-2"
          placeholder="Ask AI to analyze this request..."
        />
      </form>
    </div>
  );
}
```

---

## Page-Level AI Actions

### Proxy Page

Suggested quick actions:

```txt
Analyze this request
Explain this response
Find similar requests
Detect auth/session data
Suggest manual tests
Create finding draft
```

Workflow:

```txt
User selects request
    ↓
AI receives selectedRequestId
    ↓
getSelectedRequest tool runs
    ↓
AI explains behavior and risk indicators
    ↓
User chooses save, test, or ignore
```

---

### Crawler Page

Suggested quick actions:

```txt
Summarize crawl tree
Group endpoints by feature
Identify admin or auth pages
Find interesting parameters
Suggest recon gaps
```

Workflow:

```txt
Crawler result exists
    ↓
AI calls getCrawlSummary
    ↓
AI groups and ranks endpoints
    ↓
User selects endpoint for review
```

---

### Repeater Page

Suggested quick actions:

```txt
Explain this request
Generate safe test variants
Compare responses
Create reproduction steps
```

Workflow:

```txt
Base request selected
    ↓
AI proposes variants
    ↓
User approves selected variants
    ↓
App sends replay request
    ↓
AI compares responses
```

---

### Findings Page

Suggested quick actions:

```txt
Improve finding wording
Generate impact
Generate remediation
Write reproduction steps
Normalize severity
```

---

### Report Page

Suggested quick actions:

```txt
Generate executive summary
Generate methodology
Summarize findings
Generate appendix
Polish report section
```

---

## System Prompt

```txt
You are the AI Analyst inside 0xbuffer, a desktop application for web application recon, traffic analysis, security testing, and reporting.

Your job:
- Help users understand captured HTTP traffic.
- Summarize recon and crawler results.
- Identify suspicious patterns.
- Suggest safe manual testing steps.
- Create clear finding drafts.
- Help generate professional security reports.

Rules:
- Only work within the declared project scope.
- Prefer passive analysis over active testing.
- Ask for user approval before using any tool that sends network traffic.
- Do not assist with credential theft, destructive activity, persistence, malware, or unauthorized attacks.
- Be evidence-based. If the data is insufficient, say what evidence is missing.
- When writing findings, include title, severity, description, impact, evidence, reproduction steps, and remediation.
```

---

## Safety Boundaries

The assistant must follow these boundaries:

```txt
- Work only inside the user's declared project scope.
- Prefer passive analysis.
- Ask approval before sending traffic.
- Do not automate login brute force against real targets.
- Do not assist credential theft.
- Do not generate malware, persistence, or destructive payloads.
- Do not provide stealth or evasion guidance.
- Do not run active checks without user confirmation.
- Provide professional and evidence-based security guidance.
```

Project-level scope policy:

```ts
type ProjectScopePolicy = {
  targetHosts: string[];
  allowActiveTesting: boolean;
  allowReplay: boolean;
  allowCrawler: boolean;
  maxRequestsPerMinute: number;
};
```

---

## MVP Scope

The first version should include:

```txt
1. AI Assistant side panel
2. Chat history per project
3. Analyze selected request
4. Search traffic through tool calling
5. Summarize crawl result
6. Create finding draft
7. Improve finding wording
8. Generate report section
9. Save AI messages locally
10. Basic safety guardrails
```

Avoid active automated testing in MVP.

---

## Phase 2 Scope

```txt
1. Tool approval UI
2. AI-generated test plan
3. Safe replay variants
4. Response comparison
5. Passive vulnerability hints
6. Endpoint risk scoring
7. Report export support
8. Local embedding search for project memory
```

---

## Phase 3 Scope

```txt
1. Multi-agent workflow
2. Dedicated Recon Agent
3. Dedicated Traffic Analysis Agent
4. Dedicated Finding Writer Agent
5. Dedicated Report Agent
6. Approval-based active test runner
7. Workspace-level memory
8. AI-generated testing checklist
```

---

## Implementation Order

```txt
Step 1: Create ai_sessions and ai_messages tables
Step 2: Build AssistantPanel UI
Step 3: Add /api/ai/chat route using Vercel AI SDK streamText
Step 4: Add getSelectedRequest tool
Step 5: Add searchTraffic tool
Step 6: Add createFindingDraft tool
Step 7: Add context builder
Step 8: Add tool call rendering in UI
Step 9: Add write-action preview before save
Step 10: Add approval flow for active tools later
```

---

## Recommended Internal Tool List

### MVP Tools

```ts
const assistantTools = {
  getProjectSummary,
  getSelectedRequest,
  searchTraffic,
  listEndpoints,
  getEndpointDetail,
  getCrawlSummary,
  listFindings,
  createFindingDraft,
  updateFindingDraft,
  createNote,
  generateReportSection,
  compareRequests,
  compareResponses,
};
```

### Future Active Tools

```ts
const activeTestingTools = {
  sendReplayRequest,
  runPassiveScanner,
  runCrawler,
  runHeaderCheck,
  runCorsCheck,
};
```

---

## Finding Draft Output Schema

```ts
type FindingDraft = {
  title: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  confidence: "low" | "medium" | "high";
  description: string;
  impact: string;
  evidence: Array<{
    requestId: string;
    summary: string;
  }>;
  reproductionSteps: string[];
  remediation: string;
  references?: string[];
};
```

---

## Report Section Output Schema

```ts
type ReportSection = {
  title: string;
  content: string;
  sectionType:
    | "executive_summary"
    | "scope"
    | "methodology"
    | "findings_summary"
    | "finding_detail"
    | "appendix";
};
```

---

## Suggested Feature Name

Recommended name:

```txt
AI Analyst
```

Alternative names:

```txt
Recon Copilot
Security Analyst
Investigator
Insight Engine
Finding Assistant
```

Best choice for professional positioning:

```txt
AI Analyst
```

---

## Final Recommendation

Build the assistant as a **context-aware AI Analyst** first.

The best first version is:

```txt
AI Assistant Panel
+ Selected request analysis
+ Traffic search
+ Finding draft generation
+ Report writing
+ Crawl summary
+ Safe next-step recommendations
```

After the MVP is stable, add approval-based active workflows:

```txt
AI proposes test plan
    ↓
User approves
    ↓
App runs safe replay/check
    ↓
AI compares result
    ↓
User saves finding
```

This approach keeps the feature powerful, professional, safer, and easier to sell.
