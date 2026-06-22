import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Play, Loader2 } from 'lucide-react';
import type { RepeaterTab, WsRepeaterMessage } from '@/pages/repeater/types';

interface RepeaterWsPanelProps {
  tab: RepeaterTab;
  onUpdate: (updater: (tab: RepeaterTab) => RepeaterTab) => void;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function directionBadgeClass(direction: string) {
  return direction === 'outbound'
    ? 'bg-blue-500/10 text-blue-600'
    : 'bg-green-500/10 text-green-600';
}

export function RepeaterWsPanel({ tab, onUpdate }: RepeaterWsPanelProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab.wsMessages.length]);

  useEffect(() => {
    const unlisten = listen<WsRepeaterMessage>('ws-repeater-message', (event) => {
      const current = tabRef.current;
      if (!current.wsConnectionId) return;
      if (event.payload.connection_id !== current.wsConnectionId) return;

      if (event.payload.message_type === 'close') {
        onUpdate((prev) => ({
          ...prev,
          wsConnected: false,
          wsConnectionId: null,
          wsMessages: [
            ...prev.wsMessages,
            event.payload,
          ],
        }));
        return;
      }

      onUpdate((prev) => ({
        ...prev,
        wsMessages: [...prev.wsMessages, event.payload],
      }));
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onUpdate]);

  const handleToggleConnection = useCallback(async () => {
    if (tab.wsConnected) {
      if (tab.wsConnectionId) {
        await invoke('ws_repeater_disconnect', { connectionId: tab.wsConnectionId });
      }
      onUpdate((prev) => ({
        ...prev,
        wsConnected: false,
        wsConnectionId: null,
      }));
      return;
    }

    setIsConnecting(true);
    try {
      const wsReq = tab.wsRequest;
      if (!wsReq) return;

      const connectionId: string = await invoke('ws_repeater_connect', {
        url: wsReq.url,
        headers: wsReq.headers,
      });

      onUpdate((prev) => ({
        ...prev,
        wsConnected: true,
        wsConnectionId: connectionId,
      }));
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      onUpdate((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'WebSocket connection failed',
      }));
    } finally {
      setIsConnecting(false);
    }
  }, [tab.wsConnected, tab.wsConnectionId, tab.wsRequest, onUpdate]);

  const handleSend = useCallback(async () => {
    const text = messageInput.trim();
    if (!text || !tab.wsConnectionId) return;

    await invoke('ws_repeater_send', {
      connectionId: tab.wsConnectionId,
      message: text,
    });

    const now = new Date().toISOString();
    onUpdate((prev) => ({
      ...prev,
      wsMessages: [
        ...prev.wsMessages,
        {
          connection_id: tab.wsConnectionId!,
          direction: 'outbound',
          message_type: 'text',
          payload: text,
          timestamp: now,
        },
      ],
    }));

    setMessageInput('');
  }, [messageInput, tab.wsConnectionId, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const wsReq = tab.wsRequest;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-mono truncate flex-1" title={wsReq?.url || tab.request.url}>
          {wsReq?.url || tab.request.url}
        </span>
        <div className="flex items-center gap-2">
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <Switch
            checked={tab.wsConnected}
            onCheckedChange={handleToggleConnection}
            disabled={isConnecting}
          />
          <span className="text-xs text-muted-foreground">
            {tab.wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {wsReq && (
        <Collapsible className="border-b">
          <CollapsibleTrigger className="flex items-center gap-2 px-4 py-1.5 w-full hover:bg-muted/50 text-xs text-muted-foreground">
            <ChevronDown className="h-3 w-3" />
            Handshake
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 gap-0">
              <div className="p-3 border-r">
                <div className="text-xs font-semibold mb-2">Request Headers</div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-40 overflow-auto">
                  GET {wsReq.url} HTTP/1.1{'\n'}
                  {Object.entries(wsReq.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}
                </pre>
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold mb-2">Request Info</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Method: {wsReq.method}</div>
                  <div>Headers: {Object.keys(wsReq.headers || {}).length}</div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex-1 overflow-auto p-2 space-y-1 min-h-0">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">
            Messages: {tab.wsMessages.length}
          </span>
        </div>
        {tab.wsMessages.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            {tab.wsConnected ? 'Waiting for messages...' : 'Connect to start receiving messages'}
          </div>
        ) : (
          tab.wsMessages.map((msg, i) => (
            <div
              key={`${msg.timestamp}-${i}`}
              className="rounded-md border bg-background"
            >
              <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs">
                <span className={`rounded px-1.5 py-0.5 uppercase ${directionBadgeClass(msg.direction)}`}>
                  {msg.direction === 'outbound' ? 'Out' : 'In'}
                </span>
                <span className="uppercase text-muted-foreground">{msg.message_type}</span>
                <span className="ml-auto font-mono text-muted-foreground">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-48 overflow-auto">
                {msg.payload || '(empty)'}
              </pre>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t bg-background">
        <Input
          className="flex-1 h-8 text-xs"
          placeholder="Type a message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!tab.wsConnected}
        />
        <Button
          size="xs"
          onClick={handleSend}
          disabled={!tab.wsConnected || !messageInput.trim()}
        >
          <Play className="h-3 w-3" /> Send
        </Button>
      </div>

      {tab.error && (
        <div className="px-3 py-2 border-t bg-destructive/10 text-xs text-destructive">
          {tab.error}
        </div>
      )}
    </div>
  );
}
