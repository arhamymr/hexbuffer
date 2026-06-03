'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square } from 'lucide-react';

interface InstructionPanelProps {
  instruction: string;
  isRunning: boolean;
  onInstructionChange: (instruction: string) => void;
  onRunAi: () => void;
  onStop: () => void;
}

export function InstructionPanel({
  instruction,
  isRunning,
  onInstructionChange,
  onRunAi,
  onStop,
}: InstructionPanelProps) {
  return (
    <div className="flex-1 p-3 flex flex-col gap-3 min-h-0">
      <Textarea
        className="flex-1 resize-none"
        placeholder="Enter your AI instruction here...&#10;&#10;Example:&#10;- Automation this website and find all API endpoints&#10;- Fill in the search form and find results&#10;- Navigate to the login page and fill in credentials"
        value={instruction}
        onChange={(e) => onInstructionChange(e.target.value)}
        disabled={isRunning}
      />
      <div className="flex gap-2">
        {isRunning ? (
          <Button variant="destructive" size="sm" onClick={onStop} className="w-full">
            <Square className="h-4 w-4 mr-2" />
            Stop Automation
          </Button>
        ) : (
          <Button size="sm" onClick={onRunAi} className="w-full" disabled={!instruction}>
            <Play className="h-4 w-4 mr-2" />
            Start AI Automation
          </Button>
        )}
      </div>
    </div>
  );
}