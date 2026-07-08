import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, ArrowClockwise, Plugs, PlugsConnected, Bug, Browser, Warning } from '@phosphor-icons/react';
import type { Target } from '../hooks/use-inspect-external';

interface TargetSelectorProps {
  port: number;
  setPort: (p: number) => void;
  targets: Target[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  error: string | null;
  fetchTargets: () => Promise<void>;
  openBrowser: () => Promise<void>;
  connect: (target: Target) => Promise<void>;
}

export function TargetSelector({
  port,
  setPort,
  targets,
  connectionStatus,
  error,
  fetchTargets,
  openBrowser,
  connect,
}: TargetSelectorProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchTargets();
    setLoading(false);
  };

  // Initial fetch on mount
  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 max-w-4xl mx-auto">
      <Card className="w-full bg-card/60 backdrop-blur-md border border-border shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
              <Bug className="size-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">InspectExternal</CardTitle>
          <CardDescription className="text-sm text-muted-foreground max-w-md mx-auto">
            Standalone debugger client. Connect to a running browser instance via Chrome DevTools Protocol (CDP).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Connection settings */}
          <div className="flex flex-col sm:flex-row items-end gap-3 p-4 bg-muted/40 rounded-xl border border-border/40">
            <div className="flex-1 space-y-1.5 w-full">
              <label htmlFor="debugging-port" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Remote Debugging Port
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                  localhost:
                </span>
                <Input
                  id="debugging-port"
                  type="number"
                  className="pl-18 h-10 font-mono text-sm bg-background border-border/60"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  placeholder="9222"
                />
              </div>
            </div>

            <Button
              className="h-10 px-5 gap-2 w-full sm:w-auto font-medium"
              onClick={async () => {
                setLoading(true);
                await openBrowser();
                setLoading(false);
              }}
              disabled={loading || connectionStatus === 'connecting'}
            >
              <Browser className="size-4" />
              Open Browser
            </Button>

            <Button
              variant="outline"
              className="h-10 px-5 gap-2 w-full sm:w-auto font-medium"
              onClick={handleRefresh}
              disabled={loading || connectionStatus === 'connecting'}
            >
              <ArrowClockwise className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              Scan Targets
            </Button>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs leading-relaxed">
              <Warning className="size-5 shrink-0 text-rose-500" />
              <div className="space-y-1">
                <p className="font-semibold">Discovery Error</p>
                <p className="opacity-90">{error}</p>
                <div className="pt-2 text-[10px] opacity-75">
                  <p className="font-semibold text-[11px] mb-1">How to fix:</p>
                  <p>1. Quit your browser completely.</p>
                  <p>2. Launch from command line with remote debugging enabled:</p>
                  <code className="block bg-rose-950/20 text-rose-400 p-1.5 rounded font-mono mt-1 whitespace-pre-wrap">
                    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Targets list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available Tabs / Pages ({targets.length})
              </span>
              {connectionStatus === 'connecting' && (
                <Badge variant="outline" className="animate-pulse border-primary/30 text-primary bg-primary/5">
                  Connecting...
                </Badge>
              )}
            </div>

            {targets.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border/80 rounded-xl bg-muted/10 text-muted-foreground text-center">
                <Browser className="size-10 opacity-30 mb-2.5" />
                <p className="text-sm font-medium">No debuggable pages found</p>
                <p className="text-xs opacity-70 mt-1 max-w-sm">
                  Click 'Scan Targets' after starting your browser with the remote debugging port active.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-1">
                {targets.map((target) => (
                  <div
                    key={target.id}
                    className="flex items-center justify-between p-3.5 bg-background border border-border/60 hover:border-primary/40 hover:bg-muted/10 rounded-xl transition duration-150 group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1 mr-4">
                      {target.faviconUrl ? (
                        <img
                          src={target.faviconUrl}
                          alt=""
                          className="size-5 rounded mt-0.5"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Globe className="size-5 text-muted-foreground mt-0.5" />
                      )}

                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                          {target.title || 'Untitled Page'}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-lg">
                          {target.url}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => connect(target)}
                      disabled={connectionStatus === 'connecting'}
                    >
                      <Plugs className="size-4" />
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
