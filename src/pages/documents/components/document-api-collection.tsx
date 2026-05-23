import { Loader2, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TextEditor } from '@/components/ui/text-editor';
import { buildRawHttpRequest, buildRawHttpResponse } from '@/lib/http-message';
import { type RepeaterResponse } from '@/pages/repeater/types';
import { type SavedApiEntry } from '../types';

interface DocumentApiCollectionProps {
  entries: SavedApiEntry[];
  selectedEntryId: string | null;
  response: RepeaterResponse | null;
  isLoading: boolean;
  error: string | null;
  onSelectEntry: (entryId: string) => void;
  onFetchEntry: () => void;
}

function formatSavedTime(value: string) {
  return new Date(value).toLocaleString();
}

export function DocumentApiCollection({
  entries,
  selectedEntryId,
  response,
  isLoading,
  error,
  onSelectEntry,
  onFetchEntry,
}: DocumentApiCollectionProps) {
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0] ?? null;

  return (
    <section className="rounded-lg border bg-card shadow-xs lg:col-span-2">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold">Saved APIs</h2>
        <p className="text-xs text-muted-foreground">
          Requests saved from HTTP History for later review and replay.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="p-4">
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No APIs saved yet. Right-click a request in HTTP History and choose “Save to Documents”.
          </div>
        </div>
      ) : (
        <div className="grid min-h-[360px] md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-r">
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
              API list
            </div>
            <div className="max-h-[520px] overflow-auto">
              {entries.map((entry) => {
                const isSelected = entry.id === selectedEntry?.id;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelectEntry(entry.id)}
                    className={`w-full border-b px-3 py-3 text-left transition-colors hover:bg-muted/50 ${
                      isSelected ? 'bg-muted/60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{entry.method}</Badge>
                      {entry.responseStatus !== null && (
                        <Badge variant="outline">{entry.responseStatus}</Badge>
                      )}
                    </div>
                    <div className="mt-2 truncate font-mono text-xs" title={entry.path}>
                      {entry.path}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground" title={entry.host}>
                      {entry.host}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedEntry && (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedEntry.method}</Badge>
                    {selectedEntry.responseStatus !== null && (
                      <Badge variant="outline">{selectedEntry.responseStatus}</Badge>
                    )}
                  </div>
                  <p className="mt-2 truncate font-mono text-xs" title={selectedEntry.url}>
                    {selectedEntry.url}
                  </p>
                </div>
                <Button size="xs" type="button" onClick={onFetchEntry} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Fetch
                </Button>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-2">
                <div className="min-w-0">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Request</div>
                  <div className="h-72 overflow-hidden rounded-md border bg-background">
                    <TextEditor
                      height="100%"
                      language="plaintext"
                      value={buildRawHttpRequest({
                        method: selectedEntry.method,
                        url: selectedEntry.url,
                        headers: selectedEntry.headers,
                        body: selectedEntry.requestBody ?? '',
                      })}
                      options={{
                        readOnly: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Host: {selectedEntry.host}</span>
                    <span>Path: {selectedEntry.path}</span>
                    <span>Saved: {formatSavedTime(selectedEntry.savedAt)}</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Latest fetch</div>
                  {isLoading ? (
                    <div className="flex h-72 items-center justify-center rounded-md border text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending request...
                    </div>
                  ) : error ? (
                    <div className="flex h-72 items-center justify-center rounded-md border border-destructive/40 p-4 text-sm text-destructive">
                      {error}
                    </div>
                  ) : response ? (
                    <>
                      <div className="mb-2 flex items-center gap-2 text-xs">
                        <Badge variant={response.status >= 400 ? 'destructive' : 'outline'}>
                          {response.status} {response.status_text}
                        </Badge>
                        <span className="text-muted-foreground">{response.time_ms}ms</span>
                      </div>
                      <div className="h-72 overflow-hidden rounded-md border bg-background">
                        <TextEditor
                          height="100%"
                          language="html"
                          value={buildRawHttpResponse(response)}
                          options={{
                            readOnly: true,
                            scrollBeyondLastLine: false,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                      Fetch this saved API to view a fresh response.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
