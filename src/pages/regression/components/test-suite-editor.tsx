import React from 'react';
import { WarningCircleIcon, PlusIcon, FloppyDiskIcon, GearSixIcon, XIcon, FlaskIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TestCase, TestStep } from '../types';
import { AiStepGenerator } from './ai-step-generator';
import { StepFlowBuilder } from './step-flow-builder';

interface TestSuiteEditorProps {
  testCase: TestCase;
  isNew: boolean;
  onSave: (tc: TestCase) => void | Promise<void>;
  onDraftChange?: (tc: TestCase) => void;
  onCancel: () => void;
}

const DEFAULT_STEP: TestStep = {
  kind: 'navigate',
  value: '',
};

export function TestSuiteEditor({ testCase, isNew, onSave, onDraftChange, onCancel }: TestSuiteEditorProps) {
  const [testName, setTestName] = React.useState(testCase.testName || 'Default Test');
  const [name, setName] = React.useState(testCase.name || 'New Test Case');
  const [description, setDescription] = React.useState(testCase.description || '');
  const [targetUrl, setTargetUrl] = React.useState(testCase.targetUrl || '');
  const [enabled, setEnabled] = React.useState(testCase.enabled);
  const [steps, setSteps] = React.useState<TestStep[]>(testCase.steps || []);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Sync if parent testCase changes (e.g. switching selection)
  React.useEffect(() => {
    setTestName(testCase.testName || 'Default Test');
    setName(testCase.name || 'New Test Case');
    setDescription(testCase.description || '');
    setTargetUrl(testCase.targetUrl || '');
    setEnabled(testCase.enabled);
    setSteps(testCase.steps || []);
  }, [testCase]);

  React.useEffect(() => {
    if (isNew) {
      setConfigOpen(true);
    }
  }, [isNew, testCase.id]);

  const buildDraftTestCase = React.useCallback(
    (overrides: Partial<TestCase> = {}): TestCase => ({
      ...testCase,
      testName,
      name,
      description,
      targetUrl,
      enabled,
      steps,
      updatedAt: new Date().toISOString(),
      ...overrides,
    }),
    [description, enabled, name, steps, targetUrl, testCase, testName]
  );

  const notifyDraftChange = React.useCallback(
    (overrides: Partial<TestCase> = {}) => {
      onDraftChange?.(buildDraftTestCase(overrides));
    },
    [buildDraftTestCase, onDraftChange]
  );

  const handleAddStep = React.useCallback(() => {
    const nextSteps = [...steps, { ...DEFAULT_STEP }];
    setSteps(nextSteps);
    notifyDraftChange({ steps: nextSteps });
  }, [notifyDraftChange, steps]);

  const handleStepsGenerated = React.useCallback(
    (generatedSteps: TestStep[]) => {
      const nextSteps = [...steps, ...generatedSteps];
      setSteps(nextSteps);
      notifyDraftChange({ steps: nextSteps });
    },
    [notifyDraftChange, steps]
  );

  const handleStepsChange = React.useCallback(
    (nextSteps: TestStep[]) => {
      setSteps(nextSteps);
      notifyDraftChange({ steps: nextSteps });
    },
    [notifyDraftChange]
  );

  const buildTestCaseForSave = React.useCallback((): TestCase => {
    const now = new Date().toISOString();
    return {
      ...testCase,
      testName: testName.trim() || 'Default Test',
      name: name.trim() || 'Untitled Test Case',
      description,
      targetUrl,
      enabled,
      steps,
      updatedAt: now,
    };
  }, [description, enabled, name, steps, targetUrl, testCase, testName]);

  const handleSave = React.useCallback(async (): Promise<boolean> => {
    if (isSaving) return false;
    setSaveError(null);
    setIsSaving(true);
    try {
      await onSave(buildTestCaseForSave());
      toast.success('Test case saved');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSaveError(message || 'Failed to save test case');
      toast.error('Failed to save test case', {
        description: message || 'Unknown error',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [buildTestCaseForSave, isSaving, onSave]);

  const handleConfigDone = React.useCallback(() => {
    setConfigOpen(false);
  }, []);

  const isDirty =
    testName !== (testCase.testName || 'Default Test') ||
    name !== (testCase.name || 'New Test Case') ||
    description !== (testCase.description || '') ||
    targetUrl !== (testCase.targetUrl || '') ||
    enabled !== testCase.enabled ||
    JSON.stringify(steps) !== JSON.stringify(testCase.steps || []);

  const canSave = testName.trim().length > 0 && name.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskIcon className="size-4 text-muted-foreground shrink-0" />
          <h2 className="text-sm font-semibold truncate">
            {isNew ? 'New Test Case' : `Edit: ${name || testCase.name}`}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" onClick={() => setConfigOpen(true)} className="gap-1">
            <GearSixIcon className="size-3.5" />
            Config
          </Button>
          <Button variant="ghost" onClick={onCancel} className="gap-1">
            <XIcon className="size-3.5" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="gap-1"
          >
            <FloppyDiskIcon className="size-3.5" />
            {isSaving ? 'Saving...' : 'FloppyDiskIcon'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {saveError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />
              <span className="break-words">{saveError}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-xs font-semibold">Test Flow</Label>
              <p className="truncate text-[11px] text-muted-foreground">
                {steps.length} step{steps.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <AiStepGenerator
                targetUrl={targetUrl}
                onStepsGenerated={handleStepsGenerated}
              />
              <Button
                variant="outline"
                onClick={handleAddStep}
                className="gap-1"
              >
                <PlusIcon className="size-3.5" />
                Add Step
              </Button>
            </div>
          </div>

          <StepFlowBuilder
            steps={steps}
            onStepsChange={handleStepsChange}
            onAddStep={handleAddStep}
            emptyActions={
              <>
                <Button variant="outline" onClick={handleAddStep} className="gap-1">
                  <PlusIcon className="size-3.5" />
                  Add Step
                </Button>
                <AiStepGenerator
                  targetUrl={targetUrl}
                  onStepsGenerated={handleStepsGenerated}
                />
              </>
            }
          />
        </div>
      </ScrollArea>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Test Case Config</DialogTitle>
            <DialogDescription>
              Configure the test metadata used when saving and generating steps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {saveError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                <span className="break-words">{saveError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Test</Label>
              <Input
                placeholder="Landing page"
                value={testName}
                onChange={(e) => {
                  setTestName(e.target.value);
                  notifyDraftChange({ testName: e.target.value });
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Test Case</Label>
              <Input
                placeholder="Login Feature"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  notifyDraftChange({ name: e.target.value });
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">TargetIcon URL</Label>
              <Input
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => {
                  setTargetUrl(e.target.value);
                  notifyDraftChange({ targetUrl: e.target.value });
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                placeholder="Describe what this test case verifies..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  notifyDraftChange({ description: e.target.value });
                }}
                className="min-h-[72px] text-sm"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <div>
                <Label className="cursor-pointer text-xs" htmlFor="test-enabled">Enabled</Label>
                <p className="text-[11px] text-muted-foreground">
                  Disabled test cases are skipped in batch runs
                </p>
              </div>
              <Switch
                id="test-enabled"
                checked={enabled}
                onCheckedChange={(checked) => {
                  setEnabled(checked);
                  notifyDraftChange({ enabled: checked });
                }}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <span className="text-xs font-medium">Steps</span>
              <span className="text-xs text-muted-foreground">
                {steps.length} configured
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleConfigDone} disabled={!canSave}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
