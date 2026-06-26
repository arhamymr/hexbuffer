import { useChat } from '@ai-sdk/react';
import type { UIMessage } from '@ai-sdk/react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FileUIPart } from 'ai';
import { usePromptInputController } from '@/components/ai-elements/prompt-input';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { DASHBOARD_DEFAULT_AI_MODEL } from '../constants';
import { DashboardSettingsChatTransport } from '../lib/dashboard-chat-transport';
import type { ChatMessageRecord, CrawlCompletedEvent, CrawlHumanInputRequest, DashboardAiSettings, DashboardChatMessage, HumanSelectionRequest, IntentClarificationRequest } from '../types';

const DEFAULT_AI_SETTINGS: DashboardAiSettings = {
  provider: 'deepseek',
  model: DASHBOARD_DEFAULT_AI_MODEL,
  hasApiKey: false,
  allowThirdPartyAiSharing: false,
};

interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}

function parseCredentialInput(
  text: string,
  requestedFields: string[],
): Record<string, string> | null {
  const lower = text.toLowerCase().trim();

  // Try "key: value" or "key=value" format on separate lines
  const lines = text.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  const linePairs: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^([\w\s-]+?)\s*[:=]\s*(.+)$/);
    if (match) {
      linePairs[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }

  // If we found explicit key:value pairs, try to match them to requested fields
  if (Object.keys(linePairs).length > 0) {
    const result: Record<string, string> = {};
    for (const field of requestedFields) {
      const lowerField = field.toLowerCase();
      if (linePairs[lowerField]) {
        result[field] = linePairs[lowerField];
        continue;
      }
      for (const [key, value] of Object.entries(linePairs)) {
        if (
          key === lowerField ||
          key.includes(lowerField) ||
          lowerField.includes(key) ||
          (lowerField === 'username' && (key === 'user' || key === 'email' || key === 'login')) ||
          (lowerField === 'password' && (key === 'pass' || key === 'pwd')) ||
          (lowerField === 'email' && key.includes('email')) ||
          (lowerField === 'credential' && (key === 'username' || key === 'password' || key === 'user' || key === 'email'))
        ) {
          result[field] = value;
          break;
        }
      }
    }
    if (Object.keys(result).length > 0) return result;
  }

  // Try "username <value> password <value>" space-separated format
  const spacePairs: Record<string, string> = {};
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i].replace(/[:=,]$/, '').toLowerCase();
    const nextValue = words[i + 1].replace(/^[:=,]/, '');
    if (
      word === 'username' || word === 'user' || word === 'email' || word === 'login' ||
      word === 'password' || word === 'pass' || word === 'pwd' ||
      word === 'otp' || word === 'token' || word === 'code' || word === 'mfa'
    ) {
      spacePairs[word] = nextValue;
    }
  }
  if (Object.keys(spacePairs).length > 0) {
    const result: Record<string, string> = {};
    const keyMap: Record<string, string> = {
      user: 'username', login: 'username', email: 'username',
      pass: 'password', pwd: 'password',
    };
    for (const [k, v] of Object.entries(spacePairs)) {
      const mappedKey = keyMap[k] || k;
      const matchingField = requestedFields.find(
        (f) => f.toLowerCase() === mappedKey || f.toLowerCase().includes(mappedKey),
      );
      if (matchingField) {
        result[matchingField] = v;
      }
    }
    if (Object.keys(result).length > 0) return result;
  }

  // If only one field is requested, treat the whole text as the value
  if (requestedFields.length === 1) {
    return { [requestedFields[0]]: text };
  }

  // If two fields requested, try to split by common separators
  if (requestedFields.length === 2) {
    const parts = text.split(/[\n;|]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        [requestedFields[0]]: parts[0],
        [requestedFields[1]]: parts[1],
      };
    }
    const andSplit = text.split(/\s+and\s+|,\s*/);
    if (andSplit.length >= 2) {
      return {
        [requestedFields[0]]: andSplit[0].trim(),
        [requestedFields[1]]: andSplit[1].trim(),
      };
    }
  }

  return null;
}

interface UseDashboardPageOptions {
  sessionId: string | null;
  setMessagesRef: React.MutableRefObject<((messages: UIMessage<unknown>[]) => void) | null>;
  onSaveMessages?: (sessionId: string, messages: ChatMessageRecord[]) => void;
}

export function useDashboardPage({ sessionId, setMessagesRef, onSaveMessages }: UseDashboardPageOptions) {
  const [aiSettings, setAiSettings] = useState<DashboardAiSettings>(DEFAULT_AI_SETTINGS);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(true);
  const [pendingCrawlInput, setPendingCrawlInput] = useState<CrawlHumanInputRequest | null>(null);
  const [pendingSelection, setPendingSelection] = useState<HumanSelectionRequest | null>(null);
  const [pendingClarification, setPendingClarification] = useState<IntentClarificationRequest | null>(null);
  const aiSettingsRef = useRef(aiSettings);
  const crawlInputRef = useRef<CrawlHumanInputRequest | null>(null);
  const selectionRef = useRef<HumanSelectionRequest | null>(null);
  const clarificationRef = useRef<IntentClarificationRequest | null>(null);
  const processedSessionIdsRef = useRef(new Set<string>());
  const promptController = usePromptInputController();
  const inputBeingConsumedRef = useRef(false);

  useEffect(() => {
    aiSettingsRef.current = aiSettings;
  }, [aiSettings]);

  useEffect(() => {
    crawlInputRef.current = pendingCrawlInput;
  }, [pendingCrawlInput]);

  useEffect(() => {
    selectionRef.current = pendingSelection;
  }, [pendingSelection]);

  useEffect(() => {
    clarificationRef.current = pendingClarification;
  }, [pendingClarification]);

  // Listen for crawl human input requests from the backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<CrawlHumanInputRequest>('ai-chat:crawl-human-input-required', (event) => {
      setPendingCrawlInput(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  // Listen for human selection requests from the AI chat engine
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<HumanSelectionRequest>('ai-chat:human-selection-required', (event) => {
      setPendingSelection(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  // Listen for intent clarification requests from the AI chat engine
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<IntentClarificationRequest>('ai-chat:intent-clarification-required', (event) => {
      setPendingClarification(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const transport = useMemo(() => new DashboardSettingsChatTransport(), []);

  const {
    clearError,
    error,
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat<DashboardChatMessage>({
    transport,
  });

  // Populate the ref so the session hook can call setMessages when switching
  useEffect(() => {
    setMessagesRef.current = setMessages as (msgs: UIMessage<unknown>[]) => void;
  }, [setMessages, setMessagesRef]);

  useEffect(() => {
    let active = true;

    async function loadAiSettings() {
      try {
        setAiSettingsLoading(true);
        const settings = await invoke<DashboardAiSettings>('get_ai_settings');
        if (active) {
          setAiSettings(settings);
        }
      } catch (error) {
        console.error('Failed to load AI settings for chat:', error);
      } finally {
        if (active) {
          setAiSettingsLoading(false);
        }
      }
    }

    void loadAiSettings();

    return () => {
      active = false;
    };
  }, []);

  // Listen for crawl completions and auto-send results to the AI for analysis
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<CrawlCompletedEvent>('ai-chat:crawl-completed', (event) => {
      const { sessionId, targetUrl, pagesVisited, insightsFound, insightTitles, pageUrls } =
        event.payload;

      // Avoid processing the same session twice
      if (processedSessionIdsRef.current.has(sessionId)) return;
      processedSessionIdsRef.current.add(sessionId);

      // Don't auto-send if the AI is already streaming a response
      if (status === 'submitted' || status === 'streaming') return;

      const insightList =
        insightTitles.length > 0
          ? insightTitles.slice(0, 10).map((t) => `  - ${t}`).join('\n')
          : '  (none)';
      const pageList =
        pageUrls.length > 0
          ? pageUrls.slice(0, 10).map((u) => `  - ${u}`).join('\n')
          : '  (none)';

      const summary = [
        `The browser crawl has just completed.`,
        ``,
        `Target: ${targetUrl}`,
        `Session: ${sessionId}`,
        `Pages visited: ${pagesVisited}`,
        `Insights found: ${insightsFound}`,
        ``,
        `Insights:`,
        insightList,
        ``,
        `Visited pages:`,
        pageList,
        ``,
        `Please use getCrawlContext to fetch the full results and summarize what was found. Focus on any security findings, exposed endpoints, or interesting discoveries.`,
      ].join('\n');

      sendMessage(
        { text: summary, files: [] },
        {
          body: {
            aiSettings: aiSettingsRef.current,
          },
        },
      );
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [sendMessage, status]);

  // Persist messages to DB whenever they change after streaming completes
  const prevMessageCountRef = useRef(0);
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    if (sessionIdRef.current !== sessionId) {
      prevMessageCountRef.current = 0;
    }
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const sid = sessionIdRef.current;
    if (!sid || !onSaveMessages) return;
    if (status === 'submitted' || status === 'streaming') return;
    if (messages.length === 0) return;
    if (messages.length === prevMessageCountRef.current) return;

    prevMessageCountRef.current = messages.length;

    const records: ChatMessageRecord[] = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        id: m.id,
        sessionId: sid,
        role: m.role,
        content: m.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('\n'),
        createdAt: new Date().toISOString(),
      }));

    onSaveMessages(sid, records);
  }, [messages, status, onSaveMessages]);

  const submitCrawlCredentials = useCallback(async (fields: Record<string, string>) => {
    const request = crawlInputRef.current;
    if (!request) return false;

    const store = useBrowserAutomationStore.getState();
    store.submitHumanInput(request, 'continue', fields);
    setPendingCrawlInput(null);
    return true;
  }, []);

  const dismissCrawlInput = useCallback(() => {
    setPendingCrawlInput(null);
  }, []);

  const submitSelection = useCallback(async (selectedValues: string[]) => {
    const request = selectionRef.current;
    if (!request || selectedValues.length === 0) return;

    setPendingSelection(null);

    // Send the selection as a regular chat message so the AI can continue
    const selectedLabels = request.options
      .filter((o) => selectedValues.includes(o.value))
      .map((o) => o.label);
    const selectionText = `I choose: ${selectedLabels.join(', ')}`;

    await sendMessage(
      { text: selectionText, files: [] },
      {
        body: {
          aiSettings: aiSettingsRef.current,
        },
      },
    );
  }, [sendMessage]);

  const dismissSelection = useCallback(() => {
    setPendingSelection(null);
  }, []);

  const submitClarification = useCallback(async (selectedCategoryId: string) => {
    const request = clarificationRef.current;
    if (!request) return;

    setPendingClarification(null);

    // Find the selected category label
    const category = request.categories.find((c) => c.id === selectedCategoryId);
    const categoryLabel = category?.label ?? selectedCategoryId;

    // Construct a message that gives the full agent context
    const clarificationText = `[Task: ${categoryLabel}] Original request: "${request.originalMessage}"`;

    await sendMessage(
      { text: clarificationText, files: [] },
      {
        body: {
          aiSettings: aiSettingsRef.current,
        },
      },
    );
  }, [sendMessage]);

  const dismissClarification = useCallback(() => {
    setPendingClarification(null);
  }, []);

  const handleSubmit = useCallback(async ({ text, files }: PromptInputMessage) => {
    if (!text.trim()) {
      return;
    }

    // If there's a pending credential request, try to parse credentials from the text
    const pendingRequest = crawlInputRef.current;
    if (pendingRequest && !inputBeingConsumedRef.current) {
      const extracted = parseCredentialInput(text, pendingRequest.requestedFields);
      if (extracted) {
        inputBeingConsumedRef.current = true;
        promptController.textInput.clear();
        promptController.attachments.clear();

        await submitCrawlCredentials(extracted);
        inputBeingConsumedRef.current = false;
        return;
      }
    }

    // Clear the input immediately so the user sees feedback right away.
    promptController.textInput.clear();
    promptController.attachments.clear();

    clearError();
    await sendMessage(
      { text, files },
      {
        body: {
          aiSettings: aiSettingsRef.current,
        },
      },
    );
  }, [clearError, sendMessage, promptController, submitCrawlCredentials]);

  const setModel = useCallback((model: string) => {
    setAiSettings((prev) => ({ ...prev, model }));
  }, []);

  const setProvider = useCallback((provider: DashboardAiSettings['provider']) => {
    setAiSettings((prev) => ({ ...prev, provider }));
  }, []);

  return {
    aiSettings,
    aiSettingsLoading,
    error,
    handleSubmit,
    isStreaming: status === 'submitted' || status === 'streaming',
    messages,
    model: aiSettings.model,
    provider: aiSettings.provider,
    setModel,
    setProvider,
    status,
    stop,
    pendingCrawlInput,
    dismissCrawlInput,
    pendingSelection,
    dismissSelection,
    submitSelection,
    pendingClarification,
    dismissClarification,
    submitClarification,
  };
}
