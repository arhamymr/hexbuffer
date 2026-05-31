import { ChevronDown, FileText, Folder, FolderOpen, Server, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ExternalLink, Send, Copy, Trash2, RotateCcw } from 'lucide-react';
import { useBruteForceStore } from '@/stores/bruto-force';
import { useRepeaterStore } from '@/stores/repeater';
import { buildHttpCurlCommand, buildRawHttpRequest } from '@/lib/http-message';
import { copyText } from '@/lib/clipboard';
import { createDefaultAttackConfig, findRequestPayloadPositions } from '@/pages/brute-force/types';
import { type ReconDocument, type SavedApiEntry } from '../types';
import { type DocumentSectionKey } from '../constants';
import {
  EXPLORER_SECTIONS,
  getSectionDefinition,
  type EditorFileId,
} from '../lib/editor-files';

interface DocumentsExplorerProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId;
  isApiFolderOpen: boolean;
  onApiFolderOpenChange: (isOpen: boolean) => void;
  onOpenFile: (fileId: EditorFileId) => void;
  onOpenApiEntry: (entryId: string) => void;
  onDeleteApiEntry: (entryId: string) => void;
  onRemoveBuiltInSection: (sectionKey: DocumentSectionKey) => void;
  onRestoreBuiltInSection: (sectionKey: DocumentSectionKey) => void;
  onAddCustomSection: () => void;
  onRemoveCustomSection: (sectionKey: string) => void;
}

export function DocumentsExplorer({
  activeDocument,
  activeFileId,
  isApiFolderOpen,
  onApiFolderOpenChange,
  onOpenFile,
  onOpenApiEntry,
  onDeleteApiEntry,
  onRemoveBuiltInSection,
  onRestoreBuiltInSection,
  onAddCustomSection,
  onRemoveCustomSection,
}: DocumentsExplorerProps) {
  const navigate = useNavigate();

  const handleCopyCurlCommand = (entry: SavedApiEntry) => {
    const curl = buildHttpCurlCommand({
      method: entry.method,
      url: entry.url,
      headers: entry.headers,
      body: entry.requestBody ?? '',
    });
    copyText(curl).then((ok) => {
      if (ok) toast.success('Copied as curl command (bash)');
      else toast.error('Failed to copy as curl command (bash)');
    });
  };

  const handleCopyUrl = (entry: SavedApiEntry) => {
    copyText(entry.url).then((ok) => {
      if (ok) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    });
  };

  const handleOpenInBruteForce = (entry: SavedApiEntry) => {
    const baseRequest = {
      method: entry.method,
      url: entry.url,
      headers: entry.headers,
      body: entry.requestBody ?? '',
      follow_redirects: true,
      max_hops: 10,
    };
    const config = {
      ...createDefaultAttackConfig(),
      name: `${entry.method} ${entry.path || entry.url}`,
      base_request: baseRequest,
      positions: findRequestPayloadPositions(baseRequest),
    };
    useBruteForceStore.getState().addAttackTab(config);
    navigate('/brute-force');
    toast.success('Opened in Brute Force');
  };

  const handleOpenInRepeater = (entry: SavedApiEntry) => {
    useRepeaterStore.getState().addRequestTab({
      raw: buildRawHttpRequest({
        method: entry.method,
        url: entry.url,
        headers: entry.headers,
        body: entry.requestBody ?? '',
      }),
      url: entry.url,
    });
    navigate('/repeater');
    toast.success('Sent to Repeater');
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-r bg-muted/25">
      <div className="flex h-8 shrink-0 items-center px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Explorer
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-3">
        <div className="mt-1 space-y-0.5">
          {EXPLORER_SECTIONS.filter((key) => !activeDocument.removedBuiltInSections.includes(key)).map((sectionKey) => {
            const section = getSectionDefinition(sectionKey);
            const isActive = activeFileId === sectionKey;

            return (
              <ContextMenu key={sectionKey}>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onOpenFile(sectionKey)}
                    className={cn(
                      'flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted',
                      isActive && 'bg-muted text-foreground'
                    )}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{section?.title.toLowerCase()}.md</span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onRemoveBuiltInSection(sectionKey)}>
                    <X className="mr-2 h-4 w-4" /> Remove section
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          {activeDocument.removedBuiltInSections.map((sectionKey) => {
            const section = getSectionDefinition(sectionKey);

            return (
              <ContextMenu key={sectionKey}>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onRestoreBuiltInSection(sectionKey)}
                    className="flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs text-muted-foreground opacity-50 hover:bg-muted"
                  >
                    <RotateCcw className="size-3" />
                    <span className="truncate">{section?.title.toLowerCase()}.md (removed)</span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onRestoreBuiltInSection(sectionKey)} className='text-xs'>
                    <RotateCcw className="size-3" /> Restore section
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          {activeDocument.customSections.map((section) => {
            const isActive = activeFileId === `custom:${section.key}`;

            return (
              <ContextMenu key={section.key}>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onOpenFile(`custom:${section.key}`)}
                    className={cn(
                      'flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted',
                      isActive && 'bg-muted text-foreground'
                    )}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{section.title.toLowerCase()}.md</span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onRemoveCustomSection(section.key)} variant="destructive" className='text-xs'>
                    <Trash2 className="mr-2 size-3" /> Delete section
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          <button
            type="button"
            onClick={onAddCustomSection}
            className="flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            <span className="truncate">add section</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onApiFolderOpenChange(!isApiFolderOpen);
              onOpenFile('api');
            }}
            className={cn(
              'flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted',
              activeFileId === 'api' && 'bg-muted text-foreground'
            )}
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform',
                !isApiFolderOpen && '-rotate-90'
              )}
            />
            {isApiFolderOpen ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="truncate">api</span>
          </button>

          {isApiFolderOpen && (
            <div className="space-y-0.5 pl-5">
              {activeDocument.apiEntries.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  No saved requests
                </div>
              ) : (
                activeDocument.apiEntries.map((entry) => {
                  const isActive = activeFileId === `api:${entry.id}`;

                  return (
                    <ContextMenu key={entry.id}>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onOpenApiEntry(entry.id)}
                          className={cn(
                            'flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted',
                            isActive && 'bg-muted text-foreground'
                          )}
                          title={entry.url}
                        >
                          <Server className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate font-mono">{entry.path}</span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleCopyCurlCommand(entry)} className='text-xs'>
                          <Copy className="mr-2 size-3" /> Copy as curl command (bash)
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleCopyUrl(entry)} className='text-xs'>
                          <Copy className="mr-2 size-3" /> Copy URL
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => handleOpenInBruteForce(entry)} className='text-xs'>
                          <ExternalLink className="mr-2 h-4 w-4" /> Open in Brute Force
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleOpenInRepeater(entry)} className='text-xs'>
                          <Send className="mr-2 h-4 w-4" /> Send to Repeater
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => onDeleteApiEntry(entry.id)} variant="destructive" className='text-xs'>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
