# RAG (Retrieval-Augmented Generation) Feature Plan

## Current Context Flow

Chat context is a naive JSON blob dump — the 5 most recent crawl sessions with all pages, insights, and logs. The crawl analysis agent sees only one page at a time. No cross-session memory, no semantic relevance filtering.

## Data Available to Index

All persistent data lives in SQLite at `~/Library/Application Support/com.0xbuffer.app/0xbuffer.db`:

| Table                 | Text fields to embed                            |
|-----------------------|-------------------------------------------------|
| ai_browser_pages      | url, title, ai_summary                          |
| ai_browser_insights   | title, description, severity, type              |
| ai_browser_logs       | message, type, level                            |
| ai_chat_messages      | content (user + assistant, keyed by sessionId)  |
| http_logs             | url, request/response headers                   |
| documents             | sections (JSON with markdown content)           |

Ephemeral context: chat sidecar reads from `/tmp/0xbuffer/ai-chat-context.json` (built fresh per chat session, deleted after).

## Recommended Stack (Desktop-First, Zero Cloud)

- **Embedding**: `@xenova/transformers` — runs `all-MiniLM-L6-v2` (384-dim) locally in Node.js. No API keys, no GPU required.
- **Vector store**: `@lancedb/lancedb` — embedded, zero-config, persists to disk as `0xbuffer-vectors.lance` alongside the SQLite DB.

## Ingestion Triggers

| Trigger                         | What to index                                |
|---------------------------------|----------------------------------------------|
| Page visited (crawl)            | url + title + ai_summary chunk               |
| Insight created                 | title + description chunk                    |
| Chat message sent/received      | content chunk (sessionId-scoped)             |
| Document section saved          | section markdown content                     |

Ingestion should happen either in the Rust backend (near `ai_browser.rs` repository) or in the sidecar process after crawl completion.

## Adapter Integration

The existing adapter pattern in `sidecars/lib/ai/adapter.mjs` is the insertion point:

```js
// lib/ai/rag.mjs (new)
export async function retrieveContext(query) {
  const embedding = await embed(query);
  const results = await vectorStore.search(embedding, { limit: 10 });
  return formatResults(results);
}

// lib/ai/adapter.mjs — context injection
export function createToolContext(overrides = {}) {
  return {
    emitAction: ...,
    redactedContext: null,
    retrieveContext,  // agents can call ctx.retrieveContext(query)
    ...overrides,
  };
}
```

`getCrawlContextDef` (existing chat tool) becomes RAG-aware — accepts a natural language query for cross-session semantic search.

## Architecture

```
SQLite (Rust) → ingestion pipeline embeds new data → 0xbuffer-vectors.lance
                                                          ↑
User asks "what XSS patterns did we find?"                │
     ↓                                                    │
adapter.retrieveContext(query) → vector search ───────────┘
     ↓
Agent runs with top-K semantically relevant context (not a full dump)
```

## Migration Path

Additive, no breaking changes:

1. Add `@xenova/transformers` + `@lancedb/lancedb` to sidecar `package.json`
2. Create `lib/ai/rag.mjs` with embed + search + index functions
3. Add `retrieveContext` to `createToolContext` in adapter
4. Update `getCrawlContextDef` to optionally accept a natural language query
5. Add ingestion hooks to crawl pipeline
6. Optionally: add a `searchContext` tool to the chat agent

Existing blob-based context (`redactedContext`) remains as fallback — RAG augments, not replaces.
