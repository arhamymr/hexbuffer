'use client';

import { Bot, Database, Globe, Layers3, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChatMessage } from '@/components/ui/chat-message';
import { ChatMessageArea } from '@/components/ui/chat-message-area';
import { cn } from '@/lib/utils';
import { DASHBOARD_SEVERITY_CLASSNAME } from '../constants';
import type { DashboardAnalysisMessage } from '../types';
import { DashboardEmptyState } from './empty-state';
import type { Target } from '@/types';

interface DashboardThreadProps {
  libraryCount: number;
  messages: DashboardAnalysisMessage[];
  selectedTarget: Target | null;
  usingDummyData: boolean;
}

export function DashboardThread({
  libraryCount,
  messages,
  selectedTarget,
  usingDummyData,
}: DashboardThreadProps) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-sm border bg-card">
      <ChatMessageArea className="gap-3 p-2">
        <ChatMessage role="assistant">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate font-medium">Recon assistant</span>
            </div>
            <p className="text-sm leading-6">
              Pick a target from the asset library below and I will generate findings, extracted assets, and next steps.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="max-w-full gap-1 whitespace-normal text-left">
                <Database className="h-3 w-3 shrink-0" />
                <span className="min-w-0 truncate">
                  {usingDummyData ? 'Using dummy asset library' : 'Using saved target library'}
                </span>
              </Badge>
              <Badge variant="outline">{libraryCount} items available</Badge>
            </div>
          </div>
        </ChatMessage>

        {messages.length === 0 ? <DashboardEmptyState selectedTarget={selectedTarget} /> : null}

        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            <ChatMessage role="user">
              <div className="space-y-1">
                <p className="text-sm font-medium">Analyze {message.target.name}</p>
                <p className="text-xs opacity-80">
                  {message.target.scope.length} scope item{message.target.scope.length === 1 ? '' : 's'}
                </p>
              </div>
            </ChatMessage>

            <ChatMessage role="assistant">
              <div className="w-full min-w-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {message.provider === 'openai' ? `OpenAI ${message.model || ''}`.trim() : 'Local analysis'}
                  </Badge>
                  {message.error ? (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300">
                      OpenAI fallback
                    </Badge>
                  ) : null}
                </div>

                {message.error ? (
                    <div className="break-words rounded-sm border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-800 dark:border-amber-900 dark:text-amber-200">
                      {message.error}
                    </div>
                  ) : null}

                <p className="break-words text-sm leading-6">{message.result.summary}</p>

                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-sm border bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Risk score</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{message.result.score}/100</div>
                  </div>
                  <div className="rounded-sm border bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Assets</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{message.result.assets.length}</div>
                  </div>
                  <div className="rounded-sm border bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Layers3 className="h-3.5 w-3.5" />
                      <span>Findings</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{message.result.findings.length}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {message.result.findings.map((finding) => (
                    <div key={finding.title} className="rounded-sm border bg-background/70 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="min-w-0 break-words text-sm font-medium">{finding.title}</p>
                        <Badge variant="outline" className={cn('w-fit shrink-0', DASHBOARD_SEVERITY_CLASSNAME[finding.severity])}>
                          {finding.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 break-words text-sm text-muted-foreground">{finding.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Assets found
                    </p>
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {message.result.assets.length > 0 ? (
                        message.result.assets.map((asset) => (
                          <Badge key={`${asset.type}-${asset.value}`} variant="outline" className="max-w-full whitespace-normal break-all text-left">
                            {asset.type}: {asset.value}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No asset signal extracted.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Next steps
                    </p>
                    <div className="space-y-2">
                      {message.result.nextSteps.map((step) => (
                        <div key={step} className="break-words rounded-sm border bg-background/70 p-3 text-sm text-muted-foreground">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ChatMessage>
          </div>
        ))}
      </ChatMessageArea>
    </div>
  );
}
