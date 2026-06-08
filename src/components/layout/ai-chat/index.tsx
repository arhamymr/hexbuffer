import { Bot, CheckCircleIcon, ChevronDownIcon, CircleIcon, KeyRound, Loader2Icon, PanelLeftClose, PanelLeftOpen, ShieldAlert, X, XCircleIcon } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AgentHeader } from '@/components/ai-elements/agent';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  ModelSelectorLogo,
} from '@/components/ai-elements/model-selector';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from '@/components/ai-elements/prompt-input';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { useDashboardPage } from '@/components/layout/ai-chat/hooks/use-dashboard-page';
import { useChatSessions } from '@/components/layout/ai-chat/hooks/use-chat-sessions';
import { ChatSessionList } from '@/components/layout/ai-chat/components/chat-session-list';
import { cn } from '@/lib/utils';
import { AI_MODEL_OPTIONS_BY_PROVIDER } from '@/pages/settings/constants';
import type { DashboardChatMessage } from '@/components/layout/ai-chat/types';
import { useAiChatActions } from '@/hooks/use-ai-chat-actions';
import { useTrackedActions, clearTrackedActions } from '@/lib/ai-chat-actions';
import {
  Task,
  TaskTrigger,
  TaskContent,
} from '@/components/ai-elements/task';

const SUGGESTION_PROMPTS = [
  'Scan a website for vulnerabilities',
  'Summarize the latest crawl results',
  'Extract info from a URL',
  'Write findings to my document',
];

function getMessageText(message: DashboardChatMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function getReasoningParts(message: DashboardChatMessage) {
  return message.parts.filter((part) => part.type === 'reasoning');
}

function hasContent(message: DashboardChatMessage) {
  return getMessageText(message).length > 0 || getReasoningParts(message).length > 0;
}

function providerLabel(message: DashboardChatMessage) {
  if (message.role !== 'assistant' || !message.metadata?.provider) {
    return null;
  }

  const provider = message.metadata.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI';
  return [provider, message.metadata.model].filter(Boolean).join(' ');
}

function SuggestionBar() {
  const controller = usePromptInputController();

  return (
    <div className="px-3 pb-2">
      <Suggestions>
        {SUGGESTION_PROMPTS.map((s) => (
          <Suggestion
            key={s}
            suggestion={s}
            onClick={(text) => controller.textInput.setInput(text)}
          />
        ))}
      </Suggestions>
    </div>
  );
}

// Inner component that uses useDashboardPage - must be rendered inside PromptInputProvider
function AIAssistantPaneContent() {
  const setMessagesRef = useRef<((messages: UIMessage<unknown>[]) => void) | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const {
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    deleteSession,
    saveMessages,
  } = useChatSessions({ setMessagesRef });

  const {
    aiSettings,
    aiSettingsLoading,
    error,
    handleSubmit,
    isStreaming,
    messages,
    model,
    provider,
    setModel,
    status,
    stop,
    pendingCrawlInput,
    dismissCrawlInput,
  } = useDashboardPage({
    sessionId: activeSessionId,
    setMessagesRef,
    onSaveMessages: saveMessages,
  });

  const providerDisplay = aiSettings.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI';
  const modelOptions = AI_MODEL_OPTIONS_BY_PROVIDER[aiSettings.provider] ?? [];

  // Listen for AI chat actions (add scope, write documents, extract URLs) and apply them to app stores.
  useAiChatActions();

  // Track active tool actions so they can be shown during the loading phase.
  const trackedActions = useTrackedActions();

  // Clear old tracked actions when a new submission begins.
  useEffect(() => {
    if (status === 'submitted') {
      clearTrackedActions();
    }
  }, [status]);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
  };

  const requestedFieldLabels = pendingCrawlInput?.requestedFields?.length
    ? pendingCrawlInput.requestedFields.join(', ')
    : 'credentials';

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b pr-3">
          <div className="flex items-center gap-1 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-7 w-7"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title={sidebarCollapsed ? 'Show chats' : 'Hide chats'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
              {sidebarCollapsed && sessions.length > 0 && (
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background" />
              )}
            </Button>
            <AgentHeader
              name={aiSettingsLoading ? 'Loading…' : providerDisplay}
              model={aiSettingsLoading ? undefined : model}
            />
          </div>
          <Badge variant="outline" className="shrink-0 gap-1">
            <KeyRound className="h-3 w-3" />
            {aiSettings.hasApiKey ? providerDisplay : 'No key'}
          </Badge>
        </div>

        {/* Body: session list + conversation */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Session sidebar */}
          {!sidebarCollapsed && (
            <div className="w-44 shrink-0">
              <ChatSessionList
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelect={switchSession}
                onDelete={deleteSession}
                onCreate={createSession}
              />
            </div>
          )}

          {/* Conversation */}
          <div className="flex flex-1 flex-col min-w-0">
            <Conversation>
              <ConversationContent>
                {messages.length === 0 && !pendingCrawlInput ? (
                  <ConversationEmptyState
                    icon={<Bot className="size-8" />}
                    title="AI Analyst"
                    description="Analyze traffic, extract URL data, write findings, and manage your recon scope."
                  />
                ) : (
              <>
                {messages.map((message) => {
                  const label = providerLabel(message);
                  const reasoningParts = getReasoningParts(message);
                  const text = getMessageText(message);

                  if (!hasContent(message) && message.role !== 'user') {
                    return null;
                  }

                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent>
                        {label ? (
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 shrink-0" />
                            <Badge variant="outline" className="max-w-full truncate">
                              {label}
                            </Badge>
                          </div>
                        ) : null}

                        {/* Reasoning / thinking blocks */}
                        {reasoningParts.map((part, i) => (
                          <Reasoning
                            key={i}
                            isStreaming={isStreaming && message.role === 'assistant'}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        ))}

                        {/* Text response */}
                        {text ? (
                          <MessageResponse isAnimating={isStreaming && message.role === 'assistant'}>
                            {text}
                          </MessageResponse>
                        ) : null}
                      </MessageContent>
                    </Message>
                  );
                })}

                {/* Pending crawl credential request card */}
                {pendingCrawlInput ? (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              Crawler Paused — Credentials Required
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={dismissCrawlInput}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="mt-1.5 text-muted-foreground">
                          {pendingCrawlInput.reason}
                        </p>
                        {pendingCrawlInput.url ? (
                          <p className="mt-1 text-xs text-muted-foreground/70 truncate">
                            URL: {pendingCrawlInput.url}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Type your {requestedFieldLabels} below to resume the crawl.
                          <br />
                          Format: <code className="text-xs bg-muted px-1 rounded">field: value</code> (one per line)
                        </p>
                      </div>
                    </MessageContent>
                  </Message>
                ) : null}

                {/* Loading shimmer while waiting for assistant response */}
                {status === 'submitted' ? (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="space-y-3">
                        {trackedActions.length > 0 ? (
                          <Task defaultOpen>
                            <TaskTrigger title="">
                              <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
                                <Loader2Icon className="size-4 animate-spin text-blue-500" />
                                <p className="flex-1 text-sm">Running actions…</p>
                                <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                              </div>
                            </TaskTrigger>
                            <TaskContent>
                              {trackedActions.map((ta) => {
                                const Icon =
                                  ta.status === 'completed' ? CheckCircleIcon :
                                  ta.status === 'error' ? XCircleIcon :
                                  ta.status === 'in_progress' ? Loader2Icon :
                                  CircleIcon;
                                const iconColor =
                                  ta.status === 'completed' ? 'text-green-500' :
                                  ta.status === 'error' ? 'text-red-500' :
                                  ta.status === 'in_progress' ? 'text-blue-500' :
                                  'text-muted-foreground';
                                return (
                                  <div key={ta.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Icon className={cn('size-3.5 mt-0.5 shrink-0', iconColor, ta.status === 'in_progress' && 'animate-spin')} />
                                    <span>{ta.label}</span>
                                  </div>
                                );
                              })}
                            </TaskContent>
                          </Task>
                        ) : null}
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Shimmer duration={1}>Generating response…</Shimmer>
                        </div>
                      </div>
                    </MessageContent>
                  </Message>
                ) : null}

                {error ? (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="break-words rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {error.message}
                      </div>
                    </MessageContent>
                  </Message>
                ) : null}

                {/* Completed task summary (shown after response arrives) */}
                {status !== 'submitted' && trackedActions.length > 0 ? (
                  <Message from="assistant">
                    <MessageContent>
                      <Task defaultOpen={false}>
                        <TaskTrigger
                          title={`${trackedActions.filter((a) => a.status === 'completed').length}/${trackedActions.length} actions completed`}
                        />
                        <TaskContent>
                          {trackedActions.map((ta) => {
                            const Icon =
                              ta.status === 'completed' ? CheckCircleIcon :
                              ta.status === 'error' ? XCircleIcon :
                              CircleIcon;
                            const iconColor =
                              ta.status === 'completed' ? 'text-green-500' :
                              ta.status === 'error' ? 'text-red-500' :
                              'text-muted-foreground';
                            return (
                              <div key={ta.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Icon className={cn('size-3.5 mt-0.5 shrink-0', iconColor)} />
                                <span>{ta.label}</span>
                              </div>
                            );
                          })}
                        </TaskContent>
                      </Task>
                    </MessageContent>
                  </Message>
                ) : null}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Suggestions (when empty and no pending input) */}
        {messages.length === 0 && !pendingCrawlInput ? <SuggestionBar /> : null}

        {/* Prompt input */}
        <div className="shrink-0 border-t p-2">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                className="min-h-12"
                placeholder={
                  pendingCrawlInput
                    ? `Enter ${requestedFieldLabels} to resume crawl…`
                    : 'Message AI…'
                }
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputSelect
                  disabled={isStreaming || !!pendingCrawlInput}
                  onValueChange={handleModelChange}
                  value={model}
                >
                  <PromptInputSelectTrigger className="max-w-32">
                    <ModelSelectorLogo
                      provider={provider === 'deepseek' ? 'deepseek' : 'openai'}
                    />
                    <PromptInputSelectValue />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {modelOptions.map((option) => (
                      <PromptInputSelectItem key={option} value={option}>
                        {option}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
              <PromptInputSubmit
                onStop={stop}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
          </div>
        </div>
      </aside>
  );
}

export function AIAssistantPane() {
  return (
    <PromptInputProvider>
      <AIAssistantPaneContent />
    </PromptInputProvider>
  );
}
