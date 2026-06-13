import type { StepKind } from './types';
import { ArrowRight, MousePointer, Type, Clock, Camera, Eye, FileText, Globe, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const STEP_KIND_LABELS: Record<StepKind, string> = {
  'navigate': 'Navigate',
  'click': 'Click',
  'fill': 'Fill',
  'wait': 'Wait',
  'screenshot': 'Screenshot',
  'assert-visible': 'Assert Visible',
  'assert-text': 'Assert Text',
  'assert-url': 'Assert URL',
  'ai-verify': 'AI Verify',
};

export const STEP_KIND_ICONS: Record<StepKind, LucideIcon> = {
  'navigate': Globe,
  'click': MousePointer,
  'fill': Type,
  'wait': Clock,
  'screenshot': Camera,
  'assert-visible': Eye,
  'assert-text': FileText,
  'assert-url': ArrowRight,
  'ai-verify': Sparkles,
};

export const STEP_KIND_DESCRIPTIONS: Record<StepKind, string> = {
  'navigate': 'Go to a URL',
  'click': 'Click an element by CSS selector',
  'fill': 'Type into an input field',
  'wait': 'Pause for a duration',
  'screenshot': 'Capture a full-page screenshot',
  'assert-visible': 'Verify an element is visible',
  'assert-text': 'Verify text appears on the page',
  'assert-url': 'Verify the current URL matches a pattern',
  'ai-verify': 'Let AI analyze the page state',
};

export const AI_STEP_GENERATOR_PROMPT = `You are a QA test engineer. Generate browser test steps for the scenario below.

Target URL: {targetUrl}
Scenario: {scenario}

Return ONLY valid JSON in this exact format:
{
  "steps": [
    { "kind": "navigate", "value": "https://..." },
    { "kind": "click", "selector": "button.login" },
    { "kind": "fill", "selector": "input[name='email']", "value": "test@example.com" },
    { "kind": "wait", "ms": 2000 },
    { "kind": "assert-visible", "selector": ".dashboard" },
    { "kind": "assert-text", "value": "Welcome" },
    { "kind": "assert-url", "pattern": "/dashboard" },
    { "kind": "screenshot", "name": "dashboard-loaded" },
    { "kind": "ai-verify", "prompt": "Verify the dashboard shows user info" }
  ]
}

Available step kinds: navigate, click, fill, wait, screenshot, assert-visible, assert-text, assert-url, ai-verify.

Rules:
- Always start with a navigate step to the target URL
- Use CSS selectors (e.g., "button.submit", "input[name='email']", "#login-form")
- Add wait steps after navigation and form submissions (1000-3000ms)
- Add assertion steps to verify expected outcomes
- Keep steps concise and realistic for end-to-end testing`;

export const DEFAULT_TEST_CASE_NAME = 'New Test Case';

export const STEP_KIND_OPTIONS = Object.keys(STEP_KIND_LABELS).map((kind) => ({
  value: kind as StepKind,
  label: STEP_KIND_LABELS[kind as StepKind],
}));
