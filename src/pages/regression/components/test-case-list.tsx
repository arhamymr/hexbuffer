import React from 'react';
import { Plus, Trash2, Play, Pencil, FlaskConical, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestCase } from '../types';

interface TestCaseListProps {
  testCases: TestCase[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (tc: TestCase) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  isRunning: boolean;
}

export function TestCaseList({
  testCases,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onRun,
  isRunning,
}: TestCaseListProps) {
  return (
    <div className="flex flex-col h-full border-r bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Test Cases</h2>
        <Button variant="ghost" size="icon" onClick={onCreate} title="New test case">
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {testCases.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <FlaskConical className="size-8 mx-auto mb-2 opacity-40" />
            <p>No test cases yet</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onCreate}>
              <Plus className="size-3 mr-1" /> Create Test Case
            </Button>
          </div>
        ) : (
          testCases.map((tc) => (
            <div
              key={tc.id}
              className={cn(
                'group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-b border-border/50 hover:bg-muted/50 transition-colors',
                selectedId === tc.id && 'bg-muted'
              )}
              onClick={() => onSelect(tc.id)}
            >
              <FlaskConical className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tc.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {tc.targetUrl || 'No target URL'} &middot; {tc.steps.length} step{tc.steps.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => { e.stopPropagation(); onRun(tc.id); }}
                  disabled={isRunning}
                  title="Run test"
                >
                  <Play className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => { e.stopPropagation(); onEdit(tc); }}
                  title="Edit test case"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(tc.id); }}
                  title="Delete test case"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/40" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
