import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { emit } from '../events.mjs';
import { providerModel } from './provider.mjs';

/**
 * Build a context object passed to all tool execute functions.
 * Tools receive (input, ctx) — ctx has emitAction, redactedContext, and any
 * other shared deps the adapter injects.
 */
export function createToolContext(overrides = {}) {
  return {
    emitAction: (action) => emit({ type: 'chat_action', ...action, createdAt: new Date().toISOString() }),
    redactedContext: null,
    ...overrides,
  };
}

/**
 * Wrap a tool definition (plain object with description, inputSchema, execute)
 * into a Vercel AI SDK `tool()`.
 *
 * To swap AI engines, replace this function's implementation — tool definitions
 * never need to change.
 */
export function wrapTool(def, ctx) {
  const base = {
    description: def.description,
    inputSchema: def.inputSchema,
    execute: (input) => def.execute(input, ctx),
  };
  if (def.experimental_toToolResultContent != null) {
    base.experimental_toToolResultContent = def.experimental_toToolResultContent;
  }
  return tool(base);
}

/**
 * Create a ToolLoopAgent from tool definitions and a context.
 *
 * tools: { toolName: toolDefinition, ... }
 * ctx:   shared context injected into every tool execute call
 */
export function createAgent({ id, instructions, tools, ctx, maxSteps = 6 }) {
  const wrappedTools = Object.fromEntries(
    Object.entries(tools).map(([name, def]) => [name, wrapTool(def, ctx)]),
  );

  return new ToolLoopAgent({
    id,
    model: providerModel(),
    instructions,
    stopWhen: stepCountIs(maxSteps),
    tools: wrappedTools,
  });
}

/**
 * Convenience: create a single wrapped tool (used for inline tools in ai-workflow.mjs).
 */
export function createTool(def, ctx) {
  return wrapTool(def, ctx);
}

export { providerModel } from './provider.mjs';
