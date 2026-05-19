import type {
  AnalysisAsset,
  AnalysisFinding,
  DashboardAnalysisFramework,
  DashboardAnalysisResult,
} from './analyze-asset-input';

interface CreateOpenAIAnalysisInput {
  apiKey: string;
  assetInput: string;
  framework: DashboardAnalysisFramework;
  model: string;
  prompt: string;
}

interface OpenAIResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
}

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    score: { type: 'number', minimum: 0, maximum: 100 },
    analystNote: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          severity: { enum: ['critical', 'high', 'medium', 'low', 'info'] },
          detail: { type: 'string' },
        },
        required: ['title', 'severity', 'detail'],
      },
    },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { enum: ['url', 'host', 'ip', 'email', 'storage', 'technology'] },
          value: { type: 'string' },
          context: { type: 'string' },
        },
        required: ['type', 'value', 'context'],
      },
    },
    nextSteps: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['summary', 'score', 'analystNote', 'findings', 'assets', 'nextSteps'],
};

export async function createOpenAIAnalysis({
  apiKey,
  assetInput,
  framework,
  model,
  prompt,
}: CreateOpenAIAnalysisInput): Promise<DashboardAnalysisResult> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions:
        'You are a security analyst for AppRecon. Analyze the selected asset data and return concise, actionable JSON only. Rank findings by practical validation value. Do not include secrets or raw API keys in the response.',
      input: [
        `Framework: ${framework}`,
        prompt.trim() ? `User prompt: ${prompt.trim()}` : '',
        `Selected asset data:\n${assetInput}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      text: {
        format: {
          type: 'json_schema',
          name: 'apprecon_dashboard_analysis',
          strict: true,
          schema: analysisSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OpenAIResponsesPayload;
  const outputText = extractOutputText(payload);
  const parsed = JSON.parse(outputText) as Omit<DashboardAnalysisResult, 'framework'>;

  return {
    summary: parsed.summary,
    score: clampScore(parsed.score),
    findings: normalizeFindings(parsed.findings),
    assets: normalizeAssets(parsed.assets),
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 6) : [],
    analystNote: parsed.analystNote,
    framework,
  };
}

function extractOutputText(payload: OpenAIResponsesPayload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join('\n');

  if (!text) {
    throw new Error('OpenAI response did not include text output.');
  }

  return text;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeFindings(findings: AnalysisFinding[]) {
  return Array.isArray(findings) ? findings.slice(0, 8) : [];
}

function normalizeAssets(assets: AnalysisAsset[]) {
  return Array.isArray(assets) ? assets.slice(0, 12) : [];
}
