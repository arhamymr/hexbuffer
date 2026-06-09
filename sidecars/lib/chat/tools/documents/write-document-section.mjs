import { z } from 'zod';

export const writeDocumentSectionDef = {
  description: 'Write or append content to a recon document section. Use to save findings, notes, or report content the user wants to keep.',
  inputSchema: z.object({
    documentId: z.string().optional().describe('Document ID to write to. Omit to use the currently active document.'),
    sectionKey: z.string().optional().describe('Key of an existing custom section to update. Omit to create a new section.'),
    title: z.string().optional().describe('Title for the new section when creating one, e.g. "Findings" or "Notes".'),
    content: z.string().describe('The markdown content to write into the document.'),
    mode: z.enum(['append', 'replace']).optional().describe('"append" adds after existing content; "replace" overwrites. Defaults to "append".'),
  }),
  execute: async ({ documentId, sectionKey, title, content, mode }, ctx) => {
    ctx.emitAction({
      action: 'write_document',
      payload: {
        documentId: documentId || null,
        sectionKey: sectionKey || null,
        title: title || null,
        content,
        mode: mode || 'append',
      },
    });
    return { success: true, message: 'Document content saved.' };
  },
};
