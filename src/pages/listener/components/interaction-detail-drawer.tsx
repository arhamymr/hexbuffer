'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ListenerInteraction } from '../types';

interface Props {
  interaction: ListenerInteraction | null;
  open: boolean;
  onClose: () => void;
}

type Tab = 'overview' | 'headers' | 'body' | 'raw';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
  { id: 'raw', label: 'Raw' },
];

export function InteractionDetailDrawer({ interaction, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!interaction) return null;

  const parsedHeaders = (() => {
    try {
      return interaction.headers ? JSON.parse(interaction.headers) : null;
    } catch {
      return null;
    }
  })();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[480px] overflow-auto p-2">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{interaction.interactionType.toUpperCase()}</Badge>
            <span className="font-mono text-xs">{interaction.sourceIp}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 flex gap-1 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-2 space-y-3 text-xs">
          {activeTab === 'overview' && (
            <>
              <InfoBlock label="Type" value={interaction.interactionType.toUpperCase()} />
              <InfoBlock label="Source IP" value={interaction.sourceIp} mono />
              {interaction.method && <InfoBlock label="Method" value={interaction.method} mono />}
              {interaction.path && <InfoBlock label="Path" value={interaction.path} mono />}
              <InfoBlock
                label="Timestamp"
                value={new Date(interaction.timestamp).toLocaleString()}
              />
              <InfoBlock label="Payload ID" value={interaction.payloadId} mono />
            </>
          )}

          {activeTab === 'headers' && (
            <>
              {parsedHeaders ? (
                Object.entries(parsedHeaders).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="text-muted-foreground w-32 shrink-0 text-right font-medium">
                      {k}
                    </span>
                    <span className="break-all font-mono text-[11px]">{String(v)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No headers available</p>
              )}
            </>
          )}

          {activeTab === 'body' && (
            <>
              {interaction.requestBody ? (
                <RawBlock content={interaction.requestBody} />
              ) : (
                <p className="text-muted-foreground">No request body</p>
              )}
              {interaction.serverResponse && (
                <div>
                  <p className="mb-1 font-medium">Server Response:</p>
                  <RawBlock content={interaction.serverResponse} />
                </div>
              )}
            </>
          )}

          {activeTab === 'raw' && (
            <>
              {interaction.rawRequest ? (
                <RawBlock content={interaction.rawRequest} />
              ) : (
                <p className="text-muted-foreground">No raw request data</p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-28 shrink-0 text-right font-medium">{label}</span>
      <span className={cn('break-all', mono && 'font-mono text-[11px]')}>{value}</span>
    </div>
  );
}

function RawBlock({ content }: { content: string }) {
  return (
    <pre className="max-h-80 overflow-auto rounded bg-muted p-2 font-mono text-[10px] leading-relaxed">
      {content}
    </pre>
  );
}
