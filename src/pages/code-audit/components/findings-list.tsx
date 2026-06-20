import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Finding } from '@/stores/code-audit';

interface FindingsListProps {
  findings: Finding[];
  selectedFindingId: string | null;
  onSelectFinding: (id: string) => void;
}

const SEVERITY_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
  info: 'outline',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
  info: 'INFO',
};

const CATEGORY_LABELS: Record<string, string> = {
  hardcoded_secret: 'Secret',
  vulnerable_dependency: 'Dependency',
  risky_pattern: 'Pattern',
};

export function FindingsList({
  findings,
  selectedFindingId,
  onSelectFinding,
}: FindingsListProps) {
  if (findings.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y">
        {findings.map((finding) => (
          <button
            key={finding.id}
            onClick={() => onSelectFinding(finding.id)}
            className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
              selectedFindingId === finding.id ? 'bg-muted' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <Badge
                variant={SEVERITY_VARIANTS[finding.severity] || 'outline'}
                className="shrink-0 text-[10px] px-1.5 py-0 h-5"
              >
                {SEVERITY_LABELS[finding.severity] || finding.severity.toUpperCase()}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {finding.title}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {finding.filePath}
                  {finding.line ? `:${finding.line}` : ''}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {CATEGORY_LABELS[finding.category] || finding.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {finding.id}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
