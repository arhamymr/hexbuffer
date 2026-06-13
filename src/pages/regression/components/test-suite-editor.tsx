import React from 'react';
import { Plus, Save, X, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import type { TestCase, TestStep, StepKind } from '../types';
import { STEP_KIND_LABELS, STEP_KIND_ICONS } from '../constants';
import { StepBuilder } from './step-builder';
import { AiStepGenerator } from './ai-step-generator';

interface TestSuiteEditorProps {
  testCase: TestCase;
  isNew: boolean;
  onSave: (tc: TestCase) => void;
  onCancel: () => void;
}

const DEFAULT_STEP: TestStep = {
  kind: 'navigate',
  value: '',
};

export function TestSuiteEditor({ testCase, isNew, onSave, onCancel }: TestSuiteEditorProps) {
  const [name, setName] = React.useState(testCase.name);
  const [description, setDescription] = React.useState(testCase.description);
  const [targetUrl, setTargetUrl] = React.useState(testCase.targetUrl);
  const [enabled, setEnabled] = React.useState(testCase.enabled);
  const [steps, setSteps] = React.useState<TestStep[]>(testCase.steps);

  // Sync if parent testCase changes (e.g. switching selection)
  React.useEffect(() => {
    setName(testCase.name);
    setDescription(testCase.description);
    setTargetUrl(testCase.targetUrl);
    setEnabled(testCase.enabled);
    setSteps(testCase.steps);
  }, [testCase]);

  const handleStepChange = (index: number, step: TestStep) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? step : s)));
  };

  const handleStepRemove = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { ...DEFAULT_STEP }]);
  };

  const handleStepsGenerated = (generatedSteps: TestStep[]) => {
    setSteps((prev) => [...prev, ...generatedSteps]);
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    onSave({
      ...testCase,
      name: name.trim() || 'Untitled Test Case',
      description,
      targetUrl,
      enabled,
      steps,
      updatedAt: now,
    });
  };

  const isDirty =
    name !== testCase.name ||
    description !== testCase.description ||
    targetUrl !== testCase.targetUrl ||
    enabled !== testCase.enabled ||
    JSON.stringify(steps) !== JSON.stringify(testCase.steps);

  const canSave = name.trim().length > 0 && steps.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="size-4 text-muted-foreground shrink-0" />
          <h2 className="text-sm font-semibold truncate">
            {isNew ? 'New Test Case' : `Edit: ${name || testCase.name}`}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1">
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
            className="gap-1"
          >
            <Save className="size-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              placeholder="Login flow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Target URL */}
          <div className="space-y-1.5">
            <Label className="text-xs">Target URL</Label>
            <Input
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              placeholder="Describe what this test case verifies..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm min-h-[50px]"
              rows={2}
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <Label className="text-xs cursor-pointer" htmlFor="test-enabled">Enabled</Label>
              <p className="text-[11px] text-muted-foreground">
                Disabled test cases are skipped in batch runs
              </p>
            </div>
            <Switch
              id="test-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Steps section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Steps ({steps.length})</Label>
              <div className="flex items-center gap-1.5">
                <AiStepGenerator
                  targetUrl={targetUrl}
                  onStepsGenerated={handleStepsGenerated}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddStep}
                  className="gap-1"
                >
                  <Plus className="size-3.5" />
                  Add Step
                </Button>
              </div>
            </div>

            {steps.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No steps defined yet. Add steps manually or generate them with AI.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddStep} className="gap-1">
                    <Plus className="size-3.5" />
                    Add Step
                  </Button>
                  <AiStepGenerator
                    targetUrl={targetUrl}
                    onStepsGenerated={handleStepsGenerated}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <StepBuilder
                    key={`${index}-${step.kind}`}
                    step={step}
                    index={index}
                    onChange={handleStepChange}
                    onRemove={handleStepRemove}
                    totalSteps={steps.length}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddStep}
                  className="w-full gap-1 border border-dashed"
                >
                  <Plus className="size-3.5" />
                  Add Step
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
