import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { MonacoVscodeApiWrapper } from 'monaco-languageclient/vscodeApiWrapper';

let globalClient: MonacoLanguageClient | null = null;
let apiWrapperStarted = false;

export function useMonacoLsp(activeLanguage: string) {
  const [isLspActive, setIsLspActive] = useState(false);

  useEffect(() => {
    // Only initialize LSP if the active document is Rust and there isn't an active client already
    if (activeLanguage !== 'rust') {
      return;
    }

    if (globalClient) {
      setIsLspActive(true);
      return;
    }

    let isMounted = true;
    let ws: WebSocket | null = null;

    const startLsp = async () => {
      try {
        // 1. Get the dynamic LSP port from the Tauri backend
        const port = await invoke<number>('get_lsp_port');
        if (!isMounted) return;

        // 2. Start VS Code API services once
        if (!apiWrapperStarted) {
          const apiWrapper = new MonacoVscodeApiWrapper({
            $type: 'classic',
            logLevel: 2, // Info
          });
          await apiWrapper.start();
          apiWrapperStarted = true;
        }

        if (!isMounted) return;

        // 3. Connect to the local LSP WebSocket proxy
        ws = new WebSocket(`ws://127.0.0.1:${port}`);

        ws.onopen = () => {
          if (!isMounted) {
            ws?.close();
            return;
          }

          const socket = toSocket(ws!);
          const reader = new WebSocketMessageReader(socket);
          const writer = new WebSocketMessageWriter(socket);

          const client = new MonacoLanguageClient({
            name: 'Rust Language Client',
            clientOptions: {
              documentSelector: ['rust'],
              errorHandler: {
                error: () => ({ action: 1 /* Continue */ }),
                closed: () => ({ action: 2 /* DoNotRestart */ }),
              },
            },
            messageTransports: { reader, writer },
          });

          client.start();
          globalClient = client;
          setIsLspActive(true);

          reader.onClose(() => {
            if (globalClient === client) {
              globalClient = null;
            }
            setIsLspActive(false);
          });
        };

        ws.onerror = (err) => {
          console.error('[Monaco LSP] WebSocket error:', err);
        };

        ws.onclose = () => {
          if (globalClient) {
            globalClient.stop();
            globalClient = null;
          }
          setIsLspActive(false);
        };

      } catch (err) {
        console.error('[Monaco LSP] Failed to start LSP client:', err);
      }
    };

    void startLsp();

    return () => {
      isMounted = false;
    };
  }, [activeLanguage]);

  return isLspActive;
}
