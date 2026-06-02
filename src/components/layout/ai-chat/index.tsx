import { Bot, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { AI_MODEL_OPTIONS_BY_PROVIDER } from '@/pages/settings/constants';
import type { DashboardChatMessage } from '@/components/layout/ai-chat/types';

const SUGGESTION_PROMPTS = [
  'Summarize the captured traffic',
  'Explain how HTTPS interception works',
  'Help me analyze this HAR data',
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

export function AIAssistantPane() {
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
  } = useDashboardPage();

  const providerDisplay = aiSettings.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI';
  const modelOptions = AI_MODEL_OPTIONS_BY_PROVIDER[aiSettings.provider] ?? [];

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
  };

  return (
    <PromptInputProvider>
      <aside className="absolute inset-2 z-40 flex min-h-0 flex-col overflow-hidden rounded-md border bg-background shadow-lg lg:static lg:z-auto lg:h-full lg:w-[clamp(320px,30vw,460px)] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:shadow-none">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b pr-3">
          <AgentHeader
            name={aiSettingsLoading ? 'Loading…' : providerDisplay}
            model={aiSettingsLoading ? undefined : model}
          />
          <Badge variant="outline" className="shrink-0 gap-1">
            <KeyRound className="h-3 w-3" />
            {aiSettings.hasApiKey ? providerDisplay : 'No key'}
          </Badge>
        </div>

        {/* Conversation */}
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<Bot className="size-8" />}
                title="AI Chat"
                description="Ask a question, draft notes, or work through an 0xbuffer task."
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

                {/* Loading shimmer while waiting for assistant response */}
                {status === 'submitted' ? (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Shimmer duration={1}>Generating response…</Shimmer>
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
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Suggestions (when empty) */}
        {messages.length === 0 ? <SuggestionBar /> : null}

        {/* Prompt input */}
        <div className="shrink-0 border-t p-2">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                className="min-h-12"
                placeholder="Message AI…"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputSelect
                  disabled={isStreaming}
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
      </aside>
    </PromptInputProvider>
  );
}
