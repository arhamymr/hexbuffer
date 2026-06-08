import { ToolLoopAgent, stepCountIs } from 'ai';
import { readFile } from 'node:fs/promises';

import { emit } from '../events.mjs';
import { withRetry } from '../retry.mjs';
import { providerModel } from '../provider.mjs';
import { runRedactionWorkflow } from '../privacy/redaction.mjs';
import {
  createListCrawlSessionsTool,
  createGetCrawlContextTool,
  createGetProxySummaryTool,
  createGetRecentInsightsTool,
  createAddScopeTool,
  createWriteDocumentSectionTool,
  createExtractFromUrlTool,
  createAnalyzeTargetUrlTool,
  createExtractSecurityInfoTool,
  createListProxyHostsTool,
  createGetProxyRequestTool,
  createSendToInvokerTool,
  createSendToRepeaterTool,
  createStartProxyTool,
  createTriggerScanTool,
  createSubmitCrawlCredentialsTool,
  createNavigateToTool,
} from './tools/index.mjs';

const CHAT_AGENT_ID = '0xbuffer-chat-agent';

const CHAT_INSTRUCTIONS = [
  'You are the AI Analyst inside 0xbuffer, a desktop application for web application recon, traffic analysis, security testing, and reporting.',
  'Help users understand captured HTTP traffic, summarize recon and crawler results, identify suspicious patterns, and suggest safe testing steps.',
  'When users ask about targets, add them to scope using the addScope tool so the app tracks them.',
  'When users want findings or notes saved, write them to documents using the writeDocumentSection tool.',
  'When users ask about a specific URL, extract its content using the extractFromUrl tool.',
  'Recon workflow: use analyzeTargetUrl to gather hosts, links, forms, and content from a target URL, then add discovered hosts with addScope, and save findings/notes with writeDocumentSection.',
  'Security info workflow: use extractSecurityInfo to inspect security headers, security.txt, and cookie flags on a URL.',
  'Traffic analysis workflow: use listProxyHosts to see what hosts are communicating, getProxyRequest to inspect specific requests, then sendToInvoker or sendToRepeater for deeper testing.',
  'Invoker workflow: use sendToInvoker with a proxy log ID to configure and launch an intruder attack. Provide rawRequest with § markers to control what gets fuzzed, and payloadValues with common test values.',
  'Scan workflow: use startProxy to ensure the proxy is running, then use triggerScan to start a browser crawl on a target URL for deep page discovery and analysis. When the user asks to scan a website, always start the proxy first if it may not be running, then trigger the scan. By default scans run headless (invisible); use the live parameter only when the user explicitly asks to see the browser window.',
  'Crawl credential workflow: when the crawler pauses at a login form and the user provides credentials, use submitCrawlCredentials to resume the crawl with the provided fields.',
  'Crawl callback workflow: when a crawl completes the system will automatically send you a message with crawl results (session ID, target URL, pages visited, insights found). When you receive this, use getCrawlContext to fetch the full results and summarize what was found. Focus on security-relevant findings, exposed endpoints, forms, and interesting discoveries. Report back concisely what was discovered.',
  'After configuring something, use navigateTo to show the user the result in the relevant page.',
  'Only work within declared project scope. Prefer passive analysis over active testing.',
  'Be evidence-based. If data is insufficient, explain what is missing.',
  'Be concise, practical, and professional.',
].join('\n');

const MAX_TOOL_STEPS = 12;

function emitAction(action) {
  emit({ type: 'chat_action', ...action, createdAt: new Date().toISOString() });
}

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
  const path = process.env['0XBUFFER_AI_CHAT_CONTEXT_FILE'];
  if (!path) return {};
  const raw = await readFile(path, 'utf-8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export async function runChat() {
  const request = JSON.parse(process.env['0XBUFFER_AI_CHAT_REQUEST_JSON'] || '{"messages":[]}');
  const context = await readContextFile();
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['0XBUFFER_AI_MODEL'] || 'deepseek-chat';
  emit({ type: 'chat_started', provider, model, createdAt: new Date().toISOString() });

  const redactedRequest = runRedactionWorkflow(request).redactedValue;
  const redactedContext = runRedactionWorkflow(context).redactedValue;

  const createChatAgent = () => new ToolLoopAgent({
    id: CHAT_AGENT_ID,
    model: providerModel(),
    instructions: CHAT_INSTRUCTIONS,
    stopWhen: stepCountIs(MAX_TOOL_STEPS),
    tools: {
      listCrawlSessions: createListCrawlSessionsTool(redactedContext, emitAction),
      getCrawlContext: createGetCrawlContextTool(redactedContext, emitAction),
      getProxySummary: createGetProxySummaryTool(redactedContext, emitAction),
      getRecentInsights: createGetRecentInsightsTool(redactedContext, emitAction),
      listProxyHosts: createListProxyHostsTool(redactedContext, emitAction),
      getProxyRequest: createGetProxyRequestTool(redactedContext, emitAction),
      addScope: createAddScopeTool(emitAction),
      writeDocumentSection: createWriteDocumentSectionTool(emitAction),
      extractFromUrl: createExtractFromUrlTool(emitAction),
      analyzeTargetUrl: createAnalyzeTargetUrlTool(emitAction),
      extractSecurityInfo: createExtractSecurityInfoTool(emitAction),
      sendToInvoker: createSendToInvokerTool(emitAction),
      sendToRepeater: createSendToRepeaterTool(emitAction),
      startProxy: createStartProxyTool(emitAction),
      triggerScan: createTriggerScanTool(emitAction),
      submitCrawlCredentials: createSubmitCrawlCredentialsTool(emitAction),
      navigateTo: createNavigateToTool(emitAction),
    },
  });

  try {
    const content = await withRetry(async () => {
      const agent = createChatAgent();
      const result = await agent.stream({
        messages: toChatMessages(redactedRequest.messages),
      });
      let content = '';
      for await (const delta of result.textStream) {
        content += delta;
        emit({ type: 'chat_delta', delta });
      }
      return content;
    }, { maxAttempts: 3, name: 'runChat' });

    emit({
      type: 'chat_finished',
      provider,
      model,
      content,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    emit({
      type: 'chat_failed',
      provider,
      model,
      message: error.message,
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
  }
}
