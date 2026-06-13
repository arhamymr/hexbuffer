import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
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
import type { TestStep } from '../types';
import { AI_STEP_GENERATOR_PROMPT } from '../constants';

interface AiStepGeneratorProps {
  targetUrl: string;
  onStepsGenerated: (steps: TestStep[]) => void;
}

export function AiStepGenerator({ targetUrl, onStepsGenerated }: AiStepGeneratorProps) {
  const [open, setOpen] = React.useState(false);
  const [scenario, setScenario] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    if (!scenario.trim()) return;

    setGenerating(true);
    setError(null);

    const prompt = AI_STEP_GENERATOR_PROMPT
      .replace('{targetUrl}', targetUrl || 'the target website')
      .replace('{scenario}', scenario.trim());

    try {
      const response = await invoke<{ content: string }>('send_ai_chat_message', {
        request: {
          messages: [{ role: 'user', content: prompt }],
        },
      });

      // Parse the AI response as JSON containing steps
      let parsed: { steps?: TestStep[] };
      try {
        // Try to extract JSON from the response (AI may wrap in markdown code blocks)
        let content = response.content.trim();
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }
        parsed = JSON.parse(content);
      } catch {
        throw new Error('AI response was not valid JSON. Please try again with a more specific scenario.');
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

      onStepsGenerated(validSteps);
      setOpen(false);
      setScenario('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate steps');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
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
            Describe the test scenario in natural language and AI will generate the test steps for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Target URL</Label>
            <Input
              value={targetUrl}
              readOnly
              className="h-8 text-sm text-muted-foreground bg-muted"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Scenario Description</Label>
            <Textarea
              placeholder="Example: Log in with valid credentials, verify the dashboard appears with user info, click on settings, verify settings page loads, and log out."
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="min-h-[100px] text-sm"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || !scenario.trim()}
            className="gap-1.5"
          >
            {generating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Generate Steps
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
