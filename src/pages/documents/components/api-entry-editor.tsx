import * as React from 'react';
import { Loader2 } from 'lucide-react';
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

interface ApiEntryEditorProps {
  document: ReconDocument;
  entry: SavedApiEntry;
  response: RepeaterResponse | null;
  isLoading: boolean;
  error: string | null;
  editError: string | null;
  onChangeRawRequest: (entryId: string, rawRequest: string) => void;
}

function formatSavedTime(value: string) {
  return new Date(value).toLocaleString();
}

const requestEditorOptions = {
  fontSize: 13,
  lineHeight: 20,
  fontFamily: 'Geist Mono, Menlo, Monaco, Consolas, monospace',
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  minimap: { enabled: true },
} as const;

const responseEditorOptions = {
  readOnly: true,
  fontSize: 13,
  lineHeight: 20,
  fontFamily: 'Geist Mono, Menlo, Monaco, Consolas, monospace',
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  minimap: { enabled: true },
} as const;

export function ApiEntryEditor({
  document,
  entry,
  response,
  isLoading,
  error,
  editError,
  onChangeRawRequest,
}: ApiEntryEditorProps) {
  const savedRawRequest = React.useMemo(
    () =>
      buildRawHttpRequest({
        method: entry.method,
        url: entry.url,
        headers: entry.headers,
        body: entry.requestBody ?? '',
      }),
    [entry.headers, entry.method, entry.requestBody, entry.url]
  );
  const [rawRequest, setRawRequest] = React.useState(savedRawRequest);

  React.useEffect(() => {
    setRawRequest(savedRawRequest);
  }, [entry.id, savedRawRequest]);

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
                <>Saved {formatSavedTime(entry.savedAt)}</>
              )}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <TextEditor
              path={`${document.id}/api/${entry.id}.http`}
              language="plaintext"
              value={rawRequest}
              onChange={(value) => {
                const nextValue = value ?? '';
                setRawRequest(nextValue);
                onChangeRawRequest(entry.id, nextValue);
              }}
              options={requestEditorOptions}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending request...
              </div>
            ) : error ? (
              <TextEditor
                path={`${document.id}/api/${entry.id}.error.txt`}
                language="plaintext"
                value={error}
                options={responseEditorOptions}
              />
            ) : response ? (
              <TextEditor
                path={`${document.id}/api/${entry.id}.response.http`}
                language="html"
                value={buildRawHttpResponse(response)}
                options={responseEditorOptions}
              />
            ) : (
              <TextEditor
                path={`${document.id}/api/${entry.id}.response.txt`}
                language="plaintext"
                value="Fetch this saved API to view a fresh response."
                options={responseEditorOptions}
              />
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
