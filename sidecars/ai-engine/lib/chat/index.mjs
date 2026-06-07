import { ToolLoopAgent, stepCountIs } from 'ai';

import { emit } from '../events.mjs';
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

export async function runChat() {
  const request = JSON.parse(process.env['0XBUFFER_AI_CHAT_REQUEST_JSON'] || '{"messages":[]}');
  const context = JSON.parse(process.env['0XBUFFER_AI_CONTEXT_JSON'] || '{}');
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['0XBUFFER_AI_MODEL'] || 'deepseek-chat';
  emit({ type: 'chat_started', provider, model, createdAt: new Date().toISOString() });

  try {
    const redactedRequest = runRedactionWorkflow(request).redactedValue;
    const redactedContext = runRedactionWorkflow(context).redactedValue;
    const agent = new ToolLoopAgent({
      id: CHAT_AGENT_ID,
      model: providerModel(),
      instructions: CHAT_INSTRUCTIONS,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      tools: {
        listCrawlSessions: createListCrawlSessionsTool(redactedContext),
        getCrawlContext: createGetCrawlContextTool(redactedContext),
        getProxySummary: createGetProxySummaryTool(redactedContext),
        getRecentInsights: createGetRecentInsightsTool(redactedContext),
        addScope: createAddScopeTool(emitAction),
        writeDocumentSection: createWriteDocumentSectionTool(emitAction),
        extractFromUrl: createExtractFromUrlTool(emitAction),
        analyzeTargetUrl: createAnalyzeTargetUrlTool(emitAction),
        extractSecurityInfo: createExtractSecurityInfoTool(emitAction),
      },
    });
    const result = await agent.stream({
      messages: toChatMessages(redactedRequest.messages),
    });

    let content = '';
    for await (const delta of result.textStream) {
      content += delta;
      emit({ type: 'chat_delta', delta });
    }
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
