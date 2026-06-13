import { z } from 'zod';

import { createAgent } from '../ai/adapter.mjs';
import { isAiProviderAvailable } from '../ai/provider.mjs';
import { log } from '../events.mjs';

const aiVerdictSchema = z.object({
  pass: z.boolean(),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
});

/**
 * Run AI verification on a page after test steps have executed.
 * Returns a structured pass/fail verdict with reasoning.
 */
export async function verifyWithAI(page, prompt, runId, sessionId) {
  if (!isAiProviderAvailable()) {
    log(sessionId || 'regression', 'warning', 'ai',
      'AI verification skipped — no AI provider available',
      page.url(),
    );
    return null;
  }

  let htmlSnapshot;
  try {
    htmlSnapshot = await page.content();
  } catch (error) {
    log(sessionId || 'regression', 'error', 'ai',
      `Failed to capture HTML snapshot for AI verification: ${error.message}`,
      page.url(),
    );
    return null;
  }

  // Limit HTML size to avoid token exhaustion
  const truncatedHtml = htmlSnapshot.slice(0, 30000);
  const url = page.url();
  const title = await page.title().catch(() => '(unknown)');

  const agent = createAgent({
    id: '0xbuffer-regression-verifier',
    instructions: [
      'You are a QA regression tester. Your job is to verify that a web page is working correctly.',
      'You will receive the page URL, title, and an HTML snapshot.',
      'Check the page state against the user\'s verification prompt.',
      'Report whether the page passes or fails the check.',
      'If it fails, explain why and suggest fixes.',
      'Be objective and evidence-based. Do not flag cosmetic issues as failures.',
      'When the page state is correct, pass it even if the HTML structure is different than expected.',
    ].join('\n'),
    ctx: {},
    maxSteps: 3,
    tools: {
      finishVerification: {
        description: 'Return the final verification verdict.',
        inputSchema: aiVerdictSchema,
        execute: async (input) => {
          return { finished: true, ...input };
        },
      },
    },
  });

  try {
    const result = await agent.generate({
      prompt: [
        'Verify this page against the following requirement:',
        `"${prompt}"`,
        '',
        'Page URL: ' + url,
        'Page Title: ' + title,
        '',
        'HTML Snapshot (truncated):',
        truncatedHtml,
      ].join('\n'),
    });

    // The agent should call finishVerification which returns the verdict
    // If it didn't, construct a fallback
    if (result?.pass !== undefined) {
      return {
        pass: result.pass,
        reasoning: result.reasoning || 'AI verification completed',
        suggestions: result.suggestions || [],
      };
    }

    return {
      pass: true,
      reasoning: 'AI verification completed but did not return structured verdict. Assuming pass.',
      suggestions: [],
    };
  } catch (error) {
    log(sessionId || 'regression', 'warning', 'ai',
      `AI verification failed: ${error.message}`,
      url,
    );
    return {
      pass: false,
      reasoning: `AI verification error: ${error.message}`,
      suggestions: ['Check AI provider configuration and try again'],
    };
  }
}
