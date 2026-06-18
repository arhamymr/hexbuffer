import * as React from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Activity,
  Binary,
  Braces,
  FilePlus2,
  Network,
  Play,
  Search,
  ShieldAlert,
  Siren,
  Square,
  Trash2,
} from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextEditor } from '@/components/ui/text-editor';
import { cn } from '@/lib/utils';
import type {
  BinarySymbol,
  ExtractedString,
  GhidraDecompiledFunction,
  ThreatAnalysisLogEvent,
  ThreatAnalysisResult,
  ThreatSample,
} from '../types';
import { formatBytes, formatDate, formatEntropy, lowerIncludes } from '../lib/format';

interface ThreatsWorkspaceProps {
  samples: ThreatSample[];
  selectedSample: ThreatSample | null;
  selectedSampleId: string | null;
  setSelectedSampleId: (id: string) => void;
  analysis: ThreatAnalysisResult | null;
  analysisLogs: ThreatAnalysisLogEvent[];
  loading: boolean;
  analyzing: boolean;
  runGhidra: boolean;
  setRunGhidra: (value: boolean) => void;
  yaraRulesPath?: string;
  search: string;
  setSearch: (value: string) => void;
  handleAnalyze: () => void;
  handleCancelAnalysis: () => void;
  handleDeleteSample: () => void;
  handleChooseYaraRules: () => void;
  handleImportSample: () => void;
}

export function ThreatsWorkspace({
  samples,
  selectedSample,
  selectedSampleId,
  setSelectedSampleId,
  analysis,
  analysisLogs,
  loading,
  analyzing,
  runGhidra,
  setRunGhidra,
  yaraRulesPath,
  search,
  setSearch,
  handleAnalyze,
  handleCancelAnalysis,
  handleDeleteSample,
  handleChooseYaraRules,
  handleImportSample,
}: ThreatsWorkspaceProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_minmax(0,1fr)] bg-background text-xs">
      <aside className="flex min-h-0 flex-col border-r">
        <div className="flex h-10 items-center justify-between gap-2 border-b bg-muted px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <ShieldAlert className="size-3.5 text-primary" />
            Threats
          </div>
          <Button onClick={handleImportSample}>
            <FilePlus2 className="size-3.5" />
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1 p-1.5">
            {loading && <p className="px-2 py-3 text-xs text-muted-foreground">Loading samples...</p>}
            {!loading && samples.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">No samples imported.</p>
            )}
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => setSelectedSampleId(sample.id)}
                className={cn(
                  'w-full rounded-sm border px-2 py-1.5 text-left transition-colors',
                  selectedSampleId === sample.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-transparent hover:border-border hover:bg-background',
                )}
              >
                <div className="truncate text-xs font-medium">{sample.fileName}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>{formatBytes(sample.size)}</span>
                  <span>{formatDate(sample.updatedAt)}</span>
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {sample.sha256}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex h-10 items-center justify-between gap-3 border-b bg-muted px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-medium">
              {selectedSample?.fileName ?? 'No sample selected'}
            </div>
            <div className="truncate font-mono text-[11px] text-muted-foreground">
              {selectedSample?.sha256 ?? 'Import a binary to begin analysis'}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-7 w-48 pl-7 text-xs"
                placeholder="Search results"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex h-7 items-center gap-2 rounded-sm border bg-background px-2">
              <Switch id="run-ghidra" checked={runGhidra} onCheckedChange={setRunGhidra} />
              <Label htmlFor="run-ghidra" className="text-xs">Ghidra</Label>
            </div>
            <Button variant={yaraRulesPath ? 'secondary' : 'outline'} onClick={handleChooseYaraRules}>
              <Siren className="size-4" />
              YARA
            </Button>
            {analyzing ? (
              <Button variant="outline" onClick={handleCancelAnalysis}>
                <Square className="size-3.5" />
                Cancel
              </Button>
            ) : (
              <Button onClick={handleAnalyze} disabled={!selectedSample}>
                <Play className="size-4" />
                Analyze
              </Button>
            )}
            <Button variant="ghost" onClick={handleDeleteSample} disabled={!selectedSample || analyzing}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <TabsContent value="overview" className="m-0 h-full">
            <OverviewView analysis={analysis} />
          </TabsContent>
          <TabsContent value="strings" className="m-0 h-full">
            <StringsView rows={analysis?.artifacts.strings ?? []} search={search} />
          </TabsContent>
          <TabsContent value="imports" className="m-0 h-full">
            <SymbolsView imports={analysis?.artifacts.imports ?? []} exports={analysis?.artifacts.exports ?? []} search={search} />
          </TabsContent>
          <TabsContent value="functions" className="m-0 h-full">
            <FunctionsView analysis={analysis} search={search} />
          </TabsContent>
          <TabsContent value="decompiled" className="m-0 h-full">
            <DecompilerView rows={analysis?.artifacts.decompiled ?? []} />
          </TabsContent>
          <TabsContent value="callgraph" className="m-0 h-full">
            <CallGraphView analysis={analysis} />
          </TabsContent>
          <TabsContent value="yara" className="m-0 h-full">
            <YaraView analysis={analysis} />
          </TabsContent>
          <TabsContent value="mitre" className="m-0 h-full">
            <PlaceholderView title="MITRE ATT&CK" body="Technique mapping will be generated from static, Ghidra, YARA, and AI signals in v3." />
          </TabsContent>
          <TabsContent value="ai" className="m-0 h-full">
            <PlaceholderView title="AI Analysis" body="Risk scoring, family guesses, capability summaries, and recommended actions will be added in v3." />
          </TabsContent>
        </div>
        <AnalysisLogPanel logs={analysisLogs} />
      </section>
    </div>
  );
}

function OverviewView({ analysis }: { analysis: ThreatAnalysisResult | null }) {
  const sample = analysis?.sample;
  const metadata = analysis?.artifacts.metadata;
  const entropy = analysis?.artifacts.entropy;
  const run = analysis?.latestRun;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Overview" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-2 p-2 lg:grid-cols-3">
          <Metric label="Status" value={run?.status ?? 'not analyzed'} icon={Activity} />
          <Metric label="Format" value={metadata?.fileType ?? 'n/a'} icon={Binary} />
          <Metric label="Entropy" value={formatEntropy(entropy?.fileEntropy)} icon={Braces} />
        </div>
        <div className="grid gap-2 px-2 pb-2 lg:grid-cols-2">
          <Detail label="File name" value={sample?.fileName} />
          <Detail label="Size" value={sample ? formatBytes(sample.size) : undefined} />
          <Detail label="Architecture" value={metadata?.architecture} />
          <Detail label="Endian" value={metadata?.endian} />
          <Detail label="Entry point" value={metadata?.entryPoint} />
          <Detail label="Compiler" value={metadata?.compiler} />
          <Detail label="MD5" value={analysis?.artifacts.hashes?.md5} mono />
          <Detail label="SHA-1" value={analysis?.artifacts.hashes?.sha1} mono />
          <Detail label="SHA-256" value={analysis?.artifacts.hashes?.sha256} mono wide />
        </div>
        <div className="px-2 pb-2">
          <div className="overflow-hidden rounded-md border">
            <ResultTable
              headers={['Section', 'Address', 'Size', 'Entropy']}
              rows={(metadata?.sections ?? []).map((section) => [
                section.name,
                section.address,
                formatBytes(section.size),
                formatEntropy(section.entropy),
              ])}
              empty="No sections extracted."
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function StringsView({ rows, search }: { rows: ExtractedString[]; search: string }) {
  const query = search.trim().toLowerCase();
  const filtered = rows.filter((row) => !query || lowerIncludes(row.value, query) || lowerIncludes(row.offset, query));
  return (
    <Panel title="Strings">
      <ResultTable
        headers={['Offset', 'Length', 'Encoding', 'Value']}
        rows={filtered.map((row) => [`0x${row.offset.toString(16)}`, row.length, row.encoding, row.value])}
        empty="No strings extracted."
      />
    </Panel>
  );
}

function SymbolsView({ imports, exports, search }: { imports: BinarySymbol[]; exports: BinarySymbol[]; search: string }) {
  const query = search.trim().toLowerCase();
  const rows = [
    ...imports.map((symbol) => ({ kind: 'Import', ...symbol })),
    ...exports.map((symbol) => ({ kind: 'Export', ...symbol })),
  ].filter((row) => !query || lowerIncludes(row.name, query) || lowerIncludes(row.library, query));
  return (
    <Panel title="Imports / Exports">
      <ResultTable
        headers={['Kind', 'Name', 'Library', 'Address']}
        rows={rows.map((row) => [row.kind, row.name, row.library ?? '', row.address ?? ''])}
        empty="No imports or exports extracted."
      />
    </Panel>
  );
}

function FunctionsView({ analysis, search }: { analysis: ThreatAnalysisResult | null; search: string }) {
  const query = search.trim().toLowerCase();
  const rows = (analysis?.artifacts.functions ?? []).filter(
    (row) => !query || lowerIncludes(row.name, query) || lowerIncludes(row.address, query),
  );
  return (
    <Panel title="Functions">
      <ResultTable
        headers={['Address', 'Name', 'Signature', 'Size', 'References']}
        rows={rows.map((row) => [
          row.address,
          row.name,
          row.signature ?? '',
          row.size ?? '',
          row.references.length,
        ])}
        empty="Run Ghidra analysis to populate functions."
      />
    </Panel>
  );
}

function DecompilerView({ rows }: { rows: GhidraDecompiledFunction[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = rows.find((row) => row.functionId === selectedId) ?? rows[0] ?? null;

  React.useEffect(() => {
    if (!selectedId && rows[0]) setSelectedId(rows[0].functionId);
  }, [rows, selectedId]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r">
        <PanelHeader title="Functions" />
        <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {rows.length === 0 && <p className="p-2 text-xs text-muted-foreground">Run Ghidra analysis to populate decompiled code.</p>}
          {rows.map((row) => (
            <button
              key={row.functionId}
              type="button"
              onClick={() => setSelectedId(row.functionId)}
              className={cn(
                'w-full rounded-sm px-2 py-1.5 text-left text-xs',
                selected?.functionId === row.functionId ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
              )}
            >
              <div className="truncate font-medium">{row.name}</div>
              <div className="font-mono text-xs text-muted-foreground">{row.address}</div>
            </button>
          ))}
        </div>
        </ScrollArea>
      </div>
      <div className="flex min-h-0 flex-col">
        <PanelHeader title={selected?.name ?? 'Decompiled Code'} />
        <div className="min-h-0 flex-1">
          <TextEditor
            height="100%"
            value={selected?.code ?? ''}
            options={{ readOnly: true }}
          />
        </div>
      </div>
    </div>
  );
}

function CallGraphView({ analysis }: { analysis: ThreatAnalysisResult | null }) {
  const graph = analysis?.artifacts.callGraph;
  const nodes = React.useMemo<Node[]>(
    () => (graph?.nodes ?? []).map((node, index) => ({
      id: node.id,
      position: { x: (index % 4) * 220, y: Math.floor(index / 4) * 120 },
      data: { label: `${node.label}\n${node.address}` },
    })),
    [graph],
  );
  const edges = React.useMemo<Edge[]>(
    () => (graph?.edges ?? []).map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    [graph],
  );

  if (!graph || graph.nodes.length === 0) {
    return <PlaceholderView title="Call Graph" body="Run Ghidra analysis to populate the function call graph." />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Call Graph" />
      <div className="min-h-0 flex-1">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

function YaraView({ analysis }: { analysis: ThreatAnalysisResult | null }) {
  const rows = analysis?.artifacts.yara ?? [];
  return (
    <Panel title="YARA">
      <ResultTable
        headers={['Rule Pack', 'Rule', 'Namespace', 'Tags']}
        rows={rows.map((row) => [row.rulePack ?? 'one-off rules', row.rule, row.namespace ?? '', row.tags.join(', ')])}
        empty="No YARA matches."
      />
    </Panel>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-md border bg-background px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 truncate text-xs font-medium">{value}</div>
    </div>
  );
}

function Detail({ label, value, mono, wide }: { label: string; value?: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={cn('min-w-0 rounded-md border bg-background px-2 py-1.5', wide && 'lg:col-span-2')}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 truncate text-xs', mono && 'font-mono text-[11px]')}>{value ?? 'n/a'}</div>
    </div>
  );
}

function ResultTable({ headers, rows, empty }: { headers: string[]; rows: Array<Array<React.ReactNode>>; empty: string }) {
  return (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-muted text-[11px] text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b px-2 py-1.5 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-2 py-6 text-center text-xs text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="max-w-[520px] truncate px-2 py-1.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlaceholderView({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={title} />
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="max-w-md text-center">
        <Network className="mx-auto mb-2 size-6 text-muted-foreground" />
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{body}</p>
        <Badge variant="outline" className="mt-2 text-[11px]">Planned</Badge>
      </div>
      </div>
    </div>
  );
}

function AnalysisLogPanel({ logs }: { logs: ThreatAnalysisLogEvent[] }) {
  const visibleLogs = logs.length > 0 ? logs : [];

  return (
    <div className="flex h-28 min-h-0 flex-col border-t">
      <div className="flex h-8 items-center justify-between border-b bg-muted px-3 py-1.5">
        <span className="text-xs font-medium">Analysis Log</span>
        <span className="text-[11px] text-muted-foreground">{visibleLogs.length} events</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 p-2 font-mono text-[11px]">
          {visibleLogs.length === 0 && (
            <div className="text-muted-foreground">No analysis events yet.</div>
          )}
          {visibleLogs.map((log, index) => (
            <div key={`${log.runId}-${index}`} className="grid grid-cols-[135px_minmax(0,1fr)] gap-2">
              <span className="text-muted-foreground">{formatDate(log.timestamp)}</span>
              <span className="truncate">{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title={title} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="flex h-10 items-center justify-between border-b bg-muted px-3 py-2">
      <span className="text-xs font-medium">{title}</span>
    </div>
  );
}
