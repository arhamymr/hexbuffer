import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { TextEditor } from '@/components/ui/text-editor';
import { CheckCircle, XCircle } from 'lucide-react';
import type { ForgeResponse, TestResult } from '@/stores/collections';
import { cn } from '@/lib/utils';

interface ForgeResponseViewProps {
  isLoading: boolean;
  error: string | null;
  response: ForgeResponse | null;
  testResults: TestResult[];
  testScript: string;
  activeResTab: string;
  onResTabChange: (tab: string) => void;
  getFormattedBody: () => string;
}

export function ForgeResponseView({
  isLoading,
  error,
  response,
  testResults,
  testScript,
  activeResTab,
  onResTabChange,
  getFormattedBody,
}: ForgeResponseViewProps) {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs font-medium text-muted-foreground">
            Executing endpoint request...
          </span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-4 text-center">
          <XCircle className="h-8 w-8 text-destructive mb-2" />
          <span className="text-sm font-semibold text-destructive">Execution Failed</span>
          <span className="text-xs text-muted-foreground max-w-md mt-1 font-mono bg-destructive/10 p-2 rounded border border-destructive/20">
            {error}
          </span>
        </div>
      );
    }

    if (response) {
      return (
        <div className="h-full flex flex-col min-h-0">
          {/* Status bar */}
          <div className="flex items-center space-x-4 border-b pb-2 shrink-0 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-muted-foreground uppercase font-bold">Status:</span>
              <span
                className={`font-semibold px-1 rounded ${
                  response.status >= 200 && response.status < 300
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {response.status} {response.statusText}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-muted-foreground uppercase font-bold">Time:</span>
              <span className="font-semibold text-foreground">{response.timeMs} ms</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-muted-foreground uppercase font-bold">Size:</span>
              <span className="font-semibold text-foreground">
                {new Blob([response.body]).size} bytes
              </span>
            </div>
          </div>

          {/* Response body & details tab */}
          <div className="flex-1 flex flex-col min-h-0 mt-2">
            <ButtonGroup orientation="horizontal" className="shrink-0 w-full h-auto p-0 mb-2">
              {(['pretty', 'raw', 'headers', 'testResults'] as const).map((t) => (
                <Button
                  key={t}
                  variant="outline"
                  size="sm"
                  className={cn('text-xs uppercase', activeResTab === t && 'text-primary')}
                  onClick={() => onResTabChange(t)}
                >
                  {t === 'testResults' ? 'Test Results' : t}
                </Button>
              ))}
            </ButtonGroup>

            {activeResTab === 'pretty' && (
              <div className="flex-1 min-h-0 mt-2">
                <div className="h-full border rounded-md overflow-hidden bg-background">
                  <TextEditor value={getFormattedBody()} options={{ readOnly: true }} />
                </div>
              </div>
            )}

            {activeResTab === 'raw' && (
              <div className="flex-1 min-h-0 mt-2">
                <div className="h-full border rounded-md overflow-hidden bg-background">
                  <TextEditor value={response.body} options={{ readOnly: true }} />
                </div>
              </div>
            )}

            {activeResTab === 'headers' && (
              <div className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-full">
                  <div className="space-y-1 text-xs font-mono">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="flex border-b py-1">
                        <span className="w-1/3 text-muted-foreground font-semibold truncate pr-2">
                          {key}
                        </span>
                        <span className="w-2/3 text-foreground break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {activeResTab === 'testResults' && (
              <div className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-full">
                  <div className="space-y-2 pr-2">
                    {testResults.map((tr, index) => (
                      <div
                        key={index}
                        className={`p-2 border rounded-md flex items-center justify-between text-xs ${
                          tr.passed
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-destructive/5 border-destructive/20'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {tr.passed ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          <span className="font-semibold">{tr.name}</span>
                        </div>
                        {!tr.passed && tr.message && (
                          <span className="text-[10px] text-destructive font-mono">{tr.message}</span>
                        )}
                      </div>
                    ))}
                    {testScript && testResults.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        Scripts did not output any assertion checks. Use `pm.test` inside scripts to register assertions.
                      </div>
                    )}
                    {!testScript && (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        No test scripts defined for this request.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      );
    }

    // No response yet
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <span className="text-sm font-medium text-muted-foreground">
          No response received yet.
        </span>
        <span className="text-xs text-muted-foreground/60 max-w-[200px] mt-1">
          Enter target URL and click Send to execute the endpoint.
        </span>
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-2 bg-background/50 flex flex-col min-h-0">
      {renderContent()}
    </div>
  );
}
