// ponytail: premium, self-contained VPN connection widget with interactive transition timings, clean layout, and custom log viewer.

import * as React from 'react';
import { useVpnStore } from '@/stores/vpn-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import {
  SpinnerGapIcon,
  FolderOpenIcon,
  TerminalWindowIcon,
  TrashIcon,
  LockKeyIcon,
  GearIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';

export function VpnWidget() {
  const {
    status,
    error,
    configPath,
    access,
    server,
    protocol,
    port,
    logs,
    username,
    password,
    showCredentials,
    setConfigPath,
    setAccess,
    setServer,
    setProtocol,
    setPort,
    setUsername,
    setPassword,
    setShowCredentials,
    clearLogs,
    connect,
    disconnect,
    initListeners,
    fetchStatus,
  } = useVpnStore();

  const [showLogs, setShowLogs] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  // Initialize listeners for Tauri events on mount
  React.useEffect(() => {
    initListeners();
    fetchStatus();
  }, [initListeners, fetchStatus]);

  // Auto-scroll logs container to bottom on new log line
  React.useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle configuration file selection
  const handleSelectFile = async () => {
    try {
      const selected = await openDialog({
        title: 'Select OpenVPN configuration (.ovpn)',
        filters: [{ name: 'OpenVPN config', extensions: ['ovpn', 'conf'] }],
      });
      if (selected && typeof selected === 'string') {
        setConfigPath(selected);
      }
    } catch (e) {
      console.error('File selection canceled or failed', e);
    }
  };

  const getFilename = (path: string | null) => {
    if (!path) return 'No config selected';
    return path.split('/').pop() || path;
  };

  const handleConnectToggle = async () => {
    if (status === 'connected' || status === 'connecting') {
      await disconnect();
    } else {
      await connect();
    }
  };

  return (
    <div className="p-3 rounded-md border bg-muted/60 backdrop-blur-md flex flex-col gap-3 select-none transition-shadow duration-200 hover:shadow-md">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
            OpenVPN Connection
          </span>
        </div>
        
        {/* Status Indicator Lights */}
        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          {status === 'connecting' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          {status === 'error' && (
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
          {status === 'disconnected' && (
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/35"></span>
            </span>
          )}
        </div>
      </div>

      {/* Select Config Row */}
      <div className="flex items-center justify-between gap-2 bg-background/50 border border-border/40 p-1.5 rounded-md">
        <div className="flex-1 min-w-0 px-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase font-mono tracking-tight leading-none mb-0.5">
            Config File
          </p>
          <p
            className="text-xs font-medium truncate text-foreground/90"
            title={configPath || undefined}
          >
            {getFilename(configPath)}
          </p>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={handleSelectFile}
          disabled={status === 'connecting' || status === 'connected'}
          className="h-7 px-2 shrink-0 active:scale-[0.97] transition-transform duration-100"
        >
          <FolderOpenIcon className="size-3.5" />
        </Button>
      </div>

      {/* Collapsible Connection Settings (Accordion) */}
      <div className="border border-border/40 rounded-md bg-background/25 overflow-hidden transition-all duration-200">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/40 transition-colors duration-150 select-none text-left"
        >
          <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground flex items-center gap-1.5">
            <GearIcon className="size-3.5" />
            Connection Settings
          </span>
          <CaretDownIcon className={`size-3 text-muted-foreground transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} />
        </button>

        {showSettings && (
          <div className="p-2 border-t border-border/30 flex flex-col gap-2.5 bg-background/10">
            {/* Protocol Override */}
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground uppercase font-mono font-semibold">
                Protocol
              </Label>
              <Select
                value={protocol}
                onValueChange={(val) => {
                  setProtocol(val);
                  setPort(val === 'udp' ? 1337 : 443);
                }}
                disabled={status === 'connecting' || status === 'connected'}
              >
                <SelectTrigger size="sm" className="w-full text-xs h-7 py-1 px-2 select-none active:scale-[0.97] transition-transform duration-100 bg-background/50">
                  <SelectValue placeholder="Protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="udp">UDP 1337</SelectItem>
                  <SelectItem value="tcp">TCP 443</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Credentials Fields */}
            <div className="space-y-2 border-t border-border/20 pt-2">
              <div className="space-y-1">
                <Label className="text-[9px] text-muted-foreground uppercase font-mono font-semibold">
                  Username
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Optional"
                  disabled={status === 'connecting' || status === 'connected'}
                  className="h-7 text-xs bg-background/50 border-border/60"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-muted-foreground uppercase font-mono font-semibold">
                  Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional"
                  disabled={status === 'connecting' || status === 'connected'}
                  className="h-7 text-xs bg-background/50 border-border/60"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 items-center mt-1">
        <Button
          onClick={handleConnectToggle}
          variant={status === 'connected' || status === 'connecting' ? 'destructive' : 'default'}
          className="flex-1 h-7 text-xs font-semibold select-none active:scale-[0.97] transition-all duration-150"
        >
          {status === 'connecting' ? (
            <>
              <SpinnerGapIcon className="size-3 animate-spin mr-1.5" />
              Connecting...
            </>
          ) : status === 'connected' ? (
            'Disconnect'
          ) : (
            'Connect'
          )}
        </Button>

        {/* Log Viewer Toggle */}
        <Button
          size="xs"
          variant="outline"
          onClick={() => setShowLogs(!showLogs)}
          className={`h-7 px-2.5 active:scale-[0.97] transition-all duration-150 ${showLogs ? 'bg-accent border-accent-foreground text-accent-foreground' : ''}`}
        >
          <TerminalWindowIcon className="size-4" />
        </Button>
      </div>

      {/* Collapsible Logs Terminal Panel */}
      {showLogs && (
        <div className="mt-1 border border-border/60 bg-black/90 text-zinc-100 rounded-md p-2 flex flex-col gap-2 max-h-[160px] min-h-[100px] transition-all duration-300 font-mono text-[9px] relative">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1 shrink-0">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Connection Logs</span>
            <button
              onClick={clearLogs}
              className="text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <TrashIcon className="size-3" />
            </button>
          </div>

          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-1 pr-1 font-mono leading-normal select-text"
          >
            {logs.length === 0 ? (
              <span className="text-zinc-600 italic">No logs capture. Ready to connect...</span>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-all ${log.includes('[ERROR]') ? 'text-red-400' : log.includes('Sequence Completed') ? 'text-emerald-400' : 'text-zinc-300'}`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
