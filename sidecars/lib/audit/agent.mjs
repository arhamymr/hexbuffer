import { readFile } from 'node:fs/promises';

import { createAgent, createToolContext } from '../ai/adapter.mjs';
import { startWorkflow } from '../ai/workflow.mjs';
import { emit } from '../events.mjs';
import { withRetry } from '../retry.mjs';
import { runRedactionWorkflow } from '../privacy/redaction.mjs';
import { retrieveContext } from '../rag/retrieve.mjs';
import { filterPrompt } from '../guard/prompt-filter.mjs';
import { guardOutput } from '../guard/output-guard.mjs';
import {
  explainFindingDef,
  suggestFixDef,
  classifySeverityDef,
} from './tools/index.mjs';

const AUDIT_AGENT_ID = 'hexbuffer-audit-agent';

const AUDIT_INSTRUCTIONS = [
  'You are a security analyst inside hexbuffer, a desktop application for code security auditing.',
  'You will receive a list of security findings produced by a deterministic Rust scanner.',
  'Your job is to explain each finding, suggest practical fixes, and classify severity.',
  'Findings include hardcoded secrets, exposed API keys, vulnerable dependencies, and risky patterns.',
  '',
  'For each finding, use the tools in this order:',
  '1. explainFinding — explain the vulnerability, its impact, and attack scenarios',
  '2. suggestFix — provide a secure code example that fixes the issue',
  '3. classifySeverity — give a CVSS-like severity assessment with rationale',
  '',
  'Rules:',
  '- Be concise: 2-5 sentences per explanation.',
  '- Include specific line numbers and file paths in your explanations.',
  '- For secrets: explain how attackers could use the exposed credential.',
  '- For dependencies: reference the CVE and explain the actual risk.',
  '- Suggest real, actionable fixes with code examples.',
  '- Never output the actual secret value — use [REDACTED] instead.',
  '- Do not suggest or generate exploits, malware, or attack code.',
  '- If a finding is a false positive (low confidence), say so and explain why.',
  '- Prioritize critical and high severity findings first.',
].join('\n');

const MAX_TOOL_STEPS = 30; // 3 tools per finding × up to 10 findings

function chunkFindings(findings, chunkSize = 5) {
  const chunks = [];
  for (let i = 0; i < findings.length; i += chunkSize) {
    chunks.push(findings.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function runAudit() {
  const findingsJson = process.env['HEXBUFFER_AUDIT_FINDINGS_JSON'] || '[]';
  const findings = JSON.parse(findingsJson);

  if (!Array.isArray(findings) || findings.length === 0) {
    emit({
      type: 'audit_failed',
      message: '[task-specification] No findings provided for audit',
      layer: 'task-specification',
      fix: 'Ensure HEXBUFFER_AUDIT_FINDINGS_JSON contains a non-empty array',
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
    return;
  }

  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['HEXBUFFER_AI_MODEL'] || 'deepseek-chat';

  emit({
    type: 'audit_started',
    provider,
    model,
    totalFindings: findings.length,
    createdAt: new Date().toISOString(),
  });

  // Redact any sensitive data in findings before sending to AI
  const redactedFindings = runRedactionWorkflow(findings).redactedValue;

  // Retrieve RAG context for relevant findings
  let ragContexts = {};
  try {
    for (const finding of redactedFindings.slice(0, 10)) {
      const cat = finding.category || '';
      if (cat === 'hardcoded_secret' || cat === 'vulnerable_dependency') {
        const ctx = await retrieveContext(finding);
        if (ctx && ctx.length > 0) {
          ragContexts[finding.id] = ctx;
        }
      }
    }
  } catch (err) {
    // RAG is non-critical — continue without it
    process.stderr.write(`[audit] RAG retrieval warning: ${err.message}\n`);
  }

  const toolContext = createToolContext();

  const createAuditAgent = () => createAgent({
    id: AUDIT_AGENT_ID,
    instructions: AUDIT_INSTRUCTIONS,
    tools: {
      explainFinding: explainFindingDef,
      suggestFix: suggestFixDef,
      classifySeverity: classifySeverityDef,
    },
    ctx: toolContext,
    maxSteps: MAX_TOOL_STEPS,
  });

  const wf = startWorkflow({ name: 'audit', extra: { provider, model, findingCount: findings.length } });

  // Build the prompt with findings and RAG context
  const findingSummary = redactedFindings
    .map((f, i) => {
      const rag = ragContexts[f.id];
      const ragSection = rag
        ? `\n  Relevant knowledge: ${rag.map((r) => `[${r.id}] ${r.title}`).join('; ')}`
        : '';
      return `${i + 1}. [${f.id}] ${f.severity.toUpperCase()} - ${f.title}
  File: ${f.file_path}${f.line ? `:${f.line}` : ''}
  Rule: ${f.rule_id}
  Snippet: ${f.snippet}${ragSection}`;
    })
    .join('\n\n');

  try {
    await wf.step('agent_stream', async () => {
      return await withRetry(async () => {
        const agent = createAuditAgent();
        const result = await agent.stream({
          messages: [
            {
              role: 'user',
              content: [
                `Analyze the following security findings and use your tools to explain each one:`,
                '',
                findingSummary,
                '',
                'Work through the findings methodically. For each finding, call explainFinding, then suggestFix, then classifySeverity.',
                'Start with the most critical/high severity findings first.',
              ].join('\n'),
            },
          ],
        });

        let content = '';
        for await (const delta of result.textStream) {
          content += delta;
          // Guard: check output before emitting
          const guardResult = guardOutput(delta);
          if (guardResult.blocked) {
            emit({ type: 'audit_finding_delta', findingId: 'guard', delta: '[Content blocked by safety guard]' });
            continue;
          }
          emit({ type: 'audit_finding_delta', findingId: 'stream', delta });
        }

        return content;
      }, { maxAttempts: 2, name: 'runAudit' });
    });

    emit({
      type: 'audit_finished',
      provider,
      model,
      totalFindings: findings.length,
      createdAt: new Date().toISOString(),
    });
    wf.done({ totalFindings: findings.length });
  } catch (error) {
    emit({
      type: 'audit_failed',
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
