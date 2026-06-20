import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Finding, AiExplanation } from '@/stores/code-audit';

interface FindingDetailProps {
  finding: Finding | null;
  explanation: AiExplanation | null;
}

const SEVERITY_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
  info: 'outline',
};

export function FindingDetail({ finding, explanation }: FindingDetailProps) {
  if (!finding) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Select a finding to view details
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant={SEVERITY_VARIANTS[finding.severity] || 'outline'}
          >
            {finding.severity.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">{finding.id}</span>
          <span className="text-xs text-muted-foreground">{finding.ruleId}</span>
        </div>
        <h3 className="text-sm font-semibold">{finding.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {finding.filePath}
          {finding.line ? `:${finding.line}` : ''}
          {finding.column ? `:${finding.column}` : ''}
        </p>
      </div>

      {/* Content tabs */}
      <Tabs defaultValue="snippet" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 shrink-0">
          <TabsTrigger value="snippet" className="text-xs">Snippet</TabsTrigger>
          <TabsTrigger value="explanation" className="text-xs" disabled={!explanation}>
            AI Explanation
          </TabsTrigger>
          <TabsTrigger value="fix" className="text-xs" disabled={!explanation?.fixSuggestion}>
            Fix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="snippet" className="flex-1 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full">
            <pre className="text-xs font-mono bg-muted rounded-md p-3 whitespace-pre-wrap break-all">
              {finding.snippet || '(no snippet available)'}
            </pre>
            {finding.matchText && (
              <div className="mt-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Matched:
                </div>
                <code className="text-xs font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded px-2 py-1 break-all">
                  {finding.matchText}
                </code>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="explanation" className="flex-1 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full">
            {explanation?.explanation ? (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {explanation.explanation}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                AI explanation not yet available. Run the audit with an AI provider configured.
              </div>
            )}
            {explanation?.severityRationale && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <div className="text-xs font-medium mb-1">Severity Rationale</div>
                <div className="text-xs text-muted-foreground">
                  {explanation.severityRationale}
                </div>
              </div>
            )}
            {explanation?.aiSeverity && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">AI-assessed severity: </span>
                <Badge
                  variant={SEVERITY_VARIANTS[explanation.aiSeverity] || 'outline'}
                  className="text-[10px]"
                >
                  {explanation.aiSeverity.toUpperCase()}
                </Badge>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="fix" className="flex-1 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full">
            {explanation?.fixSuggestion ? (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {explanation.fixSuggestion}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Fix suggestion not yet available.
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
