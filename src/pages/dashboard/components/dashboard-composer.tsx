'use client';

import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DASHBOARD_AI_MODELS, DASHBOARD_FRAMEWORKS } from '../constants';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Target } from '@/types';
import type { DashboardAnalysisFramework } from '../lib/analyze-asset-input';

interface DashboardComposerProps {
  apiKey: string;
  fetchTargets: () => Promise<void>;
  framework: DashboardAnalysisFramework;
  isAnalyzing: boolean;
  libraryTargets: Target[];
  model: string;
  onAnalyze: () => Promise<void>;
  prompt: string;
  selectedTarget: Target | null;
  selectedTargetId: string;
  setApiKey: (value: string) => void;
  setFramework: (value: DashboardAnalysisFramework) => void;
  setModel: (value: string) => void;
  setPrompt: (value: string) => void;
  setSelectedTargetId: (value: string) => void;
}

export function DashboardComposer({
  apiKey,
  fetchTargets,
  framework,
  isAnalyzing,
  libraryTargets,
  model,
  onAnalyze,
  prompt,
  selectedTarget,
  selectedTargetId,
  setApiKey,
  setFramework,
  setModel,
  setPrompt,
  setSelectedTargetId,
}: DashboardComposerProps) {
  return (
    <div className="mt-3 shrink-0">
      <Card className="border-t-green-500/40">
        <CardContent className="flex flex-col gap-3 p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_220px_180px_minmax(180px,1fr)_auto] lg:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">Select data</label>
              <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {libraryTargets.map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Framework</label>
              <Select value={framework} onValueChange={(value) => setFramework(value as DashboardAnalysisFramework)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select framework" />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_FRAMEWORKS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_AI_MODELS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">OpenAI API key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Optional BYOK"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Button onClick={() => void onAnalyze()} disabled={!selectedTarget || isAnalyzing}>
                <SendHorizonal className="mr-2 h-4 w-4" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </Button>

              <Button variant="outline" onClick={() => void fetchTargets()}>
                Refresh library
              </Button>
            </div>
          </div>

          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Optional instructions, for example: focus on staging exposure, rank risky hosts first, or summarize like a report."
              className="min-h-24 resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
