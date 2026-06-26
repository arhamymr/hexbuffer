import { useEncoderPage } from './hooks/use-encoder-page';
import { EncoderToolbar } from './components/encoder-toolbar';
import { EncoderInputPanel } from './components/encoder-input-panel';
import { EncoderOutputPanel } from './components/encoder-output-panel';

export function EncoderPage() {
  const page = useEncoderPage();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <EncoderToolbar
        activeType={page.activeType}
        onTypeChange={page.setActiveType}
        mode={page.mode}
        onModeChange={page.setMode}
        currentMode={page.currentMode}
        output={page.output}
        isEmpty={page.isEmpty}
        onSwap={page.handleSwap}
        onCopy={page.handleCopy}
        onClear={page.handleClear}
      />

      <main className="min-h-0 flex-1 flex flex-col">
        <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
          <EncoderInputPanel
            headerLabel={page.currentMode.source}
            input={page.input}
            mode={page.mode}
            isEmpty={page.isEmpty}
            onInputChange={page.setInput}
            onClear={page.handleClear}
          />

          <EncoderOutputPanel
            headerLabel={page.currentMode.target}
            output={page.output}
            error={page.error}
            onCopy={page.handleCopy}
          />
        </section>
      </main>
    </div>
  );
}
