# AppRecon Product Requirements Document

## 1. Overview

AppRecon, branded in the UI as 0xbuffer, is a desktop web security testing application for capturing, inspecting, modifying, replaying, and analyzing HTTP and HTTPS traffic. The product combines a local MITM proxy, traffic history, request interception, repeater workflows, brute-force testing, browser automation, documentation capture, AI-assisted analysis, and utility tools for common offensive security tasks.

The application is built as a Tauri desktop app with a React and TypeScript frontend, a Rust backend, and a local SQLite data store.

## 2. Problem Statement

Security testers often need to move between several tools to inspect traffic, modify requests, replay interesting calls, generate payloads, document API behavior, and test specific vulnerability classes. This creates context switching, repeated setup, fragmented evidence, and higher risk of losing important request or response details.

AppRecon should provide a focused desktop workspace where a tester can capture live traffic, understand what happened, turn interesting traffic into actionable tests, and preserve findings in a structured way.

## 3. Goals

- Capture HTTP and HTTPS traffic through a local proxy.
- Provide a searchable and filterable live traffic history.
- Allow users to pause, inspect, modify, forward, or drop intercepted requests.
- Let users replay and edit captured requests in Repeater.
- Support brute-force and payload-driven request testing.
- Provide practical security utilities, including encoding, hashing, scanning, SQL injection helpers, and GraphQL helpers.
- Help users generate and maintain API documentation from captured traffic.
- Support AI-assisted analysis for selected traffic, assets, and prompt-injection testing.
- Keep sensitive traffic, certificates, logs, and local databases under user control.

## 4. Non-Goals

- AppRecon is not a cloud-hosted collaborative scanning platform.
- AppRecon is not intended to perform unauthorized testing or autonomous exploitation.
- AppRecon is not a replacement for full vulnerability management systems.
- The first release does not require multi-user role management or hosted synchronization.

## 5. Target Users

- Web application security testers who need an interception proxy and replay workflow.
- Bug bounty hunters who need lightweight traffic analysis and request tooling.
- Developers validating API behavior during local or staging testing.
- Security engineers documenting API surfaces and suspicious behavior.
- AI application testers checking prompt-injection and model-facing API flows.

## 6. Key User Stories

- As a tester, I want to configure my browser to proxy traffic through AppRecon so I can inspect HTTP and HTTPS requests.
- As a tester, I want to trust a generated CA certificate so HTTPS traffic can be decrypted locally.
- As a tester, I want to filter traffic by method, URL, status, body size, host, and time so I can find relevant requests quickly.
- As a tester, I want to intercept matching requests so I can modify or drop them before they reach the upstream server.
- As a tester, I want to send a captured request to Repeater so I can edit and replay it repeatedly.
- As a tester, I want to send a captured request to Brute Force so I can test payload positions with multiple attack modes.
- As a tester, I want GraphQL tooling so I can format operations, validate variables, generate POST bodies, and copy introspection snippets.
- As a tester, I want AI-assisted analysis so I can summarize risks and generate testing ideas from captured assets.
- As a tester, I want to document discovered API endpoints so I can preserve evidence and produce useful output.

## 7. Product Areas And Requirements

### 7.1 Live Traffic

Requirements:
- The system must display captured HTTP traffic in a tabular, scannable interface.
- Users must be able to filter traffic by request metadata and body content.
- Users must be able to inspect request headers, cookies, query parameters, request body, response headers, and response body.
- The interface should support quick actions from traffic rows, including opening a request in Repeater, Brute Force, Prompt Injection, and Documents where available.
- The traffic view should distinguish HTTP requests from WebSocket connections where data is available.

Acceptance criteria:
- A captured request appears in Live Traffic with method, URL, status, request size, and response size.
- Selecting a request shows request and response details.
- Context-menu actions preserve method, URL, headers, and body when moving traffic into another workflow.

### 7.2 Intercept

Requirements:
- Users must be able to enable or disable interception.
- The system must list paused requests that match interception rules.
- Users must be able to edit a paused request before forwarding it.
- Users must be able to drop a paused request.
- Users must receive clear feedback when forwarding or dropping fails.

Acceptance criteria:
- With interception enabled, matching requests pause before upstream delivery.
- Forwarding sends the edited request.
- Dropping prevents the request from continuing.

### 7.3 Repeater

Requirements:
- Users must be able to edit raw HTTP requests.
- Users must be able to send requests and inspect responses.
- Repeater must support multiple request tabs.
- Captured requests opened from Live Traffic must populate Repeater with method, URL, headers, body, and a useful tab name.

Acceptance criteria:
- Sending a valid raw request returns status, headers, and body.
- Invalid requests show a human-readable error.
- Users can rename and close Repeater tabs.

### 7.4 Brute Force

Requirements:
- Users must be able to define payload positions in URL, headers, and body.
- Supported attack modes must include Sniper, Battering Ram, Pitchfork, and Cluster Bomb.
- Payload sources must include simple lists, runtime files, and number ranges.
- Payload processing must support URL encode/decode, Base64 encode/decode, and common hashes.
- Results must show status, response length, timing, errors, match indicators, and extracted values where configured.
- Results should be exportable as JSON or CSV.

Acceptance criteria:
- A request with marked positions can be executed with at least one payload source.
- The run can be stopped or completed without freezing the UI.
- Results can be inspected individually.

### 7.5 Browser Automation

Requirements:
- Users should be able to automate browser actions from instructions.
- The system should show browser action logs, discoveries, and accessibility context where available.
- Browser automation findings should be usable for API discovery and documentation workflows.

Acceptance criteria:
- A user can enter an instruction and see a timeline of attempted browser actions.
- Discovered API or page information is visible in the automation page.

### 7.6 Documents

Requirements:
- Users must be able to create and edit documentation for discovered APIs.
- Users must be able to organize API entries into folders or sections.
- Users should be able to export documentation.
- Captured traffic sent to Documents must preserve source history, method, URL, host, path, headers, request body, response status, content type, and capture time.

Acceptance criteria:
- A captured API call can create or update a document entry.
- Documentation edits persist locally.
- Exported output includes the selected document content.

### 7.7 Tools

Requirements:
- Encoder / Decoder must support URL, Base64, and Hex conversion.
- Hash tools must support common digest algorithms.
- Subdomain tools should support wordlist-based discovery.
- Port Scanner must support basic TCP scanning and banner grabbing.
- Fuzz Scanner must support URL/path fuzzing with configurable concurrency and timeout.
- SQL Injection tools should help prepare or test SQLi payloads.
- Utility tools must include UUID generation, JWT decoding, Hex formatting, JSON formatting/minifying, random string generation, and DNS lookup.
- GraphQL tools must support operation editing, formatting, minifying, operation detection, JSON variables validation, POST body generation, and introspection snippets.

Acceptance criteria:
- Each tool works locally without requiring cloud services unless explicitly configured.
- Copy buttons copy generated output to the clipboard.
- Invalid input produces clear validation feedback.

### 7.8 AI Tools And Assistant

Requirements:
- The AI assistant must support configured OpenAI provider settings.
- Users should be able to analyze selected targets or captured information.
- Prompt Injection tools must allow users to define a request template, mark injection targets, run payloads, and review responses.
- AI features must fail gracefully when provider settings are missing or invalid.

Acceptance criteria:
- Missing API configuration produces actionable setup guidance.
- Prompt Injection runs show payload, request URL, response body or error, response length, and findings.

### 7.9 Settings And Certificates

Requirements:
- The system must expose CA certificate guidance for common browsers and platforms.
- Users must understand how HTTPS interception works.
- Users must be warned about security implications of installing a local CA.
- Users must have access to troubleshooting and certificate removal guidance.
- AI provider and model settings must be configurable.

Acceptance criteria:
- Settings includes platform-specific certificate installation steps.
- Settings includes instructions for removing the CA.
- AI settings can be saved and reused.

## 8. Data And Security Requirements

- Certificate material must be generated and stored locally.
- Proxy logs, HAR captures, SQLite databases, and traffic bodies must be treated as sensitive.
- The application must avoid sending captured traffic to external services unless the user explicitly invokes a feature that requires it.
- AI features must make it clear when data may be sent to a configured provider.
- Runtime artifacts under local data folders must not be committed to source control.
- Error messages should avoid leaking secrets unnecessarily.

## 9. Non-Functional Requirements

Performance:
- The traffic table should remain responsive while handling large request histories.
- Long-running scans and brute-force jobs must not block the UI thread.
- Proxy operations should add minimal latency for normal browsing.

Reliability:
- Failed proxy, scanner, AI, and request replay operations must return actionable errors.
- The app should recover gracefully when the proxy is stopped or a target is unavailable.

Usability:
- Primary workflows should be reachable from top navigation.
- Request movement between Live Traffic, Repeater, Brute Force, AI Tools, and Documents should preserve context.
- Editors should use monospaced formatting and support large request and response bodies.

Compatibility:
- The desktop app must run through Tauri.
- Frontend development must run through Vite on port 1420.
- Certificate guidance should cover Chrome, Edge, Firefox, Safari, iOS, and Android.

Maintainability:
- Frontend pages should follow the page entry, page hook, presentational component pattern.
- Shared tabbed layouts should reuse existing tab primitives.
- Backend Rust code should follow `rustfmt` conventions and keep proxy, database, scanner, and AI modules separate.

## 10. Milestones

### Milestone 1: Core Proxy Workflow
- Start and stop local proxy.
- Generate and guide CA certificate installation.
- Capture HTTP and HTTPS traffic.
- Display Live Traffic and request detail.

### Milestone 2: Manual Testing Workflow
- Intercept requests.
- Forward, edit, and drop paused requests.
- Send captured traffic to Repeater.
- Support Repeater tab management and response inspection.

### Milestone 3: Attack And Utility Workflow
- Add Brute Force request execution.
- Add payload processing and result export.
- Add utility tools, scanners, SQLi helpers, and GraphQL helpers.

### Milestone 4: Evidence And Analysis Workflow
- Add Documents workspace.
- Add browser automation discovery.
- Add AI assistant and prompt-injection testing.
- Improve cross-feature handoff from captured traffic.

### Milestone 5: Hardening And Release
- Improve large-history performance.
- Add focused frontend and backend tests.
- Improve error handling and onboarding.
- Package the Tauri desktop app for target platforms.

## 11. Success Metrics

- Time from first launch to successful HTTPS capture.
- Number of captured requests successfully opened in Repeater or Brute Force.
- Percentage of traffic actions completed without error.
- Time to locate a target request in Live Traffic using filters.
- Number of API documentation entries created from captured traffic.
- User-reported reduction in switching between external tools.

## 12. Risks

- HTTPS interception setup can be confusing or unsafe if certificate guidance is unclear.
- Large traffic histories can degrade frontend responsiveness.
- Brute-force and scanner features can be misused without clear user responsibility.
- AI features may expose sensitive traffic if users send data to external providers without understanding it.
- Cross-platform certificate trust behavior varies significantly.

## 13. Open Questions

- Which platforms are required for the first packaged release: macOS only, or macOS, Windows, and Linux?
- Should project/session storage support multiple named workspaces?
- Should AI analysis require per-request confirmation before sending captured data to a provider?
- Should GraphQL tooling eventually execute requests directly, or remain a local request-body preparation helper that pairs with Repeater?
- What is the expected maximum traffic history size for a single session?
- Which export formats are required beyond HAR, CSV, SQLite, JSON, and document export?
