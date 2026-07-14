import { generateObject } from 'ai';
import { z } from 'zod';

import { providerModel } from '../ai/provider.mjs';
import { emit } from '../events.mjs';
import { withRetry } from '../retry.mjs';

export async function runPixelGenerate() {
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['HEXBUFFER_AI_MODEL'] || 'deepseek-chat';
  
  const prompt = process.env['HEXBUFFER_PIXEL_PROMPT'] || '';
  const width = parseInt(process.env['HEXBUFFER_PIXEL_WIDTH'] || '8', 10);
  const height = parseInt(process.env['HEXBUFFER_PIXEL_HEIGHT'] || '8', 10);
  const paletteJson = process.env['HEXBUFFER_PIXEL_PALETTE'] || '[]';
  
  let palette = [];
  try {
    palette = JSON.parse(paletteJson);
  } catch (e) {
    palette = [];
  }

  const paletteContext = palette.join(', ');

  const matrixSchema = z.object({
    name: z.string().describe("a descriptive snake_case name for the generated asset"),
    width: z.number().describe("the width of the grid, must match requested width"),
    height: z.number().describe("the height of the grid, must match requested height"),
    matrix: z.array(z.array(z.number())).describe("2D matrix of numbers representing color indices"),
  });

  try {
    const response = await withRetry(async () => {
      return await generateObject({
        model: providerModel(),
        schema: matrixSchema,
        system: [
          "You are a highly optimized, professional game-development asset matrix compiler.",
          "Your task is to generate pixel art asset data based on a user's description.",
          "CRITICAL RULES:",
          `- Every row must contain exactly ${width} elements.`,
          `- The total number of rows must equal exactly ${height}.`,
          `- Each element inside the data rows must be an integer mapping to a valid index in the user's provided color palette array.`,
          `- Available color palette mapping: [${paletteContext}].`,
          `- Do NOT make up index values that are not in the provided palette context.`,
        ].join('\n'),
        prompt: `User request: "${prompt}". Dimensions: ${width}x${height}. Please compile this pixel art asset into a JSON matrix matching the schema.`,
      });
    }, { maxAttempts: 2, name: 'runPixelGenerate' });

    emit({
      type: 'pixel_generate_finished',
      provider,
      model,
      data: response.object,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    emit({
      type: 'pixel_generate_failed',
      provider,
      model,
      message: error.message,
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
  }
}
