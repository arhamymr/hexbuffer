import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

// Module-level singletons so the LSP client survives re-renders
let globalClient: MonacoLanguageClient | null = null;
let globalWs: WebSocket | null = null;
let startingUp = false;

export function useMonacoLsp(activeLanguage: string) {
  const [isLspActive, setIsLspActive] = useState(false);

  useEffect(() => {
    // Only activate LSP for Rust files
    if (activeLanguage !== 'rust') return;

    // Already running — nothing to do
    if (globalClient || startingUp) {
      setIsLspActive(true);
      return;
    }

    let isMounted = true;
    startingUp = true;

    const startLsp = async () => {
      try {
        // 1. Ask Tauri for the LSP bridge port
        const port = await invoke<number>('get_lsp_port');
        if (!isMounted) { startingUp = false; return; }

        // 2. Open a WebSocket to the Tauri LSP bridge
        const ws = new WebSocket(`ws://127.0.0.1:${port}`);
        globalWs = ws;

        ws.onopen = () => {
          if (!isMounted) { ws.close(); startingUp = false; return; }

          // 3. Wire up the JSON-RPC transports
          const socket = toSocket(ws);
          const reader = new WebSocketMessageReader(socket);
          const writer = new WebSocketMessageWriter(socket);

          // 4. Create and start the Monaco Language Client
          const client = new MonacoLanguageClient({
            name: 'Rust Language Client',
            clientOptions: {
              documentSelector: ['rust'],
              errorHandler: {
                // ErrorAction.Continue = 1, CloseAction.DoNotRestart = 2
                error: () => ({ action: 1 }),
                closed: () => ({ action: 2 }),
              },
            },
            messageTransports: { reader, writer },
          });

          void client.start();
          globalClient = client;
          startingUp = false;

          if (isMounted) setIsLspActive(true);

          // Clean up when the connection closes
          reader.onClose(() => {
            globalClient = null;
            globalWs = null;
            if (isMounted) setIsLspActive(false);
          });
        };

        ws.onerror = (err) => {
          console.error('[Monaco LSP] WebSocket error:', err);
          startingUp = false;
        };

        ws.onclose = () => {
          if (globalClient) {
            void globalClient.stop();
            globalClient = null;
          }
          globalWs = null;
          startingUp = false;
          if (isMounted) setIsLspActive(false);
        };

      } catch (err) {
        console.error('[Monaco LSP] Failed to start LSP client:', err);
        startingUp = false;
      }
    };

    void startLsp();

    return () => {
      isMounted = false;
    };
  }, [activeLanguage]);

  return isLspActive;
}
