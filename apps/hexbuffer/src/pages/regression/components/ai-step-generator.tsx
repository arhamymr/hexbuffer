import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sparkles, Loader2, AlertCircle, Info, Target, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { TestStep, PageStructure, FormField, ButtonInfo } from '../types';
import { AI_STEP_GENERATOR_PROMPT, AI_GOAL_STEP_PROMPT } from '../constants';

// ── Workflow stage tracking ────────────────────────────────────────────────

type WorkflowStage = 'idle' | 'scraping' | 'matching' | 'generating' | 'done' | 'error';

const STAGE_LABELS: Record<WorkflowStage, string> = {
  idle: 'Ready',
  scraping: 'Scanning page',
  matching: 'Matching goals',
  generating: 'Generating steps',
  done: 'Complete',
  error: 'Error',
};

interface MatchedElement {
  goal: string;
  fields: FormField[];
  buttons: ButtonInfo[];
  description: string;
}

interface AiStepGeneratorProps {
  targetUrl: string;
  onStepsGenerated: (steps: TestStep[]) => void;
}

// ── Page context formatting ────────────────────────────────────────────────

function buildPageContext(pageStructure: PageStructure): string {
  const parts: string[] = [];

  parts.push(`Page Title: ${pageStructure.title}`);
  parts.push(`Page URL: ${pageStructure.finalUrl || pageStructure.url}`);

  if (pageStructure.forms.length > 0) {
    parts.push('\nForm Fields Found:');
    for (const field of pageStructure.forms) {
      const label = [
        field.tagName,
        field.type && `type="${field.type}"`,
        field.name && `name="${field.name}"`,
        field.id && `id="${field.id}"`,
        field.placeholder && `placeholder="${field.placeholder}"`,
        field.ariaLabel && `aria-label="${field.ariaLabel}"`,
      ]
        .filter(Boolean)
        .join(', ');
      parts.push(`  - ${label}`);
    }
  }

  if (pageStructure.buttons.length > 0) {
    parts.push('\nButtons/Interactive Elements:');
    for (const btn of pageStructure.buttons.slice(0, 20)) {
      const label = [
        `"${btn.text}"`,
        btn.id && `id="${btn.id}"`,
        btn.className && `class="${btn.className.slice(0, 60)}"`,
      ]
        .filter(Boolean)
        .join(', ');
      parts.push(`  - ${label}`);
    }
    if (pageStructure.buttons.length > 20) {
      parts.push(`  ... and ${pageStructure.buttons.length - 20} more`);
    }
  }

  if (pageStructure.headings.length > 0) {
    parts.push('\nPage Headings:');
    for (const h of pageStructure.headings.slice(0, 10)) {
      parts.push(`  - ${h}`);
    }
  }

  if (pageStructure.textContent) {
    parts.push('\nVisible Text (first 2000 chars):');
    parts.push(pageStructure.textContent.slice(0, 2000));
  }

  return parts.join('\n');
}

// ── Goal-to-element heuristic matching ─────────────────────────────────────

const GOAL_PATTERNS: Array<{
  keywords: string[];
  fieldPatterns: RegExp[];
  buttonPatterns: RegExp[];
  label: string;
}> = [
  {
    keywords: ['login', 'log in', 'sign in', 'signin', 'authenticate'],
    fieldPatterns: [/email/i, /username/i, /user/i, /login/i],
    buttonPatterns: [/login/i, /sign.?in/i, /submit/i, /continue/i],
    label: 'Login / Authentication',
  },
  {
    keywords: ['register', 'sign up', 'signup', 'create account'],
    fieldPatterns: [/email/i, /username/i, /password/i, /confirm/i, /name/i],
    buttonPatterns: [/sign.?up/i, /register/i, /create/i, /submit/i],
    label: 'Registration / Sign Up',
  },
  {
    keywords: ['search', 'find', 'lookup', 'query', 'look for'],
    fieldPatterns: [/search/i, /query/i, /q/i, /keyword/i, /find/i],
    buttonPatterns: [/search/i, /find/i, /go/i, /submit/i],
    label: 'Search',
  },
  {
    keywords: ['contact', 'message', 'inquiry', 'support', 'help'],
    fieldPatterns: [/name/i, /email/i, /subject/i, /message/i, /phone/i],
    buttonPatterns: [/submit/i, /send/i, /contact/i],
    label: 'Contact / Support Form',
  },
  {
    keywords: ['checkout', 'cart', 'buy', 'purchase', 'order', 'payment'],
    fieldPatterns: [/card/i, /name/i, /address/i, /email/i, /zip/i, /cvv/i, /expir/i],
    buttonPatterns: [/checkout/i, /buy/i, /order/i, /pay/i, /submit/i],
    label: 'Checkout / Payment',
  },
  {
    keywords: ['subscribe', 'newsletter', 'mailing list', 'notifications'],
    fieldPatterns: [/email/i, /name/i],
    buttonPatterns: [/subscribe/i, /sign.?up/i, /join/i],
    label: 'Newsletter / Subscribe',
  },
];

function matchGoalsToElements(
  goals: string,
  pageStructure: PageStructure
): { matched: MatchedElement[]; unmatched: string[]; score: number } {
  const goalLines = goals
    .split('\n')
    .map((g) => g.trim())
    .filter((g) => g.length > 0);

  if (goalLines.length === 0) {
    return { matched: [], unmatched: [], score: 0 };
  }

  const matched: MatchedElement[] = [];
  const unmatched: string[] = [];

  for (const goal of goalLines) {
    const goalLower = goal.toLowerCase();
    let bestPattern: (typeof GOAL_PATTERNS)[number] | null = null;
    let bestKeywordScore = 0;

    // Find the best matching pattern for this goal
    for (const pattern of GOAL_PATTERNS) {
      const keywordMatches = pattern.keywords.filter((kw) =>
        goalLower.includes(kw.toLowerCase())
      ).length;
      if (keywordMatches > bestKeywordScore) {
        bestKeywordScore = keywordMatches;
        bestPattern = pattern;
      }
    }

    if (!bestPattern) {
      // No pattern matched — generic: look for any form fields + buttons
      const anyFields = pageStructure.forms.slice(0, 15);
      const anyButtons = pageStructure.buttons.slice(0, 10);

      if (anyFields.length > 0 || anyButtons.length > 0) {
        matched.push({
          goal,
          fields: anyFields,
          buttons: anyButtons,
          description: `Found ${anyFields.length} form field(s) and ${anyButtons.length} button(s) on page — no specific pattern matched for "${goal}"`,
        });
      } else {
        unmatched.push(goal);
      }
      continue;
    }

    // Match fields and buttons against the pattern
    const matchingFields = pageStructure.forms.filter((field) => {
      const searchStr = [
        field.name,
        field.id,
        field.placeholder,
        field.ariaLabel,
        field.autocomplete,
      ]
        .filter(Boolean)
        .join(' ');
      return bestPattern!.fieldPatterns.some((re) => re.test(searchStr));
    });

    const matchingButtons = pageStructure.buttons.filter((btn) => {
      const searchStr = [btn.text, btn.id, btn.className].filter(Boolean).join(' ');
      return bestPattern!.buttonPatterns.some((re) => re.test(searchStr));
    });

    if (matchingFields.length > 0 || matchingButtons.length > 0) {
      matched.push({
        goal,
        fields: matchingFields,
        buttons: matchingButtons,
        description: `Goal "${goal}" matched pattern "${bestPattern.label}": found ${matchingFields.length} field(s) and ${matchingButtons.length} button(s)`,
      });
    } else {
      // Fall back to all fields/buttons if no specific match
      const anyFields = pageStructure.forms.slice(0, 15);
      const anyButtons = pageStructure.buttons.slice(0, 10);

      if (anyFields.length > 0 || anyButtons.length > 0) {
        matched.push({
          goal,
          fields: anyFields,
          buttons: anyButtons,
          description: `Goal "${goal}" matched pattern "${bestPattern.label}" (no exact field matches — using available page elements)`,
        });
      } else {
        unmatched.push(goal);
      }
    }
  }

  const totalGoals = goalLines.length;
  const matchedCount = matched.length;
  const score = totalGoals > 0 ? (matchedCount / totalGoals) * 100 : 0;

  return { matched, unmatched, score };
}

function buildMatchedElementsContext(matched: MatchedElement[]): string {
  if (matched.length === 0) return '';

  const parts: string[] = ['\nMatched Page Elements for Goals:'];

  for (const m of matched) {
    parts.push(`\nGoal: "${m.goal}"`);
    parts.push(`  ${m.description}`);

    if (m.fields.length > 0) {
      parts.push('  Matching Fields:');
      for (const f of m.fields) {
        const sel = f.name
          ? `${f.tagName}[name="${f.name}"]`
          : f.id
            ? `${f.tagName}#${f.id}`
            : f.tagName;
        parts.push(
          `    - ${sel} ${f.type ? `(type=${f.type})` : ''} ${f.placeholder ? `placeholder="${f.placeholder}"` : ''}`
        );
      }
    }

    if (m.buttons.length > 0) {
      parts.push('  Matching Buttons:');
      for (const b of m.buttons) {
        const sel = b.id
          ? `#${b.id}`
          : b.className
            ? `.${b.className.split(' ')[0]}`
            : b.tagName;
        parts.push(`    - ${sel} "${b.text}"`);
      }
    }
  }

  return parts.join('\n');
}

// ── Component ──────────────────────────────────────────────────────────────

export function AiStepGenerator({ targetUrl, onStepsGenerated }: AiStepGeneratorProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'scenario' | 'goals'>('goals');
  const [scenario, setScenario] = React.useState('');
  const [goals, setGoals] = React.useState('');
  const [stage, setStage] = React.useState<WorkflowStage>('idle');
  const [scrapedData, setScrapedData] = React.useState<PageStructure | null>(null);
  const [scrapeError, setScrapeError] = React.useState<string | null>(null);
  const [matchedElements, setMatchedElements] = React.useState<MatchedElement[]>([]);
  const [matchScore, setMatchScore] = React.useState(0);
  const [unmatchedGoals, setUnmatchedGoals] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [generatedStepCount, setGeneratedStepCount] = React.useState(0);

  const resetWorkflow = () => {
    setStage('idle');
    setScrapedData(null);
    setScrapeError(null);
    setMatchedElements([]);
    setMatchScore(0);
    setUnmatchedGoals([]);
    setError(null);
    setGeneratedStepCount(0);
  };

  const handleGenerate = async () => {
    const isGoalMode = mode === 'goals';
    const hasInput = isGoalMode ? goals.trim() : scenario.trim();
    if (!hasInput) return;

    setError(null);
    setScrapeError(null);

    // ── Stage 1: Scrape ──────────────────────────────────────────────
    setStage('scraping');

    let pageStructure: PageStructure | null = scrapedData;

    if (targetUrl && !scrapedData) {
      try {
        const result = await invoke<PageStructure>('scrape_page_for_steps', {
          targetUrl,
        });
        pageStructure = result;
        setScrapedData(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to scan page';
        setScrapeError(msg);
        setStage('error');
        return;
      }
    }

    if (!pageStructure) {
      setStage('error');
      setError('No page data available. Please ensure a target URL is set.');
      return;
    }

    // ── Stage 2: Match goals (goal mode only) ────────────────────────
    if (isGoalMode) {
      setStage('matching');

      // Small delay so the UI shows the "matching" stage
      await new Promise((r) => setTimeout(r, 400));

      const { matched, unmatched, score } = matchGoalsToElements(goals, pageStructure);
      setMatchedElements(matched);
      setMatchScore(score);
      setUnmatchedGoals(unmatched);

      if (matched.length === 0) {
        setStage('error');
        setError(
          'No page elements matched your goals. Try adjusting your goals or check that the target URL is correct.'
        );
        return;
      }
    }

    // ── Stage 3: Generate steps ──────────────────────────────────────
    setStage('generating');

    try {
      let prompt: string;

      if (isGoalMode) {
        const pageContext = buildPageContext(pageStructure);
        const matchedCtx = buildMatchedElementsContext(matchedElements);

        prompt = AI_GOAL_STEP_PROMPT
          .replace('{targetUrl}', targetUrl || 'the target website')
          .replace('{goals}', goals.trim())
          .replace(
            '{pageContext}',
            pageContext
              ? `\n\nHere is the actual page structure scraped from the target URL:\n\n${pageContext}`
              : ''
          )
          .replace(
            '{matchedElements}',
            matchedCtx || ''
          );
      } else {
        const pageContext = pageStructure ? buildPageContext(pageStructure) : '';

        prompt = AI_STEP_GENERATOR_PROMPT
          .replace('{targetUrl}', targetUrl || 'the target website')
          .replace('{scenario}', scenario.trim());

        if (pageContext) {
          prompt = prompt.replace(
            '{pageContext}',
            `\n\nHere is the actual page structure scraped from the target URL. Use these REAL element selectors (names, IDs, classes) when generating steps:\n\n${pageContext}`
          );
        } else {
          prompt = prompt.replace('{pageContext}', '');
        }
      }

      const response = await invoke<{ content: string }>('send_ai_chat_message', {
        request: {
          messages: [{ role: 'user', content: prompt }],
        },
      });

      // Parse the AI response as JSON containing steps
      let parsed: { steps?: TestStep[] };
      try {
        let content = response.content.trim();
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }
        parsed = JSON.parse(content);
      } catch {
        throw new Error(
          'AI response was not valid JSON. Please try again with more specific goals.'
        );
      }

      if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
        throw new Error('AI did not return any valid steps. Please try again.');
      }

      // Validate and clean up each step
      const validSteps: TestStep[] = parsed.steps.map((step: Partial<TestStep>) => {
        const kind = step.kind || 'click';
        return {
          kind: kind as TestStep['kind'],
          selector: step.selector,
          value: step.value,
          ms: step.ms,
          name: step.name,
          prompt: step.prompt,
          pattern: step.pattern,
        };
      });

      setGeneratedStepCount(validSteps.length);
      setStage('done');

      // Brief delay so the user sees "done" before dialog closes
      await new Promise((r) => setTimeout(r, 600));

      onStepsGenerated(validSteps);
      setOpen(false);
      setScenario('');
      setGoals('');
      resetWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate steps');
      setStage('error');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetWorkflow();
    }
  };

  const isRunning = stage === 'scraping' || stage === 'matching' || stage === 'generating';
  const hasInput = mode === 'goals' ? goals.trim() : scenario.trim();

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Sparkles className="size-3.5" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            AI Step Generator
          </DialogTitle>
          <DialogDescription>
            {targetUrl
              ? 'The target page will be scanned to match your goals and generate accurate steps.'
              : 'Describe what you want to achieve and AI will generate the test steps.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target URL (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Target URL</Label>
            <Input
              value={targetUrl || '(no URL set in test case)'}
              readOnly
              className="h-8 text-sm text-muted-foreground bg-muted"
            />
          </div>

          {/* ── Workflow Progress Bar ─────────────────────────── */}
          {stage !== 'idle' && stage !== 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {(['scraping', 'matching', 'generating'] as WorkflowStage[]).map((s, i) => {
                  const stageIdx = ['scraping', 'matching', 'generating'].indexOf(stage);
                  const isActive = i === stageIdx;
                  const isPast = i < stageIdx;
                  const isFuture = i > stageIdx;

                  return (
                    <React.Fragment key={s}>
                      {i > 0 && (
                        <ArrowRight
                          className={cn(
                            'size-3 shrink-0',
                            isPast ? 'text-green-400' : 'text-muted-foreground/30'
                          )}
                        />
                      )}
                      <div
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                          isActive && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                          isPast && 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                          isFuture && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isActive ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : isPast ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <Circle className="size-3" />
                        )}
                        {STAGE_LABELS[s]}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    stage === 'scraping' && 'bg-blue-400 w-1/3',
                    stage === 'matching' && 'bg-blue-400 w-2/3',
                    stage === 'generating' && 'bg-blue-400 animate-pulse w-full',
                    stage === 'done' && 'bg-green-400 w-full'
                  )}
                />
              </div>
            </div>
          )}

          {/* ── Mode toggle ──────────────────────────────────── */}
          <div className="flex rounded-md border bg-muted/50 p-0.5">
            <button
              onClick={() => setMode('goals')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'goals'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Target className="size-3.5" />
              Goals
            </button>
            <button
              onClick={() => setMode('scenario')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'scenario'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="size-3.5" />
              Scenario
            </button>
          </div>

          {/* ── Input ────────────────────────────────────────── */}
          {mode === 'goals' ? (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Goals <span className="text-muted-foreground font-normal">(one per line)</span>
              </Label>
              <Textarea
                placeholder={`Login with username "admin" and password "test123"\nVerify dashboard shows user info\nSearch for "laptop" and verify results appear`}
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="min-h-[110px] text-sm"
                autoFocus
                disabled={isRunning}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Scenario Description</Label>
              <Textarea
                placeholder="Example: Log in with valid credentials, verify the dashboard appears with user info, click on settings, verify settings page loads, and log out."
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="min-h-[100px] text-sm"
                autoFocus
                disabled={isRunning}
              />
            </div>
          )}

          {/* ── Stage indicators ──────────────────────────────── */}
          {stage === 'scraping' && (
            <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
              <Loader2 className="size-4 text-blue-500 animate-spin shrink-0" />
              <span className="text-blue-700 dark:text-blue-400">Scanning target page…</span>
            </div>
          )}

          {stage === 'matching' && (
            <div className="flex items-center gap-2 rounded-md bg-purple-50 dark:bg-purple-950/30 p-3 text-sm">
              <Loader2 className="size-4 text-purple-500 animate-spin shrink-0" />
              <span className="text-purple-700 dark:text-purple-400">
                Analyzing page elements for your goals…
              </span>
            </div>
          )}

          {/* ── Match results (shown after matching, before generating) ── */}
          {stage === 'generating' && mode === 'goals' && matchedElements.length > 0 && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Goals matched — {matchScore === 100 ? 'all goals found' : `${matchedElements.length} goal(s) matched`}
                </p>
              </div>
              {matchedElements.map((m, i) => (
                <div key={i} className="text-xs text-green-600/80 dark:text-green-400/80 ml-6">
                  <span className="font-medium">"{m.goal}"</span> → {m.fields.length} field(s), {m.buttons.length} button(s)
                </div>
              ))}
              {unmatchedGoals.length > 0 && (
                <div className="flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 ml-6">
                  <AlertCircle className="size-3 shrink-0 mt-0.5" />
                  <span>{unmatchedGoals.length} goal(s) had no direct matches — AI will attempt best-effort</span>
                </div>
              )}
            </div>
          )}

          {/* Scrape success (scenario mode, already scraped) */}
          {scrapedData && stage === 'idle' && mode === 'scenario' && (
            <div className="flex items-start gap-2 rounded-md bg-green-50 dark:bg-green-950/20 p-3 text-sm">
              <Info className="size-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-green-700 dark:text-green-400 font-medium">Page scanned successfully</p>
                <p className="text-green-600/70 dark:text-green-400/70 text-xs mt-0.5">
                  Found {scrapedData.forms.length} form fields, {scrapedData.buttons.length} buttons, {scrapedData.headings.length} headings
                </p>
              </div>
            </div>
          )}

          {/* Scrape error */}
          {scrapeError && (
            <div className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 p-3 text-sm">
              <AlertCircle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-700 dark:text-yellow-400 font-medium">Could not scan target page</p>
                <p className="text-yellow-600/70 dark:text-yellow-400/70 text-xs mt-0.5">
                  {scrapeError}. Steps will be generated without page context — selectors may be less accurate.
                </p>
              </div>
            </div>
          )}

          {/* Done stage */}
          {stage === 'done' && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/20 p-3 text-sm">
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
              <span className="text-green-700 dark:text-green-400">
                {generatedStepCount} step{generatedStepCount !== 1 ? 's' : ''} generated successfully
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isRunning}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isRunning || !hasInput || !targetUrl}
            className="gap-1.5"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {STAGE_LABELS[stage]}…
              </>
            ) : (
              <>
                <Target className="size-3.5" />
                {mode === 'goals' ? 'Generate from Goals' : 'Generate Steps'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
