import { readFile } from 'node:fs/promises';

import { createAgent, createToolContext } from '../ai/adapter.mjs';
import { startWorkflow } from '../ai/workflow.mjs';
import { emit } from '../events.mjs';
import { withRetry } from '../retry.mjs';
import { runRedactionWorkflow } from '../privacy/redaction.mjs';
import {
  listCrawlSessionsDef,
  getCrawlContextDef,
  getProxySummaryDef,
  getRecentInsightsDef,
  addScopeDef,
  deleteScopeDef,
  deleteAllScopesDef,
  writeDocumentSectionDef,
  extractFromUrlDef,
  analyzeTargetUrlDef,
  listProxyHostsDef,
  getProxyRequestDef,
  sendToInvokerDef,
  sendToRepeaterDef,
  startProxyDef,
  triggerScanDef,
  pauseScanDef,
  resumeScanDef,
  stopScanDef,
  submitCrawlCredentialsDef,
  navigateToDef,
  requestHumanSelectionDef,
  createWorkspaceDef,
  createCollectionDef,
  createFolderDef,
  createEndpointDef,
  selectEndpointDef,
  listWorkspacesDef,
  listCollectionsDef,
} from './tools/index.mjs';
import { classifyIntent, TASK_CATEGORIES } from './intent-classifier.mjs';

const CHAT_AGENT_ID = 'hexbuffer-chat-agent';

const CHAT_INSTRUCTIONS = [
  'You are the AI Analyst inside hexbuffer, a desktop application for web application recon, traffic analysis, security testing, and reporting.',
  'Help users understand captured HTTP traffic, summarize recon and crawler results, identify suspicious patterns, and suggest safe testing steps.',
  'When users ask about targets, add them to scope using the addScope tool so the app tracks them. Use the hosts array to add multiple hosts at once. Use the targetId parameter (target display name) to add new hosts to an existing target instead of creating a new one.',
  'When users want findings or notes saved, write them to documents using the writeDocumentSection tool.',
  'When users ask about a specific URL, extract its content using the extractFromUrl tool.',
  'Recon workflow: use analyzeTargetUrl to gather hosts, links, forms, and content from a target URL. When multiple hosts are discovered (2+), use requestHumanSelection to let the user pick which ones to add, then call addScope with the hosts array to add all selected hosts at once. For single hosts, add them directly with addScope using the host field. Save findings/notes with writeDocumentSection.',
  'Traffic analysis workflow: use listProxyHosts to see what hosts are communicating, getProxyRequest to inspect specific requests, then sendToInvoker or sendToRepeater for deeper testing.',
  'Invoker workflow: use sendToInvoker with a proxy log ID to configure and launch an intruder attack. Provide rawRequest with § markers to control what gets fuzzed, and payloadValues with common test values.',
  'Scan workflow: use startProxy to ensure the proxy is running, then use triggerScan to start a browser crawl on a target URL for deep page discovery and analysis. When the user asks to scan a website, always start the proxy first if it may not be running, then trigger the scan. By default scans run headless (invisible); use the live parameter only when the user explicitly asks to see the browser window. You can pause a running scan with pauseScan, resume a paused scan with resumeScan, and stop a scan entirely with stopScan.',
  'Crawl credential workflow: when the crawler pauses at a login form and the user provides credentials, use submitCrawlCredentials to resume the crawl with the provided fields.',
  'Crawl callback workflow: when a crawl completes the system will automatically send you a message with crawl results (session ID, target URL, pages visited, insights found). When you receive this, use getCrawlContext to fetch the full results. If the crawl discovered 2+ distinct hosts or targets, use requestHumanSelection to let the user pick which ones to add to scope, then call addScope with the hosts array to add them all at once. Otherwise give a one-sentence overview and call out only the single most critical finding.',
  'Selection rule: whenever you are about to list 2+ choices or options for the user to pick from (hosts, targets, actions, etc.), use requestHumanSelection instead of plain text. This shows an interactive picker in the UI. Only list options in plain text if the user explicitly asks for a list.',
  'Repeater workflow: when users ask to create workspaces, collections, folders, or add API requests to the Repeater tool (such as parsing a raw HTTP request input), use createWorkspace, createCollection, createFolder, and createEndpoint tools to build out the structure. You can call listWorkspaces and listCollections to inspect existing resources. If the user does not specify a target workspace and collection to save an API request to, use requestHumanSelection to ask them to select one of the existing collections or choose to create a new one (e.g. by providing options for each collection, and options like "Create new collection in workspace <Name>"). If they want to create a new collection, call createCollection first, then createEndpoint. When parsing a raw HTTP request, construct the full URL (e.g. using the Host header and path, defaulting to https:// if not specified) and map all HTTP headers and body properly. After creating an endpoint, use selectEndpoint to focus the request. CRITICAL: When creating a workspace, collection, and endpoints together in a single turn, you must generate and pass client-side unique IDs (e.g. "ws-X", "stash-Y", "ep-Z") in the "id" field of these tools to link them correctly. For example, pass the same generated workspace ID to createWorkspace(..., id) and createCollection(workspaceId, ...), and the same collection ID to createCollection(..., id) and createEndpoint(collectionId, ...). This ensures the newly created collections/endpoints are correctly linked to the workspace immediately.',
  'After configuring something, use navigateTo to show the user the result in the relevant page.',
  'Only work within declared project scope. Prefer passive analysis over active testing.',
  'Be evidence-based. If data is insufficient, explain what is missing.',
  'Be strictly concise: give the answer in 1-3 short sentences. No fluff, no bullet lists unless asked. Skip step-by-step narration of what you did — just state the result.',
  'When reporting findings (scans, extraction, analysis), lead with the key result. Drop filler phrases like "I found that" or "Based on my analysis".',
  'Use tools proactively. Do not describe what tool you will use — just use it and report the outcome.',
].join('\n');

const MAX_TOOL_STEPS = 12;

function toChatMessages(messages) {
  return messages
    .filter((message) => ['user', 'assistant', 'system'].includes(message.role) && message.content?.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

/**
 * Read context from a temp file whose path is passed via env var.
 * Avoids stdin pipe issues (broken pipe when the sidecar crashes early).
 */
async function readContextFile() {
  const path = process.env['HEXBUFFER_AI_CHAT_CONTEXT_FILE'];
  if (!path) return {};
  const raw = await readFile(path, 'utf-8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export async function runChat() {
  const request = JSON.parse(process.env['HEXBUFFER_AI_CHAT_REQUEST_JSON'] || '{"messages":[]}');
  const context = await readContextFile();
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['HEXBUFFER_AI_MODEL'] || 'deepseek-chat';

  const messages = toChatMessages(request.messages || []);
  if (messages.length === 0) {
    emit({
      type: 'chat_failed',
      provider,
      model,
      message: '[task-specification] No valid user messages found in chat request',
      layer: 'task-specification',
      fix: 'Ensure HEXBUFFER_AI_CHAT_REQUEST_JSON contains at least one user or system message',
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
    return;
  }

  emit({ type: 'chat_started', provider, model, createdAt: new Date().toISOString() });

  const redactedRequest = runRedactionWorkflow(request).redactedValue;
  const redactedContext = runRedactionWorkflow(context).redactedValue;

  const toolContext = createToolContext({
    redactedContext: {
      ...redactedContext,
      workspaces: redactedRequest.workspaces || [],
      activeWorkspaceId: redactedRequest.activeWorkspaceId || null,
    },
  });

  // ── Intent classification ───────────────────────────────────────────
  const classification = await classifyIntent(messages);

  if (classification.intent === 'ambiguous') {
    const categories = (classification.suggestedCategories || TASK_CATEGORIES.map((c) => c.id))
      .map((id) => TASK_CATEGORIES.find((c) => c.id === id))
      .filter(Boolean);

    emit({
      type: 'chat_action',
      action: 'request_intent_clarification',
      payload: {
        question: classification.clarificationQuestion || 'I need a bit more context — what would you like me to help with?',
        categories,
        originalMessage: messages[messages.length - 1]?.content || '',
      },
      createdAt: new Date().toISOString(),
    });

    const clarMsg = 'I need a bit more context — what would you like me to help with? Select a task below and I\'ll get started.';
    emit({
      type: 'chat_finished',
      provider,
      model,
      content: clarMsg,
      createdAt: new Date().toISOString(),
    });

    emit({
      type: 'workflow_finished',
      workflowId: `wf-chat-${Date.now()}`,
      durationMs: 0,
      finishedAt: new Date().toISOString(),
    });
    return;
  }

  const createChatAgent = () => createAgent({
    id: CHAT_AGENT_ID,
    instructions: CHAT_INSTRUCTIONS,
    tools: {
      listCrawlSessions: listCrawlSessionsDef,
      getCrawlContext: getCrawlContextDef,
      getProxySummary: getProxySummaryDef,
      getRecentInsights: getRecentInsightsDef,
      listProxyHosts: listProxyHostsDef,
      getProxyRequest: getProxyRequestDef,
      addScope: addScopeDef,
      deleteScope: deleteScopeDef,
      deleteAllScopes: deleteAllScopesDef,
      writeDocumentSection: writeDocumentSectionDef,
      extractFromUrl: extractFromUrlDef,
      analyzeTargetUrl: analyzeTargetUrlDef,
      sendToInvoker: sendToInvokerDef,
      sendToRepeater: sendToRepeaterDef,
      startProxy: startProxyDef,
      triggerScan: triggerScanDef,
      pauseScan: pauseScanDef,
      resumeScan: resumeScanDef,
      stopScan: stopScanDef,
      submitCrawlCredentials: submitCrawlCredentialsDef,
      navigateTo: navigateToDef,
      requestHumanSelection: requestHumanSelectionDef,
      createWorkspace: createWorkspaceDef,
      createCollection: createCollectionDef,
      createFolder: createFolderDef,
      createEndpoint: createEndpointDef,
      selectEndpoint: selectEndpointDef,
      listWorkspaces: listWorkspacesDef,
      listCollections: listCollectionsDef,
    },
    ctx: toolContext,
    maxSteps: MAX_TOOL_STEPS,
  });

  const wf = startWorkflow({ name: 'chat', extra: { provider, model } });

  try {
    const content = await wf.step('agent_stream', async () => {
      return await withRetry(async () => {
        const agent = createChatAgent();
        const result = await agent.stream({
          messages,
        });
        let content = '';
        for await (const delta of result.textStream) {
          content += delta;
          emit({ type: 'chat_delta', delta });
        }
        return content;
      }, { maxAttempts: 3, name: 'runChat' });
    });

    emit({
      type: 'chat_finished',
      provider,
      model,
      content,
      createdAt: new Date().toISOString(),
    });
    wf.done({ contentLength: content.length });
  } catch (error) {
    emit({
      type: 'chat_failed',
      provider,
      model,
      message: error.message,
      layer: 'verification-feedback',
      createdAt: new Date().toISOString(),
    });
    wf.fail(error.message);
    process.exitCode = 1;
  }
}
