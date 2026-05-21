'use client';

import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DASHBOARD_AI_MODELS, DASHBOARD_FRAMEWORKS } from '../constants';
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
  framework: DashboardAnalysisFramework;
  isAnalyzing: boolean;
  libraryTargets: Target[];
  model: string;
  onAnalyze: () => Promise<void>;
  prompt: string;
  selectedTarget: Target | null;
  selectedTargetId: string;
  setFramework: (value: DashboardAnalysisFramework) => void;
  setModel: (value: string) => void;
  setPrompt: (value: string) => void;
  setSelectedTargetId: (value: string) => void;
}

export function DashboardComposer({
  framework,
  isAnalyzing,
  libraryTargets,
  model,
  onAnalyze,
  prompt,
  selectedTarget,
  selectedTargetId,
  setFramework,
  setModel,
  setPrompt,
  setSelectedTargetId,
}: DashboardComposerProps) {
  return (
    <div className="mt-2 min-w-0 shrink-0">
      <Card className="border bg-background">
        <CardContent className="flex min-w-0 flex-col gap-2 p-2">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex gap-2">
              <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                <SelectTrigger className="w-full min-w-0">
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

              <Select value={framework} onValueChange={(value) => setFramework(value as DashboardAnalysisFramework)}>
                <SelectTrigger className="w-full min-w-0">
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

              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full min-w-0">
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

            <Button size="xs" className="w-full" onClick={() => void onAnalyze()} disabled={!selectedTarget || isAnalyzing}>
              <SendHorizonal className="mr-2 h-4 w-4" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
