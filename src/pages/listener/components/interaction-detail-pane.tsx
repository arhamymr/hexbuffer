import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { ListenerInteraction } from '../types';
import { useInteractionDetail, type Tab } from './hooks/use-interaction-detail';

interface Props {
  interaction: ListenerInteraction | null;
  onClose: () => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
  { id: 'raw', label: 'Raw' },
];

export function InteractionDetailPane({ interaction, onClose }: Props) {
  const { activeTab, setActiveTab, parsedHeaders, parsedQuery } = useInteractionDetail({
    interaction,
  });

  if (!interaction) return null;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-semibold tracking-wider">
            {interaction.interactionType.toUpperCase()}
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">
            {interaction.sourceIp}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs list */}
      <div className="flex h-9 shrink-0 items-center border-b bg-muted/20 px-2 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-sm px-2.5 py-1 text-xs font-medium transition-all hover:text-foreground',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="space-y-3 text-xs">
          {activeTab === 'overview' && (
            <div className="grid gap-y-2">
              <InfoBlock label="Type" value={interaction.interactionType.toUpperCase()} />
              <InfoBlock label="Source IP" value={interaction.sourceIp} mono />
              {interaction.method && <InfoBlock label="Method" value={interaction.method} mono />}
              {interaction.path && <InfoBlock label="Path" value={interaction.path} mono />}
              <InfoBlock
                label="Timestamp"
                value={new Date(interaction.timestamp).toLocaleString()}
              />
              <InfoBlock label="Payload ID" value={interaction.payloadId} mono />

              {parsedQuery && (
                <div className="border-t border-border/40 mt-2 pt-2 space-y-1">
                  <p className="font-semibold text-muted-foreground mb-1.5">Query Parameters:</p>
                  {Object.entries(parsedQuery).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-[11px]">
                      <span className="w-24 shrink-0 text-right font-mono text-muted-foreground">{k}:</span>
                      <span className="break-all font-mono text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'headers' && (
            <div className="space-y-2">
              {parsedHeaders ? (
                Object.entries(parsedHeaders).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="w-32 shrink-0 text-right font-mono text-[11px] text-muted-foreground font-medium">
                      {k}:
                    </span>
                    <span className="break-all font-mono text-[11px] text-foreground">{String(v)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No headers available</p>
              )}
            </div>
          )}

          {activeTab === 'body' && (
            <div className="space-y-4">
              <div>
                <p className="mb-1 font-semibold text-muted-foreground">Request Body:</p>
                {interaction.requestBody ? (
                  <RawBlock content={interaction.requestBody} />
                ) : (
                  <p className="text-muted-foreground italic pl-2">No request body</p>
                )}
              </div>
              {interaction.serverResponse && (
                <div>
                  <p className="mb-1 font-semibold text-muted-foreground">Server Response:</p>
                  <RawBlock content={interaction.serverResponse} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div>
              <p className="mb-1 font-semibold text-muted-foreground">Raw Request Data:</p>
              {interaction.rawRequest ? (
                <RawBlock content={interaction.rawRequest} />
              ) : (
                <p className="text-muted-foreground italic pl-2">No raw request data</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-24 shrink-0 text-right font-medium text-muted-foreground">{label}</span>
      <span className={cn('break-all text-foreground', mono && 'font-mono text-[11px]')}>{value}</span>
    </div>
  );
}

function RawBlock({ content }: { content: string }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/50 p-2.5 font-mono text-[10px] leading-relaxed text-foreground select-text">
      {content}
    </pre>
  );
}
