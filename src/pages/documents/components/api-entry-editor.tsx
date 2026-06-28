import * as React from 'react';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TextEditor } from '@/components/ui/text-editor';
import { buildRawHttpRequest, buildRawHttpResponse } from '@/lib/http-message';
import { type RepeaterResponse } from '@/pages/repeater/types';
import { type ReconDocument, type SavedApiEntry } from '../types';

import { useApiEntryEditor } from './hooks/use-api-entry-editor';

interface ApiEntryEditorProps {
  document: ReconDocument;
  entry: SavedApiEntry;
  response: RepeaterResponse | null;
  isLoading: boolean;
  error: string | null;
  editError: string | null;
  onChangeRawRequest: (entryId: string, rawRequest: string) => void;
}

export function ApiEntryEditor({
  document,
  entry,
  response,
  isLoading,
  error,
  editError,
  onChangeRawRequest,
}: ApiEntryEditorProps) {
  const {
    rawRequest,
    handleRawRequestChange,
    formattedSavedTime,
  } = useApiEntryEditor({ entry, onChangeRawRequest });

  return (
    <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
      <ResizablePanel defaultSize={58} minSize={28}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-8 shrink-0 items-center justify-between border-b px-3 text-xs text-muted-foreground">
            <span className="truncate font-mono">{entry.url}</span>
            <span className="ml-3 shrink-0">
              {editError ? (
                <span className="text-destructive">{editError}</span>
              ) : (
                <>Saved {formattedSavedTime}</>
              )}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <TextEditor
              path={`${document.id}/api/${entry.id}.http`}
              value={rawRequest}
              onChange={handleRawRequestChange}
              options={{}}
            />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={42} minSize={20}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b px-3 text-xs text-muted-foreground">
            <span>response</span>
            {response && (
              <>
                <Badge variant={response.status >= 400 ? 'destructive' : 'outline'}>
                  {response.status} {response.status_text}
                </Badge>
                <span>{response.time_ms}ms</span>
              </>
            )}
          </div>
          <div className="min-h-0 flex-1">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <SpinnerGapIcon className="mr-2 h-4 w-4 animate-spin" />
                Sending request...
              </div>
            ) : error ? (
              <TextEditor
                path={`${document.id}/api/${entry.id}.error.txt`}
                value={error}
                options={{ readOnly: true }}
              />
            ) : response ? (
              <TextEditor
                path={`${document.id}/api/${entry.id}.response.http`}
                value={buildRawHttpResponse(response)}
                options={{ readOnly: true }}
              />
            ) : (
              <TextEditor
                path={`${document.id}/api/${entry.id}.response.txt`}
                value="Fetch this saved API to view a fresh response."
                options={{ readOnly: true }}
              />
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
