import { Bot, CheckCircleIcon, ChevronDownIcon, CircleIcon, Loader2Icon, PanelLeftClose, PanelLeftOpen, ShieldAlert, Triangle, X, XCircleIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from '@/components/ai-elements/prompt-input';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import {
  Task,
  TaskTrigger,
  TaskContent,
} from '@/components/ai-elements/task';
import { ChatSessionList } from './components/chat-session-list';
import { HumanSelectionCard } from './components/human-selection-card';
import { IntentClarificationCard } from './components/intent-clarification-card';
import { SuggestionBar } from './components/suggestion-bar';
import { useAiChatPane } from './hooks/use-ai-chat-pane';
import { getMessageText, getReasoningParts, hasContent, providerLabel } from './lib/message-utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { TriangleLogo } from '@/layout/triangle-logo';

function AIAssistantPaneContent({ onClose }: { onClose?: () => void }) {
  const {
    aiSettings,
    aiSettingsLoading,
    error,
    handleSubmit,
    handleModelChange,
    isStreaming,
    messages,
    model,
    modelOptions,
    provider,
    providerDisplay,
    status,
    stop,
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    deleteSession,
    sidebarCollapsed,
    setSidebarCollapsed,
    trackedActions,
    pendingCrawlInput,
    dismissCrawlInput,
    pendingSelection,
    dismissSelection,
    submitSelection,
    pendingClarification,
    dismissClarification,
    submitClarification,
    requestedFieldLabels,
  } = useAiChatPane();

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
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title="Close assistant"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Body: session list + conversation */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Session sidebar */}
        {!sidebarCollapsed && (
          <div className="w-70 shrink-0">
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
            <ConversationContent className="flex-1 h-full max-w-xl mx-auto">
              {messages.length === 0 && !pendingCrawlInput ? (
                <div className='flex-1'>
                  <ConversationEmptyState
                    icon={<TriangleLogo size='large' />}
                    title="AI Assistant"
                    description="Analyze traffic, extract URL data, write findings, and manage your recon scope."
                  />
                </div>

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
                            <MessageResponse className='text-sm' isAnimating={isStreaming && message.role === 'assistant'}>
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

                  {/* Human selection card */}
                  {pendingSelection ? (
                    <Message from="assistant">
                      <MessageContent>
                        <HumanSelectionCard
                          request={pendingSelection}
                          onSubmit={submitSelection}
                          onDismiss={dismissSelection}
                        />
                      </MessageContent>
                    </Message>
                  ) : null}

                  {/* Intent clarification card */}
                  {pendingClarification ? (
                    <Message from="assistant">
                      <MessageContent>
                        <IntentClarificationCard
                          request={pendingClarification}
                          onSubmit={submitClarification}
                          onDismiss={dismissClarification}
                        />
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
                            <Shimmer duration={1}>Thinking…</Shimmer>
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

                  {/* Completed task summary */}
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
          <div className="shrink-0 border-t p-2 bg-muted">
            <PromptInput onSubmit={handleSubmit} className='bg-background overflow-hidden max-w-xl mx-auto '>
              <PromptInputBody>
                <PromptInputTextarea
                  className="min-h-12"
                  placeholder={
                    pendingCrawlInput
                      ? `Enter ${requestedFieldLabels} to resume crawl…`
                      : pendingSelection
                        ? 'Select an option above or type a message…'
                        : pendingClarification
                          ? 'Select a task above to clarify your intent…'
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
                    <PromptInputSelectTrigger className="border border-border">
                      <ModelSelectorLogo provider="deepseek" className='size-4' />
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

export function AIAssistantPane({ onClose }: { onClose?: () => void }) {
  return (
    <PromptInputProvider>
      <AIAssistantPaneContent onClose={onClose} />
    </PromptInputProvider>
  );
}

export function AssistantPage() {
  return (
    <div className="h-full overflow-hidden">
      <AIAssistantPane />
    </div>
  );
}
