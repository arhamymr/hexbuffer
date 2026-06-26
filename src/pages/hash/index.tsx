import { useHashPage } from './hooks/use-hash-page';
import { HashToolbar } from './components/hash-toolbar';
import { HashInputPanel } from './components/hash-input-panel';
import { HashOutputPanel } from './components/hash-output-panel';

export function HashPage() {
  const page = useHashPage();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <HashToolbar
        activeType={page.activeType}
        onTypeChange={page.setActiveType}
        output={page.output}
        isEmpty={page.isEmpty}
        onCopy={page.handleCopy}
        onClear={page.handleClear}
      />

      <main className="min-h-0 flex-1 flex flex-col">
        <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
          <HashInputPanel
            input={page.input}
            isEmpty={page.isEmpty}
            onInputChange={page.setInput}
            onClear={page.handleClear}
          />

          <HashOutputPanel
            output={page.output}
            onCopy={page.handleCopy}
          />
        </section>
      </main>
    </div>
  );
}
