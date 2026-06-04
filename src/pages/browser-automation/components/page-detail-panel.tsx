'use client';

import { convertFileSrc } from '@tauri-apps/api/core';
import { useCallback, useState } from 'react';
import { Copy, ExternalLink, FileCode2, ImageIcon, Loader2, Maximize2, Star } from 'lucide-react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextEditor } from '@/components/ui/text-editor';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { copyText } from '@/lib/clipboard';
import { openUrl } from '@tauri-apps/plugin-opener';
import { PAGE_STATUS_LABELS } from '../constants';
import type { CrawlPage } from '../types';

interface PageDetailPanelProps {
  page: CrawlPage | null;
}

function DetailRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-2 border-b py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value ?? '-'}</span>
    </div>
  );
}

function ArtifactActions({ label, path, onView }: { label: string; path?: string; onView?: () => void }) {
  if (!path) return null;

  return (
    <div className="space-y-1 rounded-md border p-2">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        {label}
      </div>
      <p className="break-all font-mono text-[11px] leading-4 text-muted-foreground">{path}</p>
      <div className="flex gap-1.5">
        {onView && (
          <Button variant="outline" size="xs" onClick={onView}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="outline" size="xs" onClick={() => copyText(path)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function PageDetailPanel({ page }: PageDetailPanelProps) {
  const session = useBrowserAutomationStore((s) => s.getActiveTab()?.session ?? null);
  const markPageInteresting = useBrowserAutomationStore((s) => s.markPageInteresting);

  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [htmlViewerOpen, setHtmlViewerOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [htmlLoading, setHtmlLoading] = useState(false);

  const base = session?.targetUrl?.replace(/\/$/, '') ?? '';

  function handleCopyUrl() {
    if (!page) return;
    copyText(page.url.startsWith('http') ? page.url : `${base}${page.url}`);
  }

  async function handleOpenPage() {
    if (!page) return;
    const url = page.url.startsWith('http') ? page.url : `${base}${page.url}`;
    try {
      await openUrl(url);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  const handleViewHtml = useCallback(async () => {
    if (!page?.renderedHtmlPath) return;
    setHtmlLoading(true);
    setHtmlViewerOpen(true);
    try {
      const content = await readTextFile(page.renderedHtmlPath);
      setHtmlContent(content);
    } catch {
      setHtmlContent(null);
    } finally {
      setHtmlLoading(false);
    }
  }, [page?.renderedHtmlPath]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Select a page to view details</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-medium">{page.title || page.url}</h3>
          {page.interesting && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300 shrink-0">
              Interesting
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{page.url}</p>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3">
        <div className="space-y-3 py-3">
          <div className="rounded-md border p-2.5">
            <DetailRow label="URL" value={page.url} />
            <DetailRow label="Title" value={page.title} />
            <DetailRow label="Status" value={PAGE_STATUS_LABELS[page.status]} />
            <DetailRow label="Depth" value={page.depth} />
            <DetailRow label="Parent URL" value={page.parentUrl} />
            <DetailRow label="HTTP Status" value={page.httpStatus} />
            <DetailRow label="Links Found" value={page.linksFound} />
            <DetailRow label="Forms Found" value={page.formsFound} />
            <DetailRow label="Discovered At" value={new Date(page.discoveredAt).toLocaleString()} />
            <DetailRow
              label="Visited At"
              value={page.visitedAt ? new Date(page.visitedAt).toLocaleString() : undefined}
            />
          </div>

          <div className="rounded-md border p-2.5">
            <div className="mb-1.5 text-xs font-medium">Summary</div>
            <p className="text-xs leading-5 text-muted-foreground">
              {page.aiSummary || 'No summary is available for this page yet.'}
            </p>
          </div>

          {(page.screenshotPath || page.renderedHtmlPath) && (
            <div className="space-y-2 rounded-md border p-2.5">
              <div className="text-xs font-medium">Artifacts</div>
              {page.screenshotPath && (
                <button
                  type="button"
                  className="block overflow-hidden rounded-md border bg-muted/30"
                  onClick={() => setScreenshotOpen(true)}
                >
                  <img
                    src={convertFileSrc(page.screenshotPath)}
                    alt={`Screenshot of ${page.title || page.url}`}
                    className="max-h-48 w-full object-cover object-top"
                  />
                </button>
              )}
              <ArtifactActions label="Screenshot" path={page.screenshotPath} />
              <ArtifactActions label="Rendered HTML" path={page.renderedHtmlPath}onView={handleViewHtml} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t p-2">
        <div className="flex gap-1.5">
          <Button variant="outline" size="xs" onClick={handleOpenPage}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="xs" onClick={handleCopyUrl}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={page.interesting ? 'secondary' : 'outline'}
            size="xs"
            onClick={() => markPageInteresting(page.id)}
          >
            <Star className="h-3.5 w-3.5" />
            {page.interesting ? 'Saved' : 'Mark'}
          </Button>
        </div>
      </div>

      <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="truncate text-sm font-mono">
              {page.screenshotPath?.split('/').pop() ?? 'Screenshot'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-auto rounded-md border bg-muted/20">
            <img
              src={page.screenshotPath ? convertFileSrc(page.screenshotPath) : ''}
              alt={`Screenshot of ${page.title || page.url}`}
              className="object-contain object-top" 
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={htmlViewerOpen} onOpenChange={setHtmlViewerOpen}>
        <DialogContent className="sm:max-w-[90vw] h-[85vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="truncate text-sm font-mono">
              {page.renderedHtmlPath?.split('/').pop() ?? 'Rendered HTML'}
            </DialogTitle>
          </DialogHeader>
          {htmlLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="source" className="flex flex-1 flex-col min-h-0">
              <TabsList className="shrink-0">
                <TabsTrigger value="source">Source</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="source" className="flex-1 min-h-0">
                <TextEditor
                  value={htmlContent ?? ''}
                  language="html"
                  options={{ readOnly: true }}
                />
              </TabsContent>
              <TabsContent value="preview" className="flex-1 min-h-0">
                <iframe
                  srcDoc={htmlContent ?? ''}
                  className="w-full h-full border-0 rounded-md"
                  sandbox="allow-scripts"
                  title="HTML Preview"
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
