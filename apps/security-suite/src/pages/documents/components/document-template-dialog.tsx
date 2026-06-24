import { FileCode2, FilePenLine, FlaskConical, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DOCUMENT_TEMPLATES,
  type DocumentTemplate,
  type DocumentTemplateId,
} from '../constants';

import { useDocumentTemplateDialog } from './hooks/use-document-template-dialog';

interface DocumentTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: DocumentTemplateId) => void;
}

const TEMPLATE_ICONS: Record<DocumentTemplateId, typeof FilePenLine> = {
  developer: FileCode2,
  qa: FlaskConical,
  securityResearcher: ShieldCheck,
  blank: FilePenLine,
};

function TemplateOption({
  template,
  onSelect,
}: {
  template: DocumentTemplate;
  onSelect: (templateId: DocumentTemplateId) => void;
}) {
  const Icon = TEMPLATE_ICONS[template.id];

  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto justify-start gap-3 px-3 py-3 text-left"
      onClick={() => onSelect(template.id)}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block text-xs font-medium">{template.title}</span>
        <span className="mt-1 block whitespace-normal text-[11px] leading-4 text-muted-foreground">
          {template.description}
        </span>
      </span>
    </Button>
  );
}

export function DocumentTemplateDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: DocumentTemplateDialogProps) {
  const { handleSelectTemplate } = useDocumentTemplateDialog({
    onOpenChange,
    onSelectTemplate,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>
            Choose a report template to start with.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOCUMENT_TEMPLATES.map((template) => (
            <TemplateOption
              key={template.id}
              template={template}
              onSelect={handleSelectTemplate}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
