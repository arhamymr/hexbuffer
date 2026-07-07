import * as React from 'react';
import { type DocumentTemplateId } from '../../constants';

interface UseDocumentTemplateDialogProps {
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: DocumentTemplateId) => void;
}

export function useDocumentTemplateDialog({
  onOpenChange,
  onSelectTemplate,
}: UseDocumentTemplateDialogProps) {
  const handleSelectTemplate = React.useCallback((templateId: DocumentTemplateId) => {
    onSelectTemplate(templateId);
    onOpenChange(false);
  }, [onSelectTemplate, onOpenChange]);

  return {
    handleSelectTemplate,
  };
}
