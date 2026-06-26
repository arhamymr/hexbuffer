import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAutomationStore } from '@/stores/automation';
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from '../templates';
import {
  Activity,
  Bell,
  Bug,
  Clock,
  Code,
  Download,
  FileCode,
  FileText,
  Filter,
  Globe,
  Hash,
  Network,
  Plus,
  Radio,
  ScanLine,
  Search,
  Shield,
  Sparkles,
  type LucideIcon,
  Zap,
} from 'lucide-react';

const CATEGORY_LABELS: Record<WorkflowTemplate['category'], string> = {
  monitoring: 'Monitoring',
  security: 'Security',
  crawl: 'Crawl',
  general: 'General',
};

const CATEGORY_ORDER: WorkflowTemplate['category'][] = ['monitoring', 'security', 'crawl', 'general'];

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  Activity,
  Bell,
  Bug,
  Clock,
  Code,
  Download,
  FileCode,
  FileText,
  Filter,
  Globe,
  Hash,
  Network,
  Radio,
  ScanLine,
  Search,
  Shield,
  Sparkles,
  Zap,
};

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatesDialog({ open, onOpenChange }: TemplatesDialogProps) {
  const createWorkflow = useAutomationStore((s) => s.createWorkflow);
  const createWorkflowFromTemplate = useAutomationStore((s) => s.createWorkflowFromTemplate);

  const handleBlank = () => {
    createWorkflow();
    onOpenChange(false);
  };

  const handleTemplate = (templateId: string) => {
    createWorkflowFromTemplate(templateId);
    onOpenChange(false);
  };

  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      templates: WORKFLOW_TEMPLATES.filter((t) => t.category === cat),
    }))
    .filter((g) => g.templates.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-base">Create Workflow</DialogTitle>
          <DialogDescription className="text-xs">
            Start from a blank workflow or choose a template to get started quickly.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          {/* Blank workflow option */}
          <button
            onClick={handleBlank}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg border-2 border-dashed p-4 mb-4',
              'text-left transition-colors hover:bg-accent hover:border-primary/50'
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Plus className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Blank Workflow</p>
              <p className="text-xs text-muted-foreground">
                Start from scratch with an empty canvas
              </p>
            </div>
          </button>

          {/* Template groups */}
          {grouped.map((group) => (
            <div key={group.category} className="mb-5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="grid gap-2">
                {group.templates.map((template) => {
                  const Icon = TEMPLATE_ICONS[template.icon] ?? Zap;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplate(template.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3',
                        'text-left transition-colors hover:bg-accent hover:border-primary/50'
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {template.nodes.length} nodes · {template.edges.length} connections
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
