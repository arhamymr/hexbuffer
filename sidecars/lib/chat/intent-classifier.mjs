import { generateText } from 'ai';
import { providerModel } from '../ai/provider.mjs';

/**
 * Task categories the AI assistant can handle.
 * Each maps to one or more agent tools.
 */
const TASK_CATEGORIES = [
  { id: 'add_targets', label: 'Add targets to scope', description: 'Add hosts/URLs to your recon scope' },
  { id: 'trigger_scan', label: 'Start a browser crawl', description: 'Crawl and analyze a website' },
  { id: 'analyze_url', label: 'Analyze a URL', description: 'Extract content and insights from a URL' },
  { id: 'traffic_analysis', label: 'Analyze captured traffic', description: 'Inspect proxy logs and HTTP history' },
  { id: 'vulnerability_test', label: 'Test for vulnerabilities', description: 'Run fuzzing or replay attacks' },
  { id: 'write_document', label: 'Save findings to a document', description: 'Write notes or findings to a report' },
  { id: 'manage_proxy', label: 'Start/stop interception proxy', description: 'Control the MITM proxy' },
  { id: 'manage_targets', label: 'Remove or clear targets', description: 'Clean up your scope' },
  { id: 'general_question', label: 'Ask a general question', description: 'Get help or information' },
];

const CLASSIFICATION_PROMPT = [
  'You are an intent classifier. Your only job is to classify the user\'s latest message.',
  '',
  'Available task categories:',
  ...TASK_CATEGORIES.map((c) => `- ${c.id}: ${c.label} — ${c.description}`),
  '',
  'Rules:',
  '1. If the user\'s intent clearly matches ONE category, respond with that category ID.',
  '2. If the user\'s intent could match 2-3 categories and you are unsure, list them as suggestedCategories.',
  '3. If the user\'s intent is completely unclear or doesn\'t match any category, respond with "ambiguous".',
  '4. Be biased toward "clear" — only say "ambiguous" when the message is truly vague (e.g., "do it", "scan", no context).',
  '5. General chat, greetings, or informational questions should map to "general_question".',
  '',
  'Respond with ONLY a JSON object, no other text. Format:',
  '{',
  '  "intent": "clear" | "ambiguous",',
  '  "category": "category_id" | null,',
  '  "suggestedCategories": ["cat1", "cat2"] | null,',
  '  "clarificationQuestion": "What would you like to do?" | null',
  '}',
].join('\n');

/**
 * Classify the user's latest message to determine if intent is clear enough
 * to proceed to the full agent, or if clarification is needed.
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @returns {Promise<{ intent: 'clear' | 'ambiguous', category: string | null, suggestedCategories: string[] | null, clarificationQuestion: string | null }>}
 */
export async function classifyIntent(messages) {
  // Only classify the last user message
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1];

  if (!lastUserMessage?.content?.trim()) {
    return { intent: 'ambiguous', category: null, suggestedCategories: TASK_CATEGORIES.map((c) => c.id), clarificationQuestion: 'What would you like me to help with?' };
  }

  try {
    const model = providerModel();

    const result = await generateText({
      model,
      system: CLASSIFICATION_PROMPT,
      prompt: `Classify this user message:\n"${lastUserMessage.content}"`,
      temperature: 0,
      maxTokens: 200,
    });

    const text = result.text?.trim() || '';

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Couldn't parse — fail open (treat as clear)
      return { intent: 'clear', category: null, suggestedCategories: null, clarificationQuestion: null };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const intent = parsed.intent === 'ambiguous' ? 'ambiguous' : 'clear';
    const category = parsed.category || null;
    const suggestedCategories = Array.isArray(parsed.suggestedCategories)
      ? parsed.suggestedCategories.filter((id) => TASK_CATEGORIES.some((c) => c.id === id))
      : null;
    const clarificationQuestion = parsed.clarificationQuestion
      || 'I need a bit more context — what would you like me to help with?';

    return { intent, category, suggestedCategories, clarificationQuestion };
  } catch {
    // On any error, fail open — proceed to full agent
    return { intent: 'clear', category: null, suggestedCategories: null, clarificationQuestion: null };
  }
}

export { TASK_CATEGORIES };
