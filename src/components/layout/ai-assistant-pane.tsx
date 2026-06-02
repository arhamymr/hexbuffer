import { DashboardComposer } from '@/pages/ai-chat/components/composer';
import { DashboardThread } from '@/pages/ai-chat/components/thread';
import { useDashboardPage } from '@/pages/ai-chat/hooks/use-dashboard-page';

export function AIAssistantPane() {
  const {
    aiSettings,
    aiSettingsLoading,
    handleSend,
    isStreaming,
    messages,
    model,
    prompt,
    setPrompt,
    stop,
    error,
  } = useDashboardPage();

  return (
    <aside className="absolute inset-2 z-40 flex min-h-0 flex-col overflow-hidden rounded-md border bg-background p-2 shadow-lg lg:static lg:z-auto lg:h-full lg:w-[clamp(320px,30vw,460px)] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:pl-2 lg:shadow-none">
      <DashboardThread
        error={error}
        messages={messages}
      />
      <DashboardComposer
        aiProvider={aiSettings.provider}
        aiSettingsLoading={aiSettingsLoading}
        hasApiKey={aiSettings.hasApiKey}
        isStreaming={isStreaming}
        model={model}
        onSend={handleSend}
        onStop={stop}
        prompt={prompt}
        setPrompt={setPrompt}
      />
    </aside>
  );
}
