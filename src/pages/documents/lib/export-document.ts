import { jsPDF } from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { type ReconDocument } from '../types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdownToText(markdown: string): string {
  return markdown
    .replace(/^### (.+)$/gm, '$1')
    .replace(/^## (.+)$/gm, '$1')
    .replace(/^# (.+)$/gm, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\- (.+)$/gm, '• $1')
    .replace(/^\d+\. (.+)$/gm, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^---$/gm, '')
    .trim();
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\-_\s]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50) || 'document-export';
}

export async function exportDocumentToPdf(document: ReconDocument): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const TITLE = document.title.trim() || 'Untitled Recon Document';
  const createdDate = formatDate(document.createdAt);
  const updatedDate = formatDate(document.updatedAt);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(TITLE, contentWidth);
  doc.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 8 + 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Created: ${createdDate}  |  Updated: ${updatedDate}`, margin, yPosition);
  yPosition += 12;

  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  doc.setTextColor(0);

  for (const customSection of document.customSections) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(customSection.title, margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (customSection.content.trim()) {
      const renderedContent = renderMarkdownToText(customSection.content);
      const contentLines = doc.splitTextToSize(renderedContent, contentWidth);
      for (const line of contentLines) {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      }
    } else {
      doc.setTextColor(150);
      doc.text('No content', margin, yPosition);
      doc.setTextColor(0);
      yPosition += 5;
    }

    yPosition += 6;
  }

  doc.setTextColor(0);

  const filename = sanitizeFilename(TITLE);
  const defaultPath = `${filename}.pdf`;

  const savePath = await save({
    title: 'Export Document as PDF',
    defaultPath,
    filters: [
      {
        name: 'PDF Document',
        extensions: ['pdf'],
      },
    ],
  });

  if (!savePath) {
    return;
  }

  const pdfOutput = doc.output('arraybuffer');
  await writeFile(savePath, new Uint8Array(pdfOutput));
}
