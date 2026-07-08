import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Target {
  id: string;
  title: string;
  url: string;
  type: string;
  faviconUrl?: string;
  webSocketDebuggerUrl: string;
}

export interface NetworkRequest {
  requestId: string;
  method: string;
  url: string;
  status: number | null;
  type: string;
  mimeType: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  postData: string | null;
  webSocketFrames: WebSocketFrame[];
  errorText?: string;
}

export interface WebSocketFrame {
  timestamp: number;
  direction: 'send' | 'receive';
  opcode: number;
  payloadData: string;
  size: number;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  session?: boolean;
}

export interface StorageItem {
  key: string;
  value: string;
}

export interface ConsoleLog {
  id: string;
  level: 'log' | 'info' | 'warning' | 'error' | 'debug';
  text: string;
  timestamp: number;
}

export function useInspectExternal() {
  const [port, setPort] = useState<number>(9222);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('network');

  // Network Logs State
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [responseBodies, setResponseBodies] = useState<Record<string, { body: string; base64Encoded: boolean }>>({});
  const [loadingBodyId, setLoadingBodyId] = useState<string | null>(null);
  const [networkThrottling, setNetworkThrottling] = useState<string>('online');

  // Storage State
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [localStorageItems, setLocalStorageItems] = useState<StorageItem[]>([]);
  const [sessionStorageItems, setSessionStorageItems] = useState<StorageItem[]>([]);

  // Console State
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);

  // WS references
  const wsRef = useRef<WebSocket | null>(null);
  const idCounter = useRef<number>(1);
  const pendingCommands = useRef<Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch targets from backend
  const fetchTargets = useCallback(async () => {
    setError(null);
    try {
      const resp = await invoke<string>('get_cdp_targets', { port });
      const list = JSON.parse(resp) as Target[];
      // Filter for debuggable pages
      setTargets(list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl));
    } catch (e: any) {
      console.error(e);
      setError(e.toString() || 'Failed to fetch targets. Make sure the browser is running with --remote-debugging-port=' + port);
      setTargets([]);
    }
  }, [port]);

  // Open browser with CDP config
  // ponytail: Keep it simple, just invoke open_cdp_browser with port and scan targets
  const openBrowser = useCallback(async () => {
    setError(null);
    try {
      await invoke('open_cdp_browser', { port });
      // Wait a brief moment for the browser to start
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await fetchTargets();
    } catch (e: any) {
      console.error(e);
      setError(e.toString() || 'Failed to open browser with remote debugging on port ' + port);
    }
  }, [port, fetchTargets]);

  // Send CDP Command
  const sendCommand = useCallback(<T = any>(method: string, params: any = {}): Promise<T> => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const id = idCounter.current++;
      pendingCommands.current.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }, []);

  // Emulate network conditions
  const emulateNetwork = useCallback(async (profile: string) => {
    let offline = false;
    let latency = 0;
    let downloadThroughput = -1;
    let uploadThroughput = -1;

    if (profile === 'offline') {
      offline = true;
      latency = 0;
      downloadThroughput = 0;
      uploadThroughput = 0;
    } else if (profile === 'fast3g') {
      offline = false;
      latency = 100;
      downloadThroughput = (1.5 * 1024 * 1024) / 8; // ~187.5 KB/s
      uploadThroughput = (750 * 1024) / 8; // ~93.75 KB/s
    } else if (profile === 'slow3g') {
      offline = false;
      latency = 400;
      downloadThroughput = (400 * 1024) / 8; // ~50 KB/s
      uploadThroughput = (200 * 1024) / 8; // ~25 KB/s
    }

    try {
      await sendCommand('Network.emulateNetworkConditions', {
        offline,
        latency,
        downloadThroughput,
        uploadThroughput,
      });
      setNetworkThrottling(profile);
    } catch (e) {
      console.error('Failed to emulate network conditions:', e);
    }
  }, [sendCommand]);

  // Fetch all cookies
  const refreshCookies = useCallback(async () => {
    try {
      const result = await sendCommand<{ cookies: Cookie[] }>('Network.getCookies');
      if (result && result.cookies) {
        setCookies(result.cookies);
      }
    } catch (e) {
      console.error('Failed to fetch cookies:', e);
    }
  }, [sendCommand]);

  // Fetch local & session storage
  const refreshStorage = useCallback(async () => {
    if (!selectedTarget) return;
    try {
      const origin = new URL(selectedTarget.url).origin;
      // Get Local Storage
      const localResult = await sendCommand<{ entries: [string, string][] }>('DOMStorage.getDOMStorageItems', {
        storageId: { securityOrigin: origin, isLocalStorage: true },
      });
      if (localResult && localResult.entries) {
        setLocalStorageItems(localResult.entries.map(([key, value]) => ({ key, value })));
      }

      // Get Session Storage
      const sessionResult = await sendCommand<{ entries: [string, string][] }>('DOMStorage.getDOMStorageItems', {
        storageId: { securityOrigin: origin, isLocalStorage: false },
      });
      if (sessionResult && sessionResult.entries) {
        setSessionStorageItems(sessionResult.entries.map(([key, value]) => ({ key, value })));
      }
    } catch (e) {
      console.error('DOMStorage fetch error:', e);
    }
  }, [selectedTarget, sendCommand]);

  // Combined storage refresh
  const refreshAllStorage = useCallback(async () => {
    await Promise.all([refreshCookies(), refreshStorage()]);
  }, [refreshCookies, refreshStorage]);

  // Delete Cookie
  const deleteCookie = useCallback(async (name: string, domain: string) => {
    try {
      await sendCommand('Network.deleteCookies', { name, domain });
      await refreshCookies();
    } catch (e) {
      console.error('Failed to delete cookie:', e);
    }
  }, [sendCommand, refreshCookies]);

  // Delete Storage Item
  const deleteStorageItem = useCallback(async (key: string, isLocalStorage: boolean) => {
    if (!selectedTarget) return;
    try {
      const origin = new URL(selectedTarget.url).origin;
      await sendCommand('DOMStorage.removeDOMStorageItem', {
        storageId: { securityOrigin: origin, isLocalStorage },
        key,
      });
      await refreshStorage();
    } catch (e) {
      console.error('Failed to remove storage item:', e);
    }
  }, [selectedTarget, sendCommand, refreshStorage]);

  // Clear Storage for current origin
  const clearOriginStorage = useCallback(async () => {
    if (!selectedTarget) return;
    try {
      const origin = new URL(selectedTarget.url).origin;
      await sendCommand('Storage.clearDataForOrigin', {
        origin,
        storageTypes: 'all',
      });
      setLocalStorageItems([]);
      setSessionStorageItems([]);
      await refreshCookies();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }, [selectedTarget, sendCommand, refreshCookies]);

  // Fetch response body lazily
  const getResponseBody = useCallback(async (requestId: string) => {
    if (responseBodies[requestId]) {
      return responseBodies[requestId];
    }
    setLoadingBodyId(requestId);
    try {
      const result = await sendCommand<{ body: string; base64Encoded: boolean }>('Network.getResponseBody', {
        requestId,
      });
      setResponseBodies((prev) => ({
        ...prev,
        [requestId]: result,
      }));
      setLoadingBodyId(null);
      return result;
    } catch (e: any) {
      console.error('Failed to get response body:', e);
      const errResult = { body: e.message || 'No response body available for this request.', base64Encoded: false };
      setResponseBodies((prev) => ({
        ...prev,
        [requestId]: errResult,
      }));
      setLoadingBodyId(null);
      return errResult;
    }
  }, [responseBodies, sendCommand]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setSelectedTarget(null);
    setConnectionStatus('disconnected');
    setNetworkRequests([]);
    setSelectedRequestId(null);
    setResponseBodies({});
    setCookies([]);
    setLocalStorageItems([]);
    setSessionStorageItems([]);
    setConsoleLogs([]);
    setNetworkThrottling('online');
    pendingCommands.current.clear();
  }, []);

  // Connect WebSocket
  const connect = useCallback(async (target: Target) => {
    disconnect();
    setConnectionStatus('connecting');
    setSelectedTarget(target);
    setError(null);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      setConnectionStatus('connected');
      try {
        // Enable protocol domains
        await sendCommand('Network.enable');
        await sendCommand('DOMStorage.enable');
        await sendCommand('Runtime.enable');
        await sendCommand('Log.enable');

        // Initial fetch of storage data
        await refreshAllStorage();
      } catch (e: any) {
        console.error('Failed to enable domains:', e);
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const pending = pendingCommands.current.get(data.id);
        if (pending) {
          pendingCommands.current.delete(data.id);
          if (data.error) {
            pending.reject(new Error(data.error.message || 'CDP Command failed'));
          } else {
            pending.resolve(data.result);
          }
        }
      } else if (data.method) {
        const { method, params } = data;

        // Handle Network Events
        if (method === 'Network.requestWillBeSent') {
          const { requestId, request, timestamp, type } = params;
          setNetworkRequests((prev) => {
            // Avoid duplicates
            if (prev.some((r) => r.requestId === requestId)) return prev;

            const newReq: NetworkRequest = {
              requestId,
              method: request.method,
              url: request.url,
              status: null,
              type: type || 'Other',
              mimeType: '',
              startTime: timestamp,
              endTime: null,
              duration: null,
              requestHeaders: request.headers || {},
              responseHeaders: {},
              postData: request.postData || null,
              webSocketFrames: [],
            };
            return [...prev, newReq];
          });
        } else if (method === 'Network.responseReceived') {
          const { requestId, response, timestamp, type } = params;
          setNetworkRequests((prev) =>
            prev.map((req) => {
              if (req.requestId !== requestId) return req;
              const duration = req.startTime ? Math.round((timestamp - req.startTime) * 1000) : null;
              return {
                ...req,
                status: response.status,
                mimeType: response.mimeType || '',
                type: type || req.type,
                responseHeaders: response.headers || {},
                endTime: timestamp,
                duration,
              };
            })
          );
        } else if (method === 'Network.loadingFinished') {
          const { requestId, timestamp } = params;
          setNetworkRequests((prev) =>
            prev.map((req) => {
              if (req.requestId !== requestId) return req;
              const duration = req.startTime ? Math.round((timestamp - req.startTime) * 1000) : null;
              return {
                ...req,
                endTime: timestamp,
                duration,
              };
            })
          );
        } else if (method === 'Network.loadingFailed') {
          const { requestId, timestamp, errorText } = params;
          setNetworkRequests((prev) =>
            prev.map((req) => {
              if (req.requestId !== requestId) return req;
              const duration = req.startTime ? Math.round((timestamp - req.startTime) * 1000) : null;
              return {
                ...req,
                errorText: errorText || 'Failed',
                endTime: timestamp,
                duration,
              };
            })
          );
        }

        // Handle WebSocket Frame Events
        else if (method === 'Network.webSocketFrameReceived') {
          const { requestId, timestamp, response } = params;
          setNetworkRequests((prev) =>
            prev.map((req) => {
              if (req.requestId !== requestId) return req;
              const newFrame: WebSocketFrame = {
                timestamp: timestamp * 1000,
                direction: 'receive',
                opcode: response.opcode,
                payloadData: response.payloadData,
                size: response.payloadData ? response.payloadData.length : 0,
              };
              return {
                ...req,
                webSocketFrames: [...req.webSocketFrames, newFrame],
              };
            })
          );
        } else if (method === 'Network.webSocketFrameSent') {
          const { requestId, timestamp, response } = params;
          setNetworkRequests((prev) =>
            prev.map((req) => {
              if (req.requestId !== requestId) return req;
              const newFrame: WebSocketFrame = {
                timestamp: timestamp * 1000,
                direction: 'send',
                opcode: response.opcode,
                payloadData: response.payloadData,
                size: response.payloadData ? response.payloadData.length : 0,
              };
              return {
                ...req,
                webSocketFrames: [...req.webSocketFrames, newFrame],
              };
            })
          );
        }

        // Handle Storage Events
        else if (
          method === 'DOMStorage.domStorageItemAdded' ||
          method === 'DOMStorage.domStorageItemRemoved' ||
          method === 'DOMStorage.domStorageItemUpdated' ||
          method === 'DOMStorage.domStorageItemsCleared'
        ) {
          refreshStorage();
        }

        // Handle Console API Calls
        else if (method === 'Runtime.consoleAPICalled') {
          const { type: logType, args, timestamp } = params;
          const text = args.map((arg: any) => arg.value || JSON.stringify(arg)).join(' ');
          const levelMap: Record<string, ConsoleLog['level']> = {
            log: 'log',
            info: 'info',
            warning: 'warning',
            error: 'error',
            debug: 'debug',
          };
          const newLog: ConsoleLog = {
            id: Math.random().toString(36).substr(2, 9),
            level: levelMap[logType] || 'log',
            text,
            timestamp,
          };
          setConsoleLogs((prev) => [...prev, newLog]);
        }
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setSelectedTarget(null);
    };

    ws.onerror = (e) => {
      console.error('WebSocket Error:', e);
      setError('Connection failed. WebSocket closed with error.');
      setConnectionStatus('disconnected');
    };
  }, [disconnect, sendCommand, refreshAllStorage, refreshStorage]);

  // Clear network request list
  const clearNetwork = useCallback(() => {
    setNetworkRequests([]);
    setSelectedRequestId(null);
    setResponseBodies({});
  }, []);

  // Clear console log lines
  const clearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  // Clean up connection on component unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Derived selected request
  const selectedRequest = networkRequests.find((r) => r.requestId === selectedRequestId) || null;

  return {
    port,
    setPort,
    targets,
    selectedTarget,
    connectionStatus,
    error,
    activeTab,
    setActiveTab,

    // Actions
    fetchTargets,
    openBrowser,
    connect,
    disconnect,

    // Network
    networkRequests,
    selectedRequest,
    selectedRequestId,
    setSelectedRequestId,
    getResponseBody,
    loadingBodyId,
    clearNetwork,
    networkThrottling,
    setNetworkThrottling: emulateNetwork,

    // Storage
    cookies,
    localStorageItems,
    sessionStorageItems,
    refreshStorage: refreshAllStorage,
    deleteCookie,
    deleteStorageItem,
    clearStorage: clearOriginStorage,

    // Console
    consoleLogs,
    clearConsole,

    // Filters
    searchQuery,
    setSearchQuery,
  };
}
