import { tool } from 'ai';
import { z } from 'zod';

export function createRequestHumanSelectionTool(emitAction) {
  return tool({
    description:
      'Ask the human user to pick from a list of options before you can proceed. Use this when you need the user to make a choice between two or more alternatives — for example, picking which target URL to scan, which file to analyze, or which action to take next. NEVER call this with fewer than 2 options.',
    inputSchema: z.object({
      question: z.string().describe('The question or prompt to show the user, e.g. "Which target would you like to scan?".'),
      options: z.array(z.object({
        label: z.string().describe('Human-readable label for this option, e.g. "https://example.com".'),
        value: z.string().describe('Machine value for this option, e.g. "https://example.com". Usually the same as label unless you need an internal identifier.'),
        description: z.string().optional().describe('Optional short description to help the user decide.'),
      })).min(2).describe('The list of options to show. Must have at least 2 options.'),
      multiSelect: z.boolean().optional().describe('Whether the user can select multiple options. Defaults to false.'),
    }),
    execute: async ({ question, options, multiSelect }) => {
      emitAction({
        action: 'request_human_selection',
        payload: {
          question,
          options,
          multiSelect: multiSelect ?? false,
        },
      });
      return {
        success: true,
        message: `Presented "${question}" to the user with ${options.length} options. Waiting for the user to choose before proceeding.`,
      };
    },
  });
}
