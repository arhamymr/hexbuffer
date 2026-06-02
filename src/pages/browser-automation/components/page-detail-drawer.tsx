'use client';

import { Copy, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PAGE_STATUS_LABELS } from '../constants';
import type { CrawlPage } from '../types';

interface PageDetailDrawerProps {
  page: CrawlPage | null;
  onClose: () => void;
  onCopyUrl: (page: CrawlPage) => void;
  onOpenPage: (page: CrawlPage) => void;
  onToggleInteresting: (pageId: string) => void;
}

function DetailRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value ?? '-'}</span>
    </div>
  );
}

export function PageDetailDrawer({
  page,
  onClose,
  onCopyUrl,
  onOpenPage,
  onToggleInteresting,
}: PageDetailDrawerProps) {
  return (
    <Drawer open={Boolean(page)} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="sm:max-w-xl">
        {page && (
          <>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <span className="min-w-0 truncate">{page.title || page.url}</span>
                {page.interesting && (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300">
                    Interesting
                  </Badge>
                )}
              </DrawerTitle>
              <DrawerDescription className="font-mono">{page.url}</DrawerDescription>
            </DrawerHeader>

            <ScrollArea className="min-h-0 flex-1 px-4">
              <div className="space-y-4 pb-4">
                <div className="rounded-md border p-3">
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

                <div className="rounded-md border p-3">
                  <div className="mb-2 text-sm font-medium">AI Summary</div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {page.aiSummary || 'No AI summary is available for this page yet.'}
                  </p>
                </div>
              </div>
            </ScrollArea>

            <DrawerFooter className="grid grid-cols-2 sm:grid-cols-3">
              <Button variant="outline" onClick={() => onOpenPage(page)}>
                <ExternalLink className="h-4 w-4" />
                Open
              </Button>
              <Button variant="outline" onClick={() => onCopyUrl(page)}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button variant={page.interesting ? 'secondary' : 'outline'} onClick={() => onToggleInteresting(page.id)}>
                <Star className="h-4 w-4" />
                {page.interesting ? 'Saved' : 'Mark'}
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
