import React from 'react';
import { ArrowDown, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import type { NodeRuntimeState } from '@/stores/automation';
import type { AutomationNodeType } from '../types';
import { getNodeDataSchema, type DataSchemaField } from '../lib/node-capabilities';

function typeColor(type: DataSchemaField['type']): string {
  switch (type) {
    case 'string': return 'text-emerald-400';
    case 'number': return 'text-amber-400';
    case 'boolean': return 'text-violet-400';
    case 'object': return 'text-sky-400';
    case 'array': return 'text-rose-400';
  }
}

function typeLabel(type: DataSchemaField['type']): string {
  switch (type) {
    case 'string': return 'str';
    case 'number': return 'num';
    case 'boolean': return 'bool';
    case 'object': return 'obj';
    case 'array': return 'arr';
  }
}

function FieldRow({ field }: { field: DataSchemaField }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b  last:border-b-0">
      <span className={`shrink-0 rounded px-1 py-px text-[9px] font-mono font-medium ${typeColor(field.type)} bg-muted/60`}>
        {typeLabel(field.type)}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-mono font-medium">{field.key}</span>
        <p className="text-[10px] text-muted-foreground/70 leading-tight truncate">
          {field.description}
        </p>
      </div>
    </div>
  );
}

function compactDataSummary(data: unknown): string {
  if (data == null) return '';
  if (Array.isArray(data)) return `${data.length} item${data.length === 1 ? '' : 's'}`;
  if (typeof data === 'object') {
    const keys = Object.keys(data as Record<string, unknown>);
    return keys.length > 0
      ? keys.slice(0, 4).join(', ') + (keys.length > 4 ? ` +${keys.length - 4}` : '')
      : 'empty object';
  }
  return String(data).slice(0, 80);
}

interface NodeDataFlowProps {
  nodeType: AutomationNodeType;
  runtime: NodeRuntimeState | null;
}

function RuntimeDataBlock({ title, data }: { title: string; data: unknown }) {
  const [expanded, setExpanded] = React.useState(false);
  const json = React.useMemo(
    () => (expanded ? JSON.stringify(data, null, 2) : ''),
    [data, expanded]
  );

  if (data == null) return null;

  return (
    <div>
      <button
        type="button"
        className="mb-1.5 flex w-full items-center gap-1.5 text-left"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? (
          <ChevronDown className="size-3 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="size-3 text-muted-foreground/60" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </span>
        <span className="ml-auto min-w-0 truncate text-[10px] text-muted-foreground/60">
          {compactDataSummary(data)}
        </span>
      </button>
      {expanded && (
        <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
          {json}
        </pre>
      )}
    </div>
  );
}

export function NodeDataFlow({ nodeType, runtime }: NodeDataFlowProps) {
  const schema = getNodeDataSchema(nodeType);
  if (!schema) return null;

  const hasInput = schema.input.length > 0;
  const hasOutput = schema.output.length > 0;

  const isTrigger = !hasInput && hasOutput;
  const isAction = hasInput && !hasOutput;
  const hasBoth = hasInput && hasOutput;

  return (
    <div className="space-y-3">
      <RuntimeDataBlock title="Received Data" data={runtime?.inputData} />
      <RuntimeDataBlock title="Output Data" data={runtime?.outputData} />
      {runtime?.inputData == null && runtime?.outputData == null && (
        <p className="rounded-md border bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground/70">
          Run the workflow to see the latest data received by this node.
        </p>
      )}

      {(hasBoth || isAction) && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowRight className="size-3 text-muted-foreground/60" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Input
            </span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              {schema.input.length} field{schema.input.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="rounded-md border bg-muted/30 px-2.5">
            {schema.input.map((field) => (
              <FieldRow key={field.key} field={field} />
            ))}
          </div>
        </div>
      )}

      {(hasBoth || isTrigger) && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            {isTrigger ? (
              <ArrowRight className="size-3 text-muted-foreground/60" />
            ) : (
              <ArrowDown className="size-3 text-muted-foreground/60" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Output
            </span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              {schema.output.length} field{schema.output.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="rounded-md border bg-muted/30 px-2.5">
            {schema.output.map((field) => (
              <FieldRow key={field.key} field={field} />
            ))}
          </div>
        </div>
      )}

      {!hasInput && !hasOutput && (
        <p className="text-[11px] text-muted-foreground/60 italic">
          No data schema defined for this node type.
        </p>
      )}
    </div>
  );
}
