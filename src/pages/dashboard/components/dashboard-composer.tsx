'use client';

import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DASHBOARD_FRAMEWORKS } from '../constants';
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
  fetchTargets: () => Promise<void>;
  framework: DashboardAnalysisFramework;
  isAnalyzing: boolean;
  libraryTargets: Target[];
  onAnalyze: () => Promise<void>;
  prompt: string;
  selectedTarget: Target | null;
  selectedTargetId: string;
  setFramework: (value: DashboardAnalysisFramework) => void;
  setPrompt: (value: string) => void;
  setSelectedTargetId: (value: string) => void;
}

export function DashboardComposer({
  fetchTargets,
  framework,
  isAnalyzing,
  libraryTargets,
  onAnalyze,
  prompt,
  selectedTarget,
  selectedTargetId,
  setFramework,
  setPrompt,
  setSelectedTargetId,
}: DashboardComposerProps) {
  return (
    <div className="mt-3 shrink-0">
      <Card className="border-t-green-500/40">
        <CardContent className="flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
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

            <div className="w-full lg:w-[240px]">
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
